-- Edit manually added fixtures (not DDSFL-synced)

CREATE OR REPLACE FUNCTION public.admin_update_fixture(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_match_date timestamptz,
  p_opponent text,
  p_home_away text,
  p_competition text,
  p_venue text,
  p_kickoff_time time
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target public.fixtures%ROWTYPE;
  row public.fixtures%ROWTYPE;
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
    RAISE EXCEPTION 'Cannot edit DDSFL-synced fixtures';
  END IF;

  IF p_home_away NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'home_away must be home or away';
  END IF;

  UPDATE public.fixtures
  SET
    match_date = p_match_date,
    opponent = trim(p_opponent),
    home_away = p_home_away,
    competition = trim(p_competition),
    venue = NULLIF(trim(p_venue), ''),
    kickoff_time = p_kickoff_time
  WHERE id = p_fixture_id
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_fixture TO anon, authenticated;
