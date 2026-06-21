-- Auto-generate fines event title from date when none is provided.

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
  v_date date;
  row public.fine_sessions%ROWTYPE;
BEGIN
  actor := public.assert_fines_admin(p_admin_id, p_session_token);

  v_date := COALESCE(p_session_date, CURRENT_DATE);
  v_title := nullif(trim(p_title), '');

  IF v_title IS NULL THEN
    v_title := to_char(v_date, 'Dy DD Mon YYYY');
  END IF;

  INSERT INTO public.fine_sessions (session_date, title, notes, logged_by)
  VALUES (v_date, v_title, nullif(trim(p_notes), ''), actor.id)
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
