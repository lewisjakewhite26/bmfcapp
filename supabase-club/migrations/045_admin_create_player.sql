-- Admin can create an approved player in one step (no invite link / waiting).
-- Useful for late joiners and past-season backfill where invite flow is overkill.

CREATE OR REPLACE FUNCTION public.admin_create_player(
  p_admin_id uuid,
  p_session_token text,
  p_first_name text,
  p_last_name text,
  p_passcode text,
  p_position text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  new_user public.profiles%ROWTYPE;
  v_username text;
  v_position text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_passcode IS NULL OR p_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  v_position := nullif(trim(coalesce(p_position, '')), '');
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
    crypt(p_passcode, gen_salt('bf')),
    false,
    false,
    true
  )
  RETURNING * INTO new_user;

  PERFORM public.apply_player_names(new_user.id, p_first_name, p_last_name);

  SELECT * INTO new_user FROM public.profiles WHERE id = new_user.id;

  INSERT INTO public.squad (player_id, position, joined_date, active)
  VALUES (new_user.id, v_position, CURRENT_DATE, true)
  ON CONFLICT (player_id) DO UPDATE
  SET
    position = COALESCE(EXCLUDED.position, public.squad.position),
    active = true;

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'login_name', new_user.login_name,
    'display_name', new_user.display_name,
    'first_name', new_user.first_name,
    'last_name', new_user.last_name,
    'is_approved', new_user.is_approved,
    'squad_position', v_position
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_player(uuid, text, text, text, text, text) TO anon, authenticated;
