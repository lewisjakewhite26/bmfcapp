-- BMFC World Cup Predictor Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  passcode_hash text NOT NULL,
  session_token text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  total_points integer DEFAULT 0,
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

-- Game days table
CREATE TABLE game_days (
  id serial PRIMARY KEY,
  game_day integer UNIQUE NOT NULL,
  label text NOT NULL,
  status text DEFAULT 'locked' CHECK (status IN ('locked', 'open', 'completed')),
  opened_at timestamptz,
  completed_at timestamptz
);

-- Fixtures table
CREATE TABLE fixtures (
  id serial PRIMARY KEY,
  game_day integer NOT NULL REFERENCES game_days(game_day),
  stage text NOT NULL CHECK (stage IN ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final', 'third_place')),
  group_name text,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_flag text,
  away_flag text,
  kickoff_utc timestamptz NOT NULL,
  venue text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'open', 'locked', 'completed')),
  home_score integer,
  away_score integer
);

-- Predictions table
CREATE TABLE predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_id integer NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  predicted_home integer NOT NULL CHECK (predicted_home >= 0 AND predicted_home <= 99),
  predicted_away integer NOT NULL CHECK (predicted_away >= 0 AND predicted_away <= 99),
  points_awarded integer DEFAULT 0 CHECK (points_awarded IN (0, 5, 10)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, fixture_id)
);

-- Indexes
CREATE INDEX idx_fixtures_game_day ON fixtures(game_day);
CREATE INDEX idx_fixtures_kickoff ON fixtures(kickoff_utc);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_fixture ON predictions(fixture_id);
CREATE INDEX idx_users_total_points ON users(total_points DESC);

-- Leaderboard view (public stats)
CREATE OR REPLACE VIEW leaderboard_stats AS
SELECT
  u.id,
  u.display_name,
  u.total_points,
  COUNT(CASE WHEN p.points_awarded = 10 THEN 1 END)::integer AS correct_scores,
  COUNT(CASE WHEN p.points_awarded = 5 THEN 1 END)::integer AS correct_results
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
GROUP BY u.id, u.display_name, u.total_points;

-- Scoring helper: result direction
CREATE OR REPLACE FUNCTION get_result_direction(home_score integer, away_score integer)
RETURNS text AS $$
BEGIN
  IF home_score > away_score THEN RETURN 'home';
  ELSIF away_score > home_score THEN RETURN 'away';
  ELSE RETURN 'draw';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate points for a single prediction
