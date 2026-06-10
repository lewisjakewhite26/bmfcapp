-- Restrict predictions to session-verified RPC access only (no public table reads)

DROP POLICY IF EXISTS "Predictions readable" ON predictions;

CREATE POLICY "No direct prediction read" ON predictions FOR SELECT USING (false);

CREATE OR REPLACE FUNCTION get_user_predictions(
  p_user_id uuid,
  p_session_token text,
  p_fixture_ids integer[] DEFAULT NULL
)
RETURNS SETOF predictions AS $$
BEGIN
  IF NOT verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  IF p_fixture_ids IS NULL OR array_length(p_fixture_ids, 1) IS NULL THEN
    RETURN QUERY
      SELECT * FROM predictions WHERE user_id = p_user_id;
  ELSE
    RETURN QUERY
      SELECT * FROM predictions
      WHERE user_id = p_user_id AND fixture_id = ANY(p_fixture_ids);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_predictions TO anon, authenticated;
