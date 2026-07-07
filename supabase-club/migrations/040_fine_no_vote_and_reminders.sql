-- Automated no-vote fines and vote reminder tracking (26/27 fines rework).

CREATE TABLE public.fine_no_vote_runs (
  event_type text NOT NULL CHECK (event_type IN ('fixture', 'training')),
  event_id uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  players_fined int NOT NULL DEFAULT 0 CHECK (players_fined >= 0),
  PRIMARY KEY (event_type, event_id)
);

ALTER TABLE public.fine_no_vote_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct fine_no_vote_runs access"
  ON public.fine_no_vote_runs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TABLE public.fine_vote_reminder_runs (
  event_type text NOT NULL CHECK (event_type IN ('fixture', 'training')),
  event_id uuid NOT NULL,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('48h', '24h')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_type, event_id, reminder_kind)
);

ALTER TABLE public.fine_vote_reminder_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct fine_vote_reminder_runs access"
  ON public.fine_vote_reminder_runs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.fixture_start_time(
  p_match_date timestamptz,
  p_kickoff_time time
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_kickoff_time IS NOT NULL THEN
      ((p_match_date AT TIME ZONE 'Europe/London')::date + p_kickoff_time) AT TIME ZONE 'Europe/London'
    ELSE p_match_date
  END;
$$;

CREATE OR REPLACE FUNCTION public.fine_ensure_session_for_date(
  p_session_date date,
  p_actor uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_title text;
BEGIN
  v_title := to_char(p_session_date, 'Dy DD Mon YYYY');

  SELECT id INTO v_session_id
  FROM public.fine_sessions
  WHERE session_date = p_session_date
    AND title = v_title
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;

  INSERT INTO public.fine_sessions (session_date, title, notes, logged_by)
  VALUES (p_session_date, v_title, 'Auto-generated fines session', p_actor)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

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
      'No vote',
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

CREATE OR REPLACE FUNCTION public.apply_vote_reminders()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_kind text;
  v_reminders jsonb := '[]'::jsonb;
  v_player_id uuid;
BEGIN
  -- Record elapsed reminders for events that already started (no push).
  INSERT INTO public.fine_vote_reminder_runs (event_type, event_id, reminder_kind)
  SELECT ve.event_type, ve.event_id, k.kind
  FROM (
    SELECT
      'fixture'::text AS event_type,
      f.id AS event_id,
      public.fixture_start_time(f.match_date, f.kickoff_time) AS start_time
    FROM public.fixtures f
    WHERE f.status IN ('scheduled', 'completed', 'in_progress')

    UNION ALL

    SELECT
      'training'::text,
      t.id,
      t.session_date
    FROM public.training_sessions t
  ) ve
  CROSS JOIN (VALUES ('48h'), ('24h')) AS k(kind)
  WHERE ve.start_time <= now()
  ON CONFLICT DO NOTHING;

  FOR v_kind IN
    SELECT k FROM unnest(ARRAY['48h'::text, '24h'::text]) AS t(k)
  LOOP
    FOR v_event IN
    WITH votable_events AS (
      SELECT
        'fixture'::text AS event_type,
        f.id AS event_id,
        public.fixture_start_time(f.match_date, f.kickoff_time) AS start_time,
        format('vs %s', f.opponent) AS event_label
      FROM public.fixtures f
      WHERE f.status IN ('scheduled', 'completed', 'in_progress')

      UNION ALL

      SELECT
        'training'::text,
        t.id,
        t.session_date,
        COALESCE('Training at ' || nullif(trim(t.location), ''), 'Training')
      FROM public.training_sessions t
    )
    SELECT *
    FROM votable_events ve
    WHERE ve.start_time > now()
      AND (
        (v_kind = '48h' AND ve.start_time - interval '48 hours' <= now())
        OR (v_kind = '24h' AND ve.start_time - interval '24 hours' <= now())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.fine_vote_reminder_runs r
        WHERE r.event_type = ve.event_type
          AND r.event_id = ve.event_id
          AND r.reminder_kind = v_kind
      )
    LOOP
      FOR v_player_id IN
        SELECT sq.player_id
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
      LOOP
        v_reminders := v_reminders || jsonb_build_object(
          'profile_id', v_player_id,
          'event_label', v_event.event_label,
          'when', to_char(v_event.start_time AT TIME ZONE 'Europe/London', 'Dy DD Mon HH24:MI'),
          'reminder_kind', v_kind,
          'event_type', v_event.event_type,
          'event_id', v_event.event_id
        );
      END LOOP;

      INSERT INTO public.fine_vote_reminder_runs (event_type, event_id, reminder_kind)
      VALUES (v_event.event_type, v_event.event_id, v_kind)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RETURN json_build_object('reminders', COALESCE(v_reminders, '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.apply_no_vote_fines() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_vote_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_no_vote_fines() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_vote_reminders() TO service_role;

-- Seed past events so deploy never retro-fines or sends elapsed reminders.
INSERT INTO public.fine_no_vote_runs (event_type, event_id, players_fined)
SELECT ve.event_type, ve.event_id, 0
FROM (
  SELECT 'fixture'::text AS event_type, f.id AS event_id
  FROM public.fixtures f
  WHERE public.fixture_start_time(f.match_date, f.kickoff_time) <= now()

  UNION ALL

  SELECT 'training'::text, t.id
  FROM public.training_sessions t
  WHERE t.session_date <= now()
) ve
ON CONFLICT DO NOTHING;

INSERT INTO public.fine_vote_reminder_runs (event_type, event_id, reminder_kind)
SELECT ve.event_type, ve.event_id, k.kind
FROM (
  SELECT
    'fixture'::text AS event_type,
    f.id AS event_id,
    public.fixture_start_time(f.match_date, f.kickoff_time) AS start_time
  FROM public.fixtures f

  UNION ALL

  SELECT
    'training'::text,
    t.id,
    t.session_date
  FROM public.training_sessions t
) ve
CROSS JOIN (VALUES ('48h'), ('24h')) AS k(kind)
WHERE ve.start_time <= now()
   OR (k.kind = '48h' AND ve.start_time - interval '48 hours' <= now())
   OR (k.kind = '24h' AND ve.start_time - interval '24 hours' <= now())
ON CONFLICT DO NOTHING;
