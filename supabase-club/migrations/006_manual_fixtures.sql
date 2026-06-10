-- Delete manually added fixtures (DDSFL-synced rows are protected)

CREATE OR REPLACE FUNCTION public.admin_delete_fixture(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target public.fixtures%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO target FROM public.fixtures WHERE id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF target.ddsfl_fixture_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot delete DDSFL-synced fixtures — only manually added matches can be removed';
  END IF;

  DELETE FROM public.fixtures WHERE id = p_fixture_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_fixture TO anon, authenticated;
