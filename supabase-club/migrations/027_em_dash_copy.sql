-- Replace em dashes in user-facing RPC error messages (COPY-RULES: prefer full stops)

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
    RAISE EXCEPTION 'This invite link has expired. Ask your admin for a new one';
  END IF;

  IF found_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been used. Go to login';
  END IF;

  RETURN json_build_object(
    'expires_at', found_user.invite_expires_at,
    'invite_label', found_user.invite_label
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
    RAISE EXCEPTION 'This invite link has expired. Ask your admin for a new one';
  END IF;

  IF found_user.passcode_hash IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been used. Go to login';
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
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

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
    RAISE EXCEPTION 'Cannot delete DDSFL-synced fixtures. Only manually added matches can be removed';
  END IF;

  DELETE FROM public.fixtures WHERE id = p_fixture_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_player_photo_upload(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_storage_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_path text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_path := trim(p_storage_path);
  IF v_path = '' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF (storage.foldername(v_path))[1] <> p_player_id::text THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF v_path NOT LIKE p_player_id::text || '/photo.%' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.photo_upload_grants g
    WHERE g.player_id = p_player_id
      AND g.storage_path = v_path
      AND g.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Upload window expired. Try again';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'player-photos' AND name = v_path
  ) THEN
    RAISE EXCEPTION 'Photo upload not found';
  END IF;

  UPDATE public.profiles
  SET photo_url = v_path
  WHERE id = p_player_id;

  DELETE FROM public.photo_upload_grants WHERE player_id = p_player_id;

  RETURN json_build_object('photo_url', v_path);
END;
$$;
