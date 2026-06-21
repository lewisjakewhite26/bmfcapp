-- Match-day fines: sessions, per-player fine entries, payment tracking

CREATE TABLE public.fine_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  notes text,
  logged_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fine_sessions_date ON public.fine_sessions(session_date DESC);

CREATE TABLE public.fine_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.fine_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fine_key text NOT NULL,
  label text NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  paid boolean NOT NULL DEFAULT false,
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at timestamptz,
  logged_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, profile_id, fine_key)
);

CREATE INDEX idx_fine_entries_session ON public.fine_entries(session_id);
CREATE INDEX idx_fine_entries_profile ON public.fine_entries(profile_id);
CREATE INDEX idx_fine_entries_paid ON public.fine_entries(paid);

ALTER TABLE public.fine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fine_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct fine_sessions read" ON public.fine_sessions FOR SELECT USING (false);
CREATE POLICY "No direct fine_sessions write" ON public.fine_sessions FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct fine_sessions update" ON public.fine_sessions FOR UPDATE USING (false);
CREATE POLICY "No direct fine_sessions delete" ON public.fine_sessions FOR DELETE USING (false);

CREATE POLICY "No direct fine_entries read" ON public.fine_entries FOR SELECT USING (false);
CREATE POLICY "No direct fine_entries write" ON public.fine_entries FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct fine_entries update" ON public.fine_entries FOR UPDATE USING (false);
CREATE POLICY "No direct fine_entries delete" ON public.fine_entries FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.assert_fines_admin(
  p_user_id uuid,
  p_session_token text
)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO actor
  FROM public.profiles
  WHERE id = p_user_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (actor.is_admin OR actor.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_approved_player(
  p_user_id uuid,
  p_session_token text
)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO actor
  FROM public.profiles
  WHERE id = p_user_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT actor.is_approved THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_fine_sessions(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_fines_admin(p_admin_id, p_session_token);

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.session_date DESC, t.created_at DESC)
      FROM (
        SELECT
          s.id,
          s.session_date,
          s.title,
          s.notes,
          s.created_at,
          COUNT(e.id)::int AS entry_count,
          COALESCE(SUM(e.amount), 0)::numeric AS session_total,
          COALESCE(SUM(e.amount) FILTER (WHERE NOT e.paid), 0)::numeric AS unpaid_total
        FROM public.fine_sessions s
        LEFT JOIN public.fine_entries e ON e.session_id = s.id
        GROUP BY s.id
      ) t
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_fine_session(
  p_admin_id uuid,
  p_session_token text,
  p_session_date date,
  p_title text,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_title text;
  row public.fine_sessions%ROWTYPE;
BEGIN
  actor := public.assert_fines_admin(p_admin_id, p_session_token);

  v_title := nullif(trim(p_title), '');
  IF v_title IS NULL OR length(v_title) < 2 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  INSERT INTO public.fine_sessions (session_date, title, notes, logged_by)
  VALUES (COALESCE(p_session_date, CURRENT_DATE), v_title, nullif(trim(p_notes), ''), actor.id)
  RETURNING * INTO row;

  RETURN json_build_object(
    'id', row.id,
    'session_date', row.session_date,
    'title', row.title,
    'notes', row.notes,
    'created_at', row.created_at,
    'entry_count', 0,
    'session_total', 0,
    'unpaid_total', 0
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
          json_build_object(
            'id', e.id,
            'session_id', e.session_id,
            'profile_id', e.profile_id,
            'display_name', p.display_name,
            'fine_key', e.fine_key,
            'label', e.label,
            'amount', e.amount,
            'paid', e.paid,
            'marked_at', e.marked_at,
            'marked_by_name', mp.display_name,
            'session_date', sess.session_date,
            'session_title', sess.title,
            'created_at', e.created_at
          )
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
            'display_name', pr.display_name
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
    SELECT json_build_object(
      'id', e.id,
      'session_id', e.session_id,
      'profile_id', e.profile_id,
      'display_name', p.display_name,
      'fine_key', e.fine_key,
      'label', e.label,
      'amount', e.amount,
      'paid', e.paid,
      'marked_at', e.marked_at,
      'marked_by_name', mp.display_name,
      'session_date', sess.session_date,
      'session_title', sess.title,
      'created_at', e.created_at
    )
    FROM public.fine_entries e
    JOIN public.profiles p ON p.id = e.profile_id
    LEFT JOIN public.profiles mp ON mp.id = e.marked_by
    WHERE e.id = row.id
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
            e.created_at
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

  RETURN json_build_object(
    'id', row.id,
    'session_id', row.session_id,
    'profile_id', row.profile_id,
    'display_name', (SELECT display_name FROM public.profiles WHERE id = row.profile_id),
    'fine_key', row.fine_key,
    'label', row.label,
    'amount', row.amount,
    'paid', row.paid,
    'marked_at', row.marked_at,
    'marked_by_name', CASE WHEN p_paid THEN actor.display_name ELSE NULL END,
    'session_date', sess.session_date,
    'session_title', sess.title,
    'created_at', row.created_at
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
          GREATEST(
            0,
            FLOOR(EXTRACT(EPOCH FROM (now() - MIN(e.created_at))) / 86400)
          )::int AS oldest_unpaid_days,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', fe.id,
                'session_id', fe.session_id,
                'profile_id', fe.profile_id,
                'display_name', p.display_name,
                'fine_key', fe.fine_key,
                'label', fe.label,
                'amount', fe.amount,
                'paid', fe.paid,
                'marked_at', fe.marked_at,
                'marked_by_name', mp.display_name,
                'session_date', fs.session_date,
                'session_title', fs.title,
                'created_at', fe.created_at
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
        json_build_object(
          'id', e.id,
          'session_id', e.session_id,
          'profile_id', e.profile_id,
          'display_name', p.display_name,
          'fine_key', e.fine_key,
          'label', e.label,
          'amount', e.amount,
          'paid', e.paid,
          'marked_at', e.marked_at,
          'marked_by_name', mp.display_name,
          'session_date', s.session_date,
          'session_title', s.title,
          'created_at', e.created_at
        )
        ORDER BY e.created_at DESC
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

GRANT EXECUTE ON FUNCTION public.assert_fines_admin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_approved_player(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_fine_sessions(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_fine_session(uuid, text, date, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_fine_session_detail(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_fine_entry(uuid, text, uuid, uuid, text, text, numeric, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_fine_entries(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_fine_paid(uuid, text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_outstanding_fines_summary(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_unpaid_fines(uuid, text) TO anon, authenticated;
