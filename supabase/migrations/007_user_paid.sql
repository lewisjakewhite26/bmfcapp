-- Manual cash payment tracking for admins

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_paid boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_has_paid ON users(has_paid);

CREATE OR REPLACE FUNCTION admin_list_users(p_admin_id uuid, p_session_token text)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_admin_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', id,
      'username', username,
      'display_name', display_name,
      'total_points', total_points,
      'has_paid', has_paid,
      'created_at', created_at
    ) ORDER BY created_at ASC), '[]'::json)
    FROM users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_set_user_paid(
  p_admin_id uuid,
  p_session_token text,
  p_target_user_id uuid,
  p_has_paid boolean
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_admin_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE users
  SET has_paid = p_has_paid
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN json_build_object('success', true, 'has_paid', p_has_paid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_set_user_paid TO anon, authenticated;
