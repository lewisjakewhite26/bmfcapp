-- Fines-only admin: can manage fines in the admin panel, nothing else.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_fines_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_fines_admin IS
  'Can access Admin → Fines only (log fines, mark payments). Mutually exclusive with is_committee.';

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

  IF NOT FOUND OR NOT (actor.is_admin OR actor.is_committee OR actor.is_fines_admin) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_user(p_display_name text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE lower(login_name) = lower(trim(p_display_name));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid name or passcode';
  END IF;

  IF found_user.passcode_hash IS NULL
     OR found_user.passcode_hash != crypt(p_passcode, found_user.passcode_hash) THEN
    RAISE EXCEPTION 'Invalid name or passcode';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.profiles SET session_token = v_token WHERE id = found_user.id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_fines_admin', found_user.is_fines_admin,
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_session_user(p_user_id uuid, p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  IF NOT public.verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO found_user FROM public.profiles WHERE id = p_user_id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_fines_admin', found_user.is_fines_admin,
    'is_approved', found_user.is_approved,
    'session_token', p_session_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_invite(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_passcode text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  IF found_user.invite_expires_at IS NOT NULL AND found_user.invite_expires_at < now() THEN
    RAISE EXCEPTION 'This invite link has expired';
  END IF;

  IF found_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been used — go to login';
  END IF;

  PERFORM public.apply_player_names(found_user.id, p_first_name, p_last_name);

  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.profiles
  SET
    passcode_hash = crypt(p_passcode, gen_salt('bf')),
    session_token = v_token,
    invite_token = NULL,
    invite_expires_at = NULL,
    invite_label = NULL,
    is_approved = false
  WHERE id = found_user.id
  RETURNING * INTO found_user;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_fines_admin', found_user.is_fines_admin,
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_team_invite(
  p_token text,
  p_first_name text,
  p_last_name text,
  p_passcode text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  settings public.team_invite_settings%ROWTYPE;
  new_user public.profiles%ROWTYPE;
  v_first text;
  v_last text;
  v_username text;
  v_session text;
BEGIN
  SELECT * INTO settings FROM public.team_invite_settings WHERE id = 1;

  IF NOT FOUND OR NOT settings.enabled OR settings.token IS DISTINCT FROM p_token THEN
    RAISE EXCEPTION 'Team invite link not found or disabled';
  END IF;

  v_first := trim(p_first_name);
  v_last := trim(p_last_name);

  IF length(v_first) < 1 OR length(v_last) < 1 THEN
    RAISE EXCEPTION 'First and last name are required';
  END IF;

  v_username := public.allocate_player_username(v_first, v_last, NULL);

  INSERT INTO public.profiles (
    username,
    display_name,
    passcode_hash,
    is_admin,
    is_committee,
    is_fines_admin,
    is_approved
  )
  VALUES (
    v_username,
    'New player',
    NULL,
    false,
    false,
    false,
    false
  )
  RETURNING * INTO new_user;

  PERFORM public.apply_player_names(new_user.id, v_first, v_last);

  v_session := encode(gen_random_bytes(32), 'hex');

  UPDATE public.profiles
  SET
    passcode_hash = crypt(p_passcode, gen_salt('bf')),
    session_token = v_session,
    is_approved = false
  WHERE id = new_user.id
  RETURNING * INTO new_user;

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'display_name', new_user.display_name,
    'is_admin', new_user.is_admin,
    'is_committee', new_user.is_committee,
    'is_fines_admin', new_user.is_fines_admin,
    'is_approved', new_user.is_approved,
    'session_token', v_session
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
      'first_name', p.first_name,
      'last_name', p.last_name,
      'invite_label', p.invite_label,
      'is_admin', p.is_admin,
      'is_committee', p.is_committee,
      'is_fines_admin', p.is_fines_admin,
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
  SET
    is_committee = p_is_committee,
    is_fines_admin = CASE WHEN p_is_committee THEN false ELSE is_fines_admin END
  WHERE id = p_target_id AND is_admin = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_fines_admin(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid,
  p_is_fines_admin boolean
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
  SET
    is_fines_admin = p_is_fines_admin,
    is_committee = CASE WHEN p_is_fines_admin THEN false ELSE is_committee END
  WHERE id = p_target_id AND is_admin = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_fines_admin(uuid, text, uuid, boolean) TO anon, authenticated;
