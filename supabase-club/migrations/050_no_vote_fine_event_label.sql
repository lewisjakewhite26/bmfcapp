-- No-vote fine entries said just "No vote" with no way to tell which fixture
-- or training it was for without cross-referencing the session date. The
-- push notification already includes the event (fines-scheduler/index.ts),
-- so carry the same context into the stored fine_entries.label.
--
-- fine_key stays 'no_vote' -- only the display label changes, so existing
-- filtering/toggle/mutual-exclusivity logic elsewhere is unaffected.
-- Label uses parentheses, not an em dash, per docs/COPY-RULES.md.

CREATE OR REPLACE FUNCTION public.apply_no_vote_fines()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_event record;
  v_session_id uuid;
  v_fined int;
  v_batch jsonb;
  v_fined_rows jsonb := '[]'::jsonb;
BEGIN
  SELECT id INTO v_actor
  FROM public.profiles
  WHERE is_admin OR is_committee
  ORDER BY is_admin DESC, created_at ASC
  LIMIT 1;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No admin profile found for no-vote fines';
  END IF;

  FOR v_event IN
  WITH votable_events AS (
    SELECT
      'fixture'::text AS event_type,
      f.id AS event_id,
      public.fixture_start_time(f.match_date, f.kickoff_time) AS start_time,
      (f.match_date AT TIME ZONE 'Europe/London')::date AS session_date,
      format('vs %s', f.opponent) AS event_label
    FROM public.fixtures f
    WHERE f.status IN ('scheduled', 'completed', 'in_progress')
      AND f.kickoff_time IS NOT NULL

    UNION ALL

    SELECT
      'training'::text,
      t.id,
      t.session_date,
      (t.session_date AT TIME ZONE 'Europe/London')::date,
      COALESCE('Training at ' || nullif(trim(t.location), ''), 'Training')
    FROM public.training_sessions t
  )
  SELECT *
  FROM votable_events ve
  WHERE ve.start_time <= now()
    AND ve.start_time >= now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1
      FROM public.fine_no_vote_runs r
      WHERE r.event_type = ve.event_type
        AND r.event_id = ve.event_id
    )
  LOOP
    v_session_id := public.fine_ensure_session_for_date(v_event.session_date, v_actor);

    INSERT INTO public.fine_entries (
      session_id,
      profile_id,
      fine_key,
      label,
      amount,
      logged_by
    )
    SELECT
      v_session_id,
      sq.player_id,
      'no_vote',
      format('No vote (%s)', v_event.event_label),
      1,
      v_actor
    FROM public.squad sq
    WHERE sq.active = true
      AND NOT public.squad_is_paused(sq.player_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.availability a
        WHERE a.player_id = sq.player_id
          AND (
            (v_event.event_type = 'fixture' AND a.fixture_id = v_event.event_id)
            OR (v_event.event_type = 'training' AND a.training_id = v_event.event_id)
          )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.fine_entries fe
        WHERE fe.session_id = v_session_id
          AND fe.profile_id = sq.player_id
          AND fe.fine_key = 'no_vote'
      )
    ON CONFLICT (session_id, profile_id, fine_key) DO NOTHING;

    GET DIAGNOSTICS v_fined = ROW_COUNT;

    INSERT INTO public.fine_no_vote_runs (event_type, event_id, players_fined)
    VALUES (v_event.event_type, v_event.event_id, v_fined);

    IF v_fined > 0 THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'profile_id', sub.profile_id,
        'total_owed', sub.total_owed,
        'event_label', v_event.event_label
      )), '[]'::jsonb)
      INTO v_batch
      FROM (
        SELECT
          fe.profile_id,
          (
            SELECT COALESCE(SUM(x.amount), 0)::numeric
            FROM public.fine_entries x
            WHERE x.profile_id = fe.profile_id
              AND NOT x.paid
          ) AS total_owed
        FROM public.fine_entries fe
        WHERE fe.session_id = v_session_id
          AND fe.fine_key = 'no_vote'
          AND fe.created_at >= now() - interval '1 minute'
        GROUP BY fe.profile_id
      ) sub;

      v_fined_rows := v_fined_rows || v_batch;
    END IF;
  END LOOP;

  RETURN json_build_object('fined', COALESCE(v_fined_rows, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_no_vote_fines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_no_vote_fines() TO service_role;
