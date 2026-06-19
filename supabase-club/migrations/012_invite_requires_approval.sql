-- Players who complete an invite must be approved by admin before accessing the squad app.

CREATE OR REPLACE FUNCTION public.complete_invite(p_token text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    is_approved = false
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
