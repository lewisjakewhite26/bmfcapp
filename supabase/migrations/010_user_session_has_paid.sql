-- Expose has_paid in user session RPC responses

CREATE OR REPLACE FUNCTION register_user(
  p_username text,
  p_display_name text,
  p_passcode text
) RETURNS json AS $$
DECLARE
  new_user users%ROWTYPE;
  new_token text;
BEGIN
  IF p_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  IF p_username !~ '^[a-zA-Z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Username must be 3-20 alphanumeric characters or underscores';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE lower(username) = lower(p_username)) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO users (username, display_name, passcode_hash, session_token)
  VALUES (p_username, p_display_name, crypt(p_passcode, gen_salt('bf')), new_token)
  RETURNING * INTO new_user;

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'display_name', new_user.display_name,
    'is_admin', new_user.is_admin,
    'total_points', new_user.total_points,
    'has_paid', new_user.has_paid,
    'session_token', new_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION login_user(p_username text, p_passcode text)
RETURNS json AS $$
DECLARE
  found_user users%ROWTYPE;
  new_token text;
BEGIN
  SELECT * INTO found_user FROM users WHERE lower(username) = lower(p_username);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  IF found_user.passcode_hash != crypt(p_passcode, found_user.passcode_hash) THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  new_token := encode(gen_random_bytes(32), 'hex');

  UPDATE users SET session_token = new_token WHERE id = found_user.id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'total_points', found_user.total_points,
    'has_paid', found_user.has_paid,
    'session_token', new_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_session_user(p_user_id uuid, p_session_token text)
RETURNS json AS $$
DECLARE
  found_user users%ROWTYPE;
BEGIN
  IF NOT verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO found_user FROM users WHERE id = p_user_id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'total_points', found_user.total_points,
    'has_paid', found_user.has_paid,
    'session_token', p_session_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
