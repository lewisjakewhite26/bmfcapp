-- Admin: full predictions audit (picks, results, points)

CREATE OR REPLACE FUNCTION admin_get_predictions_audit(
  p_admin_id uuid,
  p_session_token text,
  p_game_day integer DEFAULT NULL,
  p_filter_user_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_admin_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(a) ORDER BY a.display_name, a.game_day, a.kickoff_utc), '[]'::json)
    FROM (
      SELECT
        p.id AS prediction_id,
        p.user_id,
        u.display_name,
        u.username,
        u.total_points,
        p.fixture_id,
        f.game_day,
        f.home_team,
        f.away_team,
        f.kickoff_utc,
        p.predicted_home,
        p.predicted_away,
        f.home_score AS actual_home,
        f.away_score AS actual_away,
        p.points_awarded,
        p.created_at
      FROM predictions p
      JOIN users u ON u.id = p.user_id
      JOIN fixtures f ON f.id = p.fixture_id
      WHERE (p_game_day IS NULL OR f.game_day = p_game_day)
        AND (p_filter_user_id IS NULL OR p.user_id = p_filter_user_id)
    ) a
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_predictions_audit TO anon, authenticated;
