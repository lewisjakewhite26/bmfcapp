-- Admin-created accounts + invite links (players set passcode via /invite/:token)

ALTER TABLE public.profiles
  ALTER COLUMN passcode_hash DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_invite_token
  ON public.profiles(invite_token)
  WHERE invite_token IS NOT NULL;

-- Disable public self-signup
REVOKE EXECUTE ON FUNCTION public.register_user FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_invite(
  p_admin_id uuid,
  p_session_token text,
  p_display_name text
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

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'display_name', new_user.display_name,
    'invite_token', v_token,
    'invite_expires_at', new_user.invite_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_regenerate_invite(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO target_user FROM public.profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This player has already set up their account';
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');

  UPDATE public.profiles
  SET invite_token = v_token, invite_expires_at = now() + interval '14 days'
  WHERE id = p_target_id
  RETURNING * INTO target_user;

  RETURN json_build_object(
    'id', target_user.id,
    'display_name', target_user.display_name,
    'invite_token', v_token,
    'invite_expires_at', target_user.invite_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invite_preview(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  IF found_user.invite_expires_at IS NOT NULL AND found_user.invite_expires_at < now() THEN
    RAISE EXCEPTION 'This invite link has expired — ask your admin for a new one';
  END IF;

  IF found_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been used — go to login';
  END IF;

  RETURN json_build_object(
    'display_name', found_user.display_name,
    'expires_at', found_user.invite_expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_invite(p_token text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  IF p_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  SELECT * INTO found_user
  FROM public.profiles
  WHERE invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite link not found';
  END IF;

  IF found_user.invite_expires_at IS NOT NULL AND found_user.invite_expires_at < now() THEN
    RAISE EXCEPTION 'This invite link has expired — ask your admin for a new one';
  END IF;

  IF found_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been used — go to login';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.profiles
  SET
    passcode_hash = crypt(p_passcode, gen_salt('bf')),
    session_token = v_token,
    invite_token = NULL,
    invite_expires_at = NULL,
    is_approved = true
  WHERE id = found_user.id
  RETURNING * INTO found_user;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.login_user(p_display_name text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE lower(display_name) = lower(trim(p_display_name));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid name or passcode';
  END IF;

  IF found_user.passcode_hash IS NULL THEN
    RAISE EXCEPTION 'Account not set up yet — use your invite link first';
  END IF;

  IF found_user.passcode_hash != crypt(p_passcode, found_user.passcode_hash) THEN
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
    'is_approved', found_user.is_approved,
    'session_token', v_token
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
      'id', id,
      'username', username,
      'display_name', display_name,
      'is_admin', is_admin,
      'is_committee', is_committee,
      'is_approved', is_approved,
      'created_at', created_at,
      'invite_pending', invite_token IS NOT NULL,
      'invite_expires_at', invite_expires_at
    ) ORDER BY created_at)
    FROM public.profiles
  ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_invite TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_invite TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_preview TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_invite TO anon, authenticated;
