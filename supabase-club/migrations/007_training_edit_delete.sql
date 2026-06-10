-- Edit and delete training sessions (committee/admin)

CREATE OR REPLACE FUNCTION public.admin_update_training_session(
  p_admin_id uuid,
  p_session_token text,
  p_training_id uuid,
  p_session_date timestamptz,
  p_location text,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.training_sessions%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.training_sessions
  SET
    session_date = p_session_date,
    location = NULLIF(trim(p_location), ''),
    notes = NULLIF(trim(p_notes), '')
  WHERE id = p_training_id
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training session not found';
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_training_session(
  p_admin_id uuid,
  p_session_token text,
  p_training_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.training_sessions WHERE id = p_training_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Training session not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_training_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_training_session TO anon, authenticated;
