-- Admin tools: roles, passcode reset, squad, fixtures, push auth helper

-- Recreate invite with optional squad position
CREATE OR REPLACE FUNCTION public.admin_create_invite(
  p_admin_id uuid,
  p_session_token text,
  p_display_name text,
  p_position text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_display_name text;
  v_username text;
  v_token text;
  new_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_display_name := trim(p_display_name);
  IF v_display_name = '' OR length(v_display_name) > 40 THEN
    RAISE EXCEPTION 'Name must be 1–40 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(v_display_name)
  ) THEN
    RAISE EXCEPTION 'That name is already registered';
  END IF;

  v_username := public.slug_username(v_display_name);
  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.profiles (
    username, display_name, passcode_hash, invite_token, invite_expires_at, is_approved
  )
  VALUES (
    v_username,
    v_display_name,
    NULL,
    v_token,
    now() + interval '14 days',
    true
  )
  RETURNING * INTO new_user;

  IF p_position IS NOT NULL AND trim(p_position) != '' THEN
    INSERT INTO public.squad (player_id, position, joined_date, active)
    VALUES (new_user.id, trim(p_position), CURRENT_DATE, true);
  END IF;

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'display_name', new_user.display_name,
    'invite_token', v_token,
    'invite_expires_at', new_user.invite_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_profiles(p_admin_id uuid, p_session_token text)
RETURNS json
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

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'is_admin', p.is_admin,
      'is_committee', p.is_committee,
      'is_approved', p.is_approved,
      'created_at', p.created_at,
      'invite_pending', p.invite_token IS NOT NULL,
      'invite_expires_at', p.invite_expires_at,
      'in_squad', sq.id IS NOT NULL,
      'squad_position', sq.position
    ) ORDER BY p.created_at)
    FROM public.profiles p
    LEFT JOIN public.squad sq ON sq.player_id = p.id AND sq.active = true
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_roles(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid,
  p_is_committee boolean
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

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_target_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot change your own role here';
  END IF;

  UPDATE public.profiles
  SET is_committee = p_is_committee
  WHERE id = p_target_id AND is_admin = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_passcode(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid,
  p_new_passcode text
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

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_new_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  UPDATE public.profiles
  SET
    passcode_hash = crypt(p_new_passcode, gen_salt('bf')),
    session_token = NULL,
    invite_token = NULL,
    invite_expires_at = NULL
  WHERE id = p_target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_squad(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_position text,
  p_joined_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.squad%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  INSERT INTO public.squad (player_id, position, joined_date, active)
  VALUES (p_player_id, NULLIF(trim(p_position), ''), COALESCE(p_joined_date, CURRENT_DATE), true)
  ON CONFLICT (player_id)
  DO UPDATE SET
    position = EXCLUDED.position,
    joined_date = COALESCE(EXCLUDED.joined_date, squad.joined_date),
    active = true
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_squad(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid
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

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.squad SET active = false WHERE player_id = p_player_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_fixture(
  p_admin_id uuid,
  p_session_token text,
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
  row public.fixtures%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_home_away NOT IN ('home', 'away') THEN
    RAISE EXCEPTION 'home_away must be home or away';
  END IF;

  INSERT INTO public.fixtures (
    match_date, opponent, home_away, competition, venue, kickoff_time, status
  )
  VALUES (
    p_match_date,
    trim(p_opponent),
    p_home_away,
    trim(p_competition),
    NULLIF(trim(p_venue), ''),
    p_kickoff_time,
    'scheduled'
  )
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_session(
  p_user_id uuid,
  p_session_token text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND session_token = p_session_token
      AND (is_admin = true OR is_committee = true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_roles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_passcode TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_squad TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_squad TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_fixture TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_session TO anon, authenticated;
