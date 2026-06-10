-- Admin: delete a user and their predictions (predictions cascade via FK)

CREATE OR REPLACE FUNCTION admin_delete_user(
  p_admin_id uuid,
  p_session_token text,
  p_target_user_id uuid
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_admin_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_target_user_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  DELETE FROM users WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_delete_user TO anon, authenticated;
