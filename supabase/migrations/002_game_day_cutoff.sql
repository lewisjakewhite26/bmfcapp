-- Matchday prediction cutoff: lock 1 hour before first kickoff of the matchday

CREATE OR REPLACE FUNCTION get_game_day_cutoff(p_game_day integer)
RETURNS timestamptz AS $$
  SELECT MIN(kickoff_utc) - interval '1 hour'
  FROM fixtures
  WHERE game_day = p_game_day;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION submit_prediction(
  p_user_id uuid,
  p_session_token text,
  p_fixture_id integer,
  p_predicted_home integer,
  p_predicted_away integer
) RETURNS json AS $$
DECLARE
  fix fixtures%ROWTYPE;
  gd game_days%ROWTYPE;
  cutoff timestamptz;
BEGIN
  IF NOT verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO fix FROM fixtures WHERE id = p_fixture_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  SELECT * INTO gd FROM game_days WHERE game_day = fix.game_day;
  IF gd.status != 'open' THEN
    RAISE EXCEPTION 'Game day is not open';
  END IF;

  cutoff := get_game_day_cutoff(fix.game_day);

  IF cutoff IS NOT NULL AND now() >= cutoff THEN
    RAISE EXCEPTION 'Predictions are locked for this matchday';
  END IF;

  IF fix.status = 'completed' THEN
    RAISE EXCEPTION 'Fixture is locked';
  END IF;

  INSERT INTO predictions (user_id, fixture_id, predicted_home, predicted_away)
  VALUES (p_user_id, p_fixture_id, p_predicted_home, p_predicted_away)
  ON CONFLICT (user_id, fixture_id)
  DO UPDATE SET predicted_home = p_predicted_home, predicted_away = p_predicted_away;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION lock_expired_fixtures()
RETURNS void AS $$
BEGIN
  UPDATE fixtures f
  SET status = 'locked'
  FROM game_days gd
  WHERE f.game_day = gd.game_day
    AND gd.status = 'open'
    AND f.status IN ('upcoming', 'open')
    AND f.home_score IS NULL
    AND now() >= get_game_day_cutoff(f.game_day);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_game_day_cutoff TO anon, authenticated;
