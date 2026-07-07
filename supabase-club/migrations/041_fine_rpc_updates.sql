-- Fines RPC updates: due_date on reads, late/late_10 exclusivity, squad pause in detail.

CREATE OR REPLACE FUNCTION public.fine_entry_to_json(
  e public.fine_entries,
  p_display_name text,
  p_session_date date,
  p_session_title text,
  p_marked_by_name text DEFAULT NULL
)
RETURNS json
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT json_build_object(
    'id', e.id,
    'session_id', e.session_id,
    'profile_id', e.profile_id,
    'display_name', p_display_name,
    'fine_key', e.fine_key,
    'label', e.label,
    'amount', e.amount,
    'paid', e.paid,
    'marked_at', e.marked_at,
    'marked_by_name', p_marked_by_name,
    'session_date', p_session_date,
    'session_title', p_session_title,
    'created_at', e.created_at,
    'due_date', e.due_date
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_fine_entry(
  p_admin_id uuid,
  p_session_token text,
  p_session_id uuid,
  p_profile_id uuid,
  p_fine_key text,
  p_label text,
  p_amount numeric,
  p_enabled boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  sess public.fine_sessions%ROWTYPE;
  v_key text;
  v_label text;
  row public.fine_entries%ROWTYPE;
BEGIN
  actor := public.assert_fines_admin(p_admin_id, p_session_token);

  SELECT * INTO sess FROM public.fine_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fines session not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.squad sq WHERE sq.player_id = p_profile_id AND sq.active = true
  ) THEN
    RAISE EXCEPTION 'Invalid squad member';
  END IF;

  v_key := nullif(trim(p_fine_key), '');
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Fine key is required';
  END IF;

  IF p_enabled THEN
    v_label := nullif(trim(p_label), '');
    IF v_label IS NULL THEN
      RAISE EXCEPTION 'Label is required';
    END IF;
    IF p_amount IS NULL OR p_amount < 0 THEN
      RAISE EXCEPTION 'Invalid amount';
    END IF;

    IF v_key IN ('late', 'late_10') THEN
      DELETE FROM public.fine_entries
      WHERE session_id = p_session_id
        AND profile_id = p_profile_id
        AND fine_key IN ('late', 'late_10')
        AND fine_key <> v_key;
    END IF;

    INSERT INTO public.fine_entries (
      session_id, profile_id, fine_key, label, amount, logged_by
    )
    VALUES (p_session_id, p_profile_id, v_key, v_label, p_amount, actor.id)
    ON CONFLICT (session_id, profile_id, fine_key)
    DO UPDATE SET label = EXCLUDED.label, amount = EXCLUDED.amount
    RETURNING * INTO row;
  ELSE
    DELETE FROM public.fine_entries
    WHERE session_id = p_session_id
      AND profile_id = p_profile_id
      AND fine_key = v_key
    RETURNING * INTO row;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN (
    SELECT public.fine_entry_to_json(
      e,
      p.display_name,
      sess.session_date,
      sess.title,
      mp.display_name
    )
    FROM public.fine_entries e
    JOIN public.profiles p ON p.id = e.profile_id
    LEFT JOIN public.profiles mp ON mp.id = e.marked_by
    WHERE e.id = row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_fine_session_detail(
  p_admin_id uuid,
  p_session_token text,
  p_session_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess public.fine_sessions%ROWTYPE;
BEGIN
  PERFORM public.assert_fines_admin(p_admin_id, p_session_token);

  SELECT * INTO sess FROM public.fine_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fines session not found';
  END IF;

  RETURN json_build_object(
    'session', (
      SELECT json_build_object(
        'id', s.id,
        'session_date', s.session_date,
        'title', s.title,
        'notes', s.notes,
        'created_at', s.created_at,
        'entry_count', (SELECT COUNT(*)::int FROM public.fine_entries e WHERE e.session_id = s.id),
        'session_total', COALESCE((SELECT SUM(amount) FROM public.fine_entries e WHERE e.session_id = s.id), 0),
        'unpaid_total', COALESCE((SELECT SUM(amount) FROM public.fine_entries e WHERE e.session_id = s.id AND NOT e.paid), 0)
      )
      FROM public.fine_sessions s WHERE s.id = p_session_id
    ),
    'entries', COALESCE(
      (
        SELECT json_agg(
          public.fine_entry_to_json(e, p.display_name, sess.session_date, sess.title, mp.display_name)
          ORDER BY p.display_name, e.label
        )
        FROM public.fine_entries e
        JOIN public.profiles p ON p.id = e.profile_id
        LEFT JOIN public.profiles mp ON mp.id = e.marked_by
        WHERE e.session_id = p_session_id
      ),
      '[]'::json
    ),
    'squad', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'profile_id', sq.player_id,
            'display_name', pr.display_name,
            'paused', sq.paused,
            'paused_reason', sq.paused_reason
          )
          ORDER BY pr.display_name
        )
        FROM public.squad sq
        JOIN public.profiles pr ON pr.id = sq.player_id
        WHERE sq.active = true
      ),
      '[]'::json
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_fine_entries(
  p_admin_id uuid,
  p_session_token text,
  p_filter text DEFAULT 'unpaid'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filter text;
BEGIN
  PERFORM public.assert_fines_admin(p_admin_id, p_session_token);

  v_filter := lower(coalesce(nullif(trim(p_filter), ''), 'unpaid'));
  IF v_filter NOT IN ('all', 'unpaid', 'paid') THEN
    v_filter := 'unpaid';
  END IF;

  RETURN json_build_object(
    'total_outstanding', COALESCE(
      (SELECT SUM(amount) FROM public.fine_entries WHERE NOT paid),
      0
    ),
    'players_owing', COALESCE(
      (SELECT COUNT(DISTINCT profile_id) FROM public.fine_entries WHERE NOT paid),
      0
    ),
    'entries', COALESCE(
      (
        SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
        FROM (
          SELECT
            e.id,
            e.session_id,
            e.profile_id,
            p.display_name,
            e.fine_key,
            e.label,
            e.amount,
            e.paid,
            e.marked_at,
            mp.display_name AS marked_by_name,
            s.session_date,
            s.title AS session_title,
            e.created_at,
            e.due_date
          FROM public.fine_entries e
          JOIN public.profiles p ON p.id = e.profile_id
          JOIN public.fine_sessions s ON s.id = e.session_id
          LEFT JOIN public.profiles mp ON mp.id = e.marked_by
          WHERE
            v_filter = 'all'
            OR (v_filter = 'unpaid' AND NOT e.paid)
            OR (v_filter = 'paid' AND e.paid)
        ) t
      ),
      '[]'::json
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_fine_paid(
  p_admin_id uuid,
  p_session_token text,
  p_entry_id uuid,
  p_paid boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  row public.fine_entries%ROWTYPE;
  sess public.fine_sessions%ROWTYPE;
BEGIN
  actor := public.assert_fines_admin(p_admin_id, p_session_token);

  SELECT * INTO row FROM public.fine_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fine not found';
  END IF;

  SELECT * INTO sess FROM public.fine_sessions WHERE id = row.session_id;

  UPDATE public.fine_entries
  SET
    paid = p_paid,
    marked_by = CASE WHEN p_paid THEN actor.id ELSE NULL END,
    marked_at = CASE WHEN p_paid THEN now() ELSE NULL END
  WHERE id = p_entry_id
  RETURNING * INTO row;

  RETURN public.fine_entry_to_json(
    row,
    (SELECT display_name FROM public.profiles WHERE id = row.profile_id),
    sess.session_date,
    sess.title,
    CASE WHEN p_paid THEN actor.display_name ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_outstanding_fines_summary(
  p_user_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_approved_player(p_user_id, p_session_token);

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.outstanding_total DESC, t.display_name)
      FROM (
        SELECT
          e.profile_id,
          p.display_name,
          SUM(e.amount)::numeric AS outstanding_total,
          COUNT(*)::int AS unpaid_count,
          MIN(e.due_date) AS earliest_due_date,
          BOOL_OR(e.due_date < CURRENT_DATE) AS is_overdue,
          (
            SELECT COALESCE(json_agg(
              public.fine_entry_to_json(
                fe,
                p.display_name,
                fs.session_date,
                fs.title,
                mp.display_name
              )
              ORDER BY fe.created_at DESC
            ), '[]'::json)
            FROM public.fine_entries fe
            JOIN public.fine_sessions fs ON fs.id = fe.session_id
            LEFT JOIN public.profiles mp ON mp.id = fe.marked_by
            WHERE fe.profile_id = e.profile_id AND NOT fe.paid
          ) AS entries
        FROM public.fine_entries e
        JOIN public.profiles p ON p.id = e.profile_id
        WHERE NOT e.paid
        GROUP BY e.profile_id, p.display_name
      ) t
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_unpaid_fines(
  p_user_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_approved_player(p_user_id, p_session_token);

  RETURN COALESCE(
    (
      SELECT json_agg(
        public.fine_entry_to_json(
          e,
          p.display_name,
          s.session_date,
          s.title,
          mp.display_name
        )
        ORDER BY e.due_date ASC, e.created_at DESC
      )
      FROM public.fine_entries e
      JOIN public.profiles p ON p.id = e.profile_id
      JOIN public.fine_sessions s ON s.id = e.session_id
      LEFT JOIN public.profiles mp ON mp.id = e.marked_by
      WHERE e.profile_id = p_user_id AND NOT e.paid
    ),
    '[]'::json
  );
END;
$$;

-- Fix no-vote fined row aggregation across multiple events in one run.
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

REVOKE ALL ON FUNCTION public.apply_no_vote_fines() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_no_vote_fines() TO service_role;
