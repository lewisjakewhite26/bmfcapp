-- Automated matchday progression (knockout discovery + auto-open)

CREATE TABLE progression_log (
  id serial PRIMARY KEY,
  game_day integer NOT NULL,
  event text NOT NULL,
  triggered_at timestamptz DEFAULT now(),
  details jsonb
);

CREATE INDEX idx_progression_log_game_day ON progression_log(game_day);
CREATE INDEX idx_progression_log_triggered_at ON progression_log(triggered_at DESC);

CREATE TABLE progression_queue (
  id serial PRIMARY KEY,
  game_day integer NOT NULL UNIQUE,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX idx_progression_queue_due ON progression_queue(status, scheduled_for);

ALTER TABLE progression_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_queue ENABLE ROW LEVEL SECURITY;

-- Service role only — no public policies

CREATE OR REPLACE FUNCTION check_matchday_complete(p_game_day integer)
RETURNS boolean AS $$
DECLARE
  total_fixtures integer;
  completed_fixtures integer;
BEGIN
  SELECT COUNT(*) INTO total_fixtures
  FROM fixtures WHERE game_day = p_game_day;

  SELECT COUNT(*) INTO completed_fixtures
  FROM fixtures
  WHERE game_day = p_game_day AND status = 'completed';

  RETURN total_fixtures > 0 AND total_fixtures = completed_fixtures;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_complete_matchday(p_game_day integer)
RETURNS void AS $$
DECLARE
  next_game_day integer;
BEGIN
  UPDATE game_days
  SET status = 'completed', completed_at = now()
  WHERE game_day = p_game_day;

  INSERT INTO progression_log (game_day, event, details)
  VALUES (p_game_day, 'all_scored', jsonb_build_object('completed_at', now()));

  SELECT game_day INTO next_game_day
  FROM game_days
  WHERE game_day > p_game_day AND status = 'locked'
  ORDER BY game_day ASC
  LIMIT 1;

  IF next_game_day IS NOT NULL THEN
    INSERT INTO progression_queue (game_day, scheduled_for)
    VALUES (next_game_day, now() + interval '1 hour')
    ON CONFLICT (game_day) DO UPDATE
    SET scheduled_for = EXCLUDED.scheduled_for,
        status = 'pending',
        processed_at = NULL;

    INSERT INTO progression_log (game_day, event, details)
    VALUES (next_game_day, 'wait_started', jsonb_build_object(
      'scheduled_for', now() + interval '1 hour'
    ));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auto_open_matchday(p_game_day integer)
RETURNS void AS $$
BEGIN
  UPDATE game_days
  SET status = 'open', opened_at = now()
  WHERE game_day = p_game_day;

  UPDATE fixtures
  SET status = 'open'
  WHERE game_day = p_game_day AND status = 'upcoming';

  INSERT INTO progression_log (game_day, event)
  VALUES (p_game_day, 'matchday_opened');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_fixture_teams(
  p_fixture_id integer,
  p_home_team text,
  p_away_team text,
  p_api_fixture_id integer
)
RETURNS void AS $$
BEGIN
  UPDATE fixtures
  SET home_team = trim(p_home_team),
      away_team = trim(p_away_team)
  WHERE id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  INSERT INTO fixture_api_mapping (fixture_id, api_fixture_id)
  VALUES (p_fixture_id, p_api_fixture_id)
  ON CONFLICT (api_fixture_id) DO UPDATE
  SET fixture_id = EXCLUDED.fixture_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_progression_status(
  p_user_id uuid,
  p_session_token text
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
  log_rows json;
  queue_rows json;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(l) ORDER BY l.triggered_at DESC), '[]'::json)
  INTO log_rows
  FROM (
    SELECT id, game_day, event, triggered_at, details
    FROM progression_log
    ORDER BY triggered_at DESC
    LIMIT 10
  ) l;

  SELECT COALESCE(json_agg(row_to_json(q) ORDER BY q.scheduled_for ASC), '[]'::json)
  INTO queue_rows
  FROM (
    SELECT id, game_day, scheduled_for, status, created_at, processed_at
    FROM progression_queue
    WHERE status IN ('pending', 'processing', 'failed')
    ORDER BY scheduled_for ASC
  ) q;

  RETURN json_build_object('log', log_rows, 'queue', queue_rows);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_matchday_complete TO service_role;
GRANT EXECUTE ON FUNCTION auto_complete_matchday TO service_role;
GRANT EXECUTE ON FUNCTION auto_open_matchday TO service_role;
GRANT EXECUTE ON FUNCTION update_fixture_teams TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_progression_status TO anon, authenticated;