CREATE OR REPLACE FUNCTION calculate_prediction_points(
  pred_home integer,
  pred_away integer,
  actual_home integer,
  actual_away integer
) RETURNS integer AS $$
BEGIN
  IF pred_home = actual_home AND pred_away = actual_away THEN
    RETURN 10;
  ELSIF get_result_direction(pred_home, pred_away) = get_result_direction(actual_home, actual_away) THEN
    RETURN 5;
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalculate user total points
CREATE OR REPLACE FUNCTION recalculate_user_points(p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET total_points = COALESCE((
    SELECT SUM(points_awarded) FROM predictions WHERE user_id = p_user_id
  ), 0)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Score all predictions for a fixture
CREATE OR REPLACE FUNCTION score_fixture(p_fixture_id integer, p_home_score integer, p_away_score integer)
RETURNS void AS $$
DECLARE
  pred RECORD;
BEGIN
  UPDATE fixtures
  SET home_score = p_home_score, away_score = p_away_score, status = 'completed'
  WHERE id = p_fixture_id;

  FOR pred IN SELECT id, user_id, predicted_home, predicted_away FROM predictions WHERE fixture_id = p_fixture_id
  LOOP
    UPDATE predictions
    SET points_awarded = calculate_prediction_points(pred.predicted_home, pred.predicted_away, p_home_score, p_away_score)
    WHERE id = pred.id;

    PERFORM recalculate_user_points(pred.user_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Register user
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
    'session_token', new_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login user
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
    'session_token', new_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify session
CREATE OR REPLACE FUNCTION verify_session(p_user_id uuid, p_session_token text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id AND session_token = p_session_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit prediction
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

  IF fix.kickoff_utc <= now() THEN
    RAISE EXCEPTION 'Fixture is locked';
  END IF;

  IF fix.status = 'completed' OR fix.status = 'locked' THEN
    RAISE EXCEPTION 'Fixture is locked';
  END IF;

  INSERT INTO predictions (user_id, fixture_id, predicted_home, predicted_away)
  VALUES (p_user_id, p_fixture_id, p_predicted_home, p_predicted_away)
  ON CONFLICT (user_id, fixture_id)
  DO UPDATE SET predicted_home = p_predicted_home, predicted_away = p_predicted_away;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Open game day (admin)
CREATE OR REPLACE FUNCTION open_game_day(
  p_user_id uuid,
  p_session_token text,
  p_game_day integer
) RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
  prev_day game_days%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_game_day > 1 THEN
    SELECT * INTO prev_day FROM game_days WHERE game_day = p_game_day - 1;
    IF prev_day.status != 'completed' THEN
      RAISE EXCEPTION 'Previous game day must be completed first';
    END IF;
  END IF;

  UPDATE game_days SET status = 'locked' WHERE status = 'open';

  UPDATE game_days
  SET status = 'open', opened_at = now()
  WHERE game_day = p_game_day;

  UPDATE fixtures SET status = 'open' WHERE game_day = p_game_day;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete game day (admin)
CREATE OR REPLACE FUNCTION complete_game_day(
  p_user_id uuid,
  p_session_token text,
  p_game_day integer
) RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
  incomplete_count integer;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO incomplete_count
  FROM fixtures
  WHERE game_day = p_game_day AND (home_score IS NULL OR away_score IS NULL);

  IF incomplete_count > 0 THEN
    RAISE EXCEPTION 'All fixtures must have results entered';
  END IF;

  UPDATE game_days
  SET status = 'completed', completed_at = now()
  WHERE game_day = p_game_day;

  UPDATE fixtures SET status = 'completed' WHERE game_day = p_game_day;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Submit result (admin)
CREATE OR REPLACE FUNCTION submit_fixture_result(
  p_user_id uuid,
  p_session_token text,
  p_fixture_id integer,
  p_home_score integer,
  p_away_score integer
) RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM score_fixture(p_fixture_id, p_home_score, p_away_score);

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset user passcode (admin)
CREATE OR REPLACE FUNCTION reset_user_passcode(
  p_admin_id uuid,
  p_session_token text,
  p_target_user_id uuid,
  p_new_passcode text
) RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_admin_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_new_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  UPDATE users
  SET passcode_hash = crypt(p_new_passcode, gen_salt('bf'))
  WHERE id = p_target_user_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-lock fixtures past kickoff
CREATE OR REPLACE FUNCTION lock_expired_fixtures()
RETURNS void AS $$
BEGIN
  UPDATE fixtures
  SET status = 'locked'
  WHERE kickoff_utc <= now()
    AND status = 'open'
    AND home_score IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_days ENABLE ROW LEVEL SECURITY;

-- Public read for fixtures
CREATE POLICY "Fixtures are publicly readable" ON fixtures FOR SELECT USING (true);

-- Public read for game days
CREATE POLICY "Game days are publicly readable" ON game_days FOR SELECT USING (true);

-- Users table: no direct public reads (use RPCs and views)
CREATE POLICY "No direct user read" ON users FOR SELECT USING (false);

-- Predictions: users can read their own (via session in app layer, open for anon with RPC)
CREATE POLICY "Predictions readable" ON predictions FOR SELECT USING (true);

-- Block direct inserts/updates on protected tables (use RPC)
CREATE POLICY "No direct user insert" ON users FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct user update" ON users FOR UPDATE USING (false);
CREATE POLICY "No direct prediction insert" ON predictions FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct prediction update" ON predictions FOR UPDATE USING (false);
CREATE POLICY "No direct fixture update" ON fixtures FOR UPDATE USING (false);
CREATE POLICY "No direct game_day update" ON game_days FOR UPDATE USING (false);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION register_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_prediction TO anon, authenticated;
GRANT EXECUTE ON FUNCTION open_game_day TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_game_day TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_fixture_result TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_user_passcode TO anon, authenticated;
GRANT EXECUTE ON FUNCTION lock_expired_fixtures TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_session TO anon, authenticated;

-- Get session user profile (safe fields only)
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
    'session_token', p_session_token
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin list users
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
      'total_points', total_points
    ) ORDER BY total_points DESC), '[]'::json)
    FROM users
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_session_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_list_users TO anon, authenticated;

GRANT SELECT ON leaderboard_stats TO anon, authenticated;
