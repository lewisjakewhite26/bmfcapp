-- Reusable team invite link (share once in squad WhatsApp; approval still required)

CREATE TABLE public.team_invite_link (
  singleton int PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  token text UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.team_invite_link (singleton, enabled) VALUES (1, false);

ALTER TABLE public.team_invite_link ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_get_team_invite(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.team_invite_link%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO row FROM public.team_invite_link WHERE singleton = 1;

  RETURN json_build_object(
    'enabled', row.enabled AND row.token IS NOT NULL,
    'token', row.token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_generate_team_invite(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.team_invite_link (singleton, token, enabled, updated_at)
  VALUES (1, v_token, true, now())
  ON CONFLICT (singleton) DO UPDATE
  SET
    token = EXCLUDED.token,
    enabled = true,
    updated_at = now();

  RETURN json_build_object('token', v_token, 'enabled', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_team_invite(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  UPDATE public.team_invite_link
  SET token = v_token, enabled = true, updated_at = now()
  WHERE singleton = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team invite not set up yet';
  END IF;

  RETURN json_build_object('token', v_token, 'enabled', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_disable_team_invite(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.team_invite_link%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.team_invite_link
  SET enabled = false, updated_at = now()
  WHERE singleton = 1
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team invite not set up yet';
  END IF;

  RETURN json_build_object('token', row.token, 'enabled', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_enable_team_invite(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.team_invite_link%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO row FROM public.team_invite_link WHERE singleton = 1;

  IF row.token IS NULL THEN
    RAISE EXCEPTION 'Generate a team invite link first';
  END IF;

  UPDATE public.team_invite_link
  SET enabled = true, updated_at = now()
  WHERE singleton = 1
  RETURNING * INTO row;

  RETURN json_build_object('token', row.token, 'enabled', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_invite_preview(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.team_invite_link%ROWTYPE;
BEGIN
  SELECT * INTO row FROM public.team_invite_link WHERE singleton = 1;

  IF NOT FOUND OR NOT row.enabled OR row.token IS NULL OR row.token <> p_token THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  RETURN json_build_object(
    'expires_at', NULL,
    'invite_label', 'Team invite',
    'is_team_invite', true
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
  team_row public.team_invite_link%ROWTYPE;
  new_user public.profiles%ROWTYPE;
  existing public.profiles%ROWTYPE;
  v_first text;
  v_last text;
  v_username text;
  v_session text;
BEGIN
  IF p_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  SELECT * INTO team_row FROM public.team_invite_link WHERE singleton = 1;

  IF NOT FOUND OR NOT team_row.enabled OR team_row.token IS NULL OR team_row.token <> p_token THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  v_first := public.normalize_name_part(p_first_name);
  v_last := public.normalize_name_part(p_last_name);

  IF v_first = '' OR length(v_first) > 40 OR v_first !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'First name must be 1–40 letters';
  END IF;

  IF v_last = '' OR length(v_last) > 40 OR v_last !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'Last name must be 1–40 letters';
  END IF;

  SELECT * INTO existing
  FROM public.profiles
  WHERE lower(first_name) = lower(v_first)
    AND lower(last_name) = lower(v_last)
    AND passcode_hash IS NOT NULL;

  IF FOUND THEN
    IF existing.is_approved THEN
      RAISE EXCEPTION 'You''ve already signed up. Go to login.';
    END IF;
    RAISE EXCEPTION 'You''ve already signed up. Waiting for approval.';
  END IF;

  v_username := 'inv_' || encode(gen_random_bytes(8), 'hex');

  INSERT INTO public.profiles (
    username,
    display_name,
    passcode_hash,
    is_admin,
    is_committee,
    is_approved
  )
  VALUES (
    v_username,
    'New player',
    NULL,
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
    'is_approved', new_user.is_approved,
    'session_token', v_session
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_team_invite(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_team_invite(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_team_invite(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_disable_team_invite(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_enable_team_invite(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_invite_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_team_invite(text, text, text, text) TO anon, authenticated;
