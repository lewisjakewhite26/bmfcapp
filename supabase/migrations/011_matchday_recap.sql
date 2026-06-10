-- User matchday recap stats (points, ranks) after a round completes

CREATE OR REPLACE FUNCTION get_user_matchday_recap(
  p_user_id uuid,
  p_session_token text,
  p_game_day integer
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_gd game_days%ROWTYPE;
  v_md_points integer;
  v_correct_scores integer;
  v_correct_results integer;
  v_predictions_count integer;
  v_md_rank integer;
  v_md_players integer;
  v_overall_rank integer;
  v_overall_players integer;
BEGIN
  IF NOT verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO v_gd FROM game_days WHERE game_day = p_game_day;
  IF NOT FOUND OR v_gd.status != 'completed' THEN
    RAISE EXCEPTION 'Matchday not completed';
  END IF;

  SELECT
    COALESCE(SUM(p.points_awarded), 0),
    COUNT(CASE WHEN p.points_awarded = 10 THEN 1 END)::integer,
    COUNT(CASE WHEN p.points_awarded = 5 THEN 1 END)::integer,
    COUNT(*)::integer
  INTO v_md_points, v_correct_scores, v_correct_results, v_predictions_count
  FROM predictions p
  JOIN fixtures f ON f.id = p.fixture_id
  WHERE p.user_id = p_user_id AND f.game_day = p_game_day;

  SELECT COUNT(DISTINCT p.user_id)::integer INTO v_md_players
  FROM predictions p
  JOIN fixtures f ON f.id = p.fixture_id
  WHERE f.game_day = p_game_day;

  v_md_players := GREATEST(v_md_players, 1);

  WITH scores AS (
    SELECT p.user_id, SUM(p.points_awarded) AS pts
    FROM predictions p
    JOIN fixtures f ON f.id = p.fixture_id
    WHERE f.game_day = p_game_day
    GROUP BY p.user_id
  ),
  ranked AS (
    SELECT user_id, RANK() OVER (ORDER BY pts DESC, user_id) AS rnk
    FROM scores
  )
  SELECT rnk INTO v_md_rank FROM ranked WHERE user_id = p_user_id;

  IF v_md_rank IS NULL THEN
    v_md_rank := v_md_players;
  END IF;

  SELECT COUNT(*)::integer INTO v_overall_players FROM users;

  SELECT rnk INTO v_overall_rank FROM (
    SELECT id, RANK() OVER (ORDER BY total_points DESC, id) AS rnk
    FROM users
  ) ranked_users
  WHERE id = p_user_id;

  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  RETURN json_build_object(
    'game_day', p_game_day,
    'label', v_gd.label,
    'matchday_points', v_md_points,
    'correct_scores', v_correct_scores,
    'correct_results', v_correct_results,
    'predictions_count', v_predictions_count,
    'matchday_rank', v_md_rank,
    'matchday_total_players', v_md_players,
    'overall_rank', COALESCE(v_overall_rank, v_overall_players),
    'overall_total_players', GREATEST(v_overall_players, 1),
    'total_points', v_user.total_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_matchday_recap TO anon, authenticated;
