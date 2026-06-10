-- API-Football sync tables and admin RPCs

CREATE TABLE api_request_log (
  id serial PRIMARY KEY,
  date date NOT NULL UNIQUE,
  request_count integer DEFAULT 0,
  last_request_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text DEFAULT 'pending',
  last_sync_message text
);

CREATE TABLE fixture_api_mapping (
  id serial PRIMARY KEY,
  fixture_id integer REFERENCES fixtures(id) ON DELETE CASCADE,
  api_fixture_id integer NOT NULL UNIQUE,
  discovered_at timestamptz DEFAULT now()
);

CREATE INDEX idx_fixture_api_mapping_fixture ON fixture_api_mapping(fixture_id);

ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_api_mapping ENABLE ROW LEVEL SECURITY;

-- No public policies — service role and SECURITY DEFINER RPCs only

ALTER PUBLICATION supabase_realtime ADD TABLE api_request_log;

-- Atomic request counter increment
CREATE OR REPLACE FUNCTION increment_api_request_log(p_date date)
RETURNS integer AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO api_request_log (date, request_count, last_request_at)
  VALUES (p_date, 1, now())
  ON CONFLICT (date) DO UPDATE
  SET
    request_count = api_request_log.request_count + 1,
    last_request_at = now()
  RETURNING request_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_api_sync_log(
  p_date date,
  p_status text,
  p_message text
)
RETURNS void AS $$
BEGIN
  INSERT INTO api_request_log (date, last_sync_at, last_sync_status, last_sync_message)
  VALUES (p_date, now(), p_status, p_message)
  ON CONFLICT (date) DO UPDATE
  SET
    last_sync_at = now(),
    last_sync_status = p_status,
    last_sync_message = p_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: read today's sync status
CREATE OR REPLACE FUNCTION admin_get_sync_status(
  p_user_id uuid,
  p_session_token text
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
  log_row api_request_log%ROWTYPE;
  today date := CURRENT_DATE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO log_row FROM api_request_log WHERE date = today;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'date', today,
      'request_count', 0,
      'max_requests', 80,
      'last_request_at', null,
      'last_sync_at', null,
      'last_sync_status', 'pending',
      'last_sync_message', null
    );
  END IF;

  RETURN json_build_object(
    'date', log_row.date,
    'request_count', log_row.request_count,
    'max_requests', 80,
    'last_request_at', log_row.last_request_at,
    'last_sync_at', log_row.last_sync_at,
    'last_sync_status', log_row.last_sync_status,
    'last_sync_message', log_row.last_sync_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: update knockout placeholder team names
CREATE OR REPLACE FUNCTION admin_update_fixture_teams(
  p_user_id uuid,
  p_session_token text,
  p_fixture_id integer,
  p_home_team text,
  p_away_team text
)
RETURNS json AS $$
DECLARE
  admin_user users%ROWTYPE;
BEGIN
  SELECT * INTO admin_user FROM users WHERE id = p_user_id AND session_token = p_session_token;
  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF length(trim(p_home_team)) = 0 OR length(trim(p_away_team)) = 0 THEN
    RAISE EXCEPTION 'Team names cannot be empty';
  END IF;

  UPDATE fixtures
  SET home_team = trim(p_home_team), away_team = trim(p_away_team)
  WHERE id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_api_request_log TO service_role;
GRANT EXECUTE ON FUNCTION update_api_sync_log TO service_role;
GRANT EXECUTE ON FUNCTION score_fixture TO service_role;
GRANT EXECUTE ON FUNCTION admin_get_sync_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_fixture_teams TO anon, authenticated;
