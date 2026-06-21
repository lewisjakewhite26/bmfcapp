-- Delete fines sessions (committee/admin). Entries cascade via FK.

CREATE OR REPLACE FUNCTION public.admin_delete_fine_session(
  p_admin_id uuid,
  p_session_token text,
  p_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_fines_admin(p_admin_id, p_session_token);

  DELETE FROM public.fine_sessions WHERE id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fines session not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_fine_session(uuid, text, uuid) TO anon, authenticated;
