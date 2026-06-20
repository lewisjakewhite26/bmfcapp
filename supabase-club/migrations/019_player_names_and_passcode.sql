-- Player names on invite completion + passcode self-service

DROP FUNCTION IF EXISTS public.admin_create_invite(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_create_invite(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.complete_invite(text, text);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS invite_label text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_name_pair
  ON public.profiles (lower(first_name), lower(last_name))
  WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_name_part(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.format_player_display_name(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN public.normalize_name_part(p_first_name) = ''
        OR public.normalize_name_part(p_last_name) = '' THEN ''
      ELSE public.normalize_name_part(p_first_name) ||
        upper(left(public.normalize_name_part(p_last_name), 1))
    END;
$$;

CREATE OR REPLACE FUNCTION public.player_username_base(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN left(lower(public.normalize_name_part(p_first_name)), 1) = ''
        OR regexp_replace(lower(public.normalize_name_part(p_last_name)), '[^a-z0-9]', '', 'g') = ''
      THEN 'player'
      ELSE left(
        lower(left(public.normalize_name_part(p_first_name), 1)) ||
        regexp_replace(lower(public.normalize_name_part(p_last_name)), '[^a-z0-9]', '', 'g'),
        20
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_player_username(
  p_first_name text,
  p_last_name text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 2;
BEGIN
  base := public.player_username_base(p_first_name, p_last_name);
  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(candidate)
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  ) LOOP
    candidate := base || n::text;
    n := n + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_player_display_name(
  p_first_name text,
  p_last_name text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 2;
BEGIN
  base := public.format_player_display_name(p_first_name, p_last_name);
  IF base = '' THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(display_name) = lower(candidate)
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  ) LOOP
    candidate := base || n::text;
    n := n + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_player_names(
  p_profile_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_first text;
  v_last text;
BEGIN
  v_first := public.normalize_name_part(p_first_name);
  v_last := public.normalize_name_part(p_last_name);

  IF v_first = '' OR length(v_first) > 40 OR v_first !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'First name must be 1–40 letters';
  END IF;

  IF v_last = '' OR length(v_last) > 40 OR v_last !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'Last name must be 1–40 letters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(first_name) = lower(v_first)
      AND lower(last_name) = lower(v_last)
      AND id <> p_profile_id
  ) THEN
    RAISE EXCEPTION 'Someone with that name is already registered';
  END IF;

  UPDATE public.profiles
  SET
    first_name = v_first,
    last_name = v_last,
    display_name = public.allocate_player_display_name(v_first, v_last, p_profile_id),
    username = public.allocate_player_username(v_first, v_last, p_profile_id)
  WHERE id = p_profile_id;
END;
$$;

-- Backfill existing profiles from display_name where possible
DO $$
DECLARE
  row public.profiles%ROWTYPE;
  parts text[];
BEGIN
  FOR row IN
    SELECT * FROM public.profiles
    WHERE first_name IS NULL
      AND display_name IS NOT NULL
      AND display_name <> 'New player'
      AND passcode_hash IS NOT NULL
  LOOP
    parts := regexp_split_to_array(trim(row.display_name), '\s+');
    IF array_length(parts, 1) >= 2 THEN
      BEGIN
        PERFORM public.apply_player_names(row.id, parts[1], parts[array_length(parts, 1)]);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_invite(
  p_admin_id uuid,
  p_session_token text,
  p_position text DEFAULT NULL,
  p_invite_label text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_label text;
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

  v_label := nullif(trim(p_invite_label), '');
  v_username := 'inv_' || encode(gen_random_bytes(8), 'hex');
  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.profiles (
    username,
    display_name,
    passcode_hash,
    invite_token,
    invite_expires_at,
    invite_label,
    is_approved
  )
  VALUES (
    v_username,
    coalesce(v_label, 'New player'),
    NULL,
    v_token,
    now() + interval '14 days',
    v_label,
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
    'invite_label', new_user.invite_label,
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
      'first_name', p.first_name,
      'last_name', p.last_name,
      'invite_label', p.invite_label,
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
    RAISE EXCEPTION 'This invite link has expired — ask your admin for a new one';
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
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_player_names(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO target_user FROM public.profiles WHERE id = p_target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF target_user.invite_token IS NOT NULL THEN
    RAISE EXCEPTION 'Player has not finished invite setup yet';
  END IF;

  PERFORM public.apply_player_names(p_target_id, p_first_name, p_last_name);

  SELECT * INTO target_user FROM public.profiles WHERE id = p_target_id;

  RETURN json_build_object(
    'id', target_user.id,
    'username', target_user.username,
    'display_name', target_user.display_name,
    'first_name', target_user.first_name,
    'last_name', target_user.last_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.change_player_passcode(
  p_user_id uuid,
  p_session_token text,
  p_current_passcode text,
  p_new_passcode text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  IF p_new_passcode !~ '^\d{4}$' OR p_current_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  IF p_new_passcode = p_current_passcode THEN
    RAISE EXCEPTION 'Pick a different passcode';
  END IF;

  SELECT * INTO found_user
  FROM public.profiles
  WHERE id = p_user_id AND session_token = p_session_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF found_user.passcode_hash IS NULL
     OR found_user.passcode_hash != crypt(p_current_passcode, found_user.passcode_hash) THEN
    RAISE EXCEPTION 'Current passcode is wrong';
  END IF;

  UPDATE public.profiles
  SET passcode_hash = crypt(p_new_passcode, gen_salt('bf'))
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_invite(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_invite(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_player_names(uuid, text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_player_passcode(uuid, text, text, text) TO anon, authenticated;
