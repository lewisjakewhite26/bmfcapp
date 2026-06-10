-- BMFC Club Hub — initial schema (separate Supabase project)
-- Bishop Middleham FC
-- Apply to a NEW Supabase project only. Does not touch the World Cup predictor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- Profiles (name + 4-digit passcode — no email auth)
-- =============================================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  passcode_hash text,
  invite_token text,
  invite_expires_at timestamptz,
  session_token text,
  is_admin boolean NOT NULL DEFAULT false,
  is_committee boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$')
);

CREATE UNIQUE INDEX idx_profiles_display_name_lower ON public.profiles (lower(display_name));
CREATE INDEX idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);

-- =============================================================================
-- RLS helpers
-- =============================================================================

-- Auth RPCs: run 003_passcode_auth.sql after this file.

-- =============================================================================
-- Club hub tables
-- =============================================================================

CREATE TABLE public.fixtures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date timestamptz NOT NULL,
  opponent text NOT NULL,
  home_away text NOT NULL CHECK (home_away IN ('home', 'away')),
  competition text NOT NULL,
  venue text,
  kickoff_time time,
  ddsfl_fixture_id text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'postponed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_fixtures_ddsfl_fixture_id
  ON public.fixtures(ddsfl_fixture_id)
  WHERE ddsfl_fixture_id IS NOT NULL;

CREATE INDEX idx_fixtures_match_date ON public.fixtures(match_date);
CREATE INDEX idx_fixtures_status ON public.fixtures(status);

CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL UNIQUE REFERENCES public.fixtures(id) ON DELETE CASCADE,
  goals_for integer NOT NULL CHECK (goals_for >= 0),
  goals_against integer NOT NULL CHECK (goals_against >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_results_fixture_id ON public.results(fixture_id);

CREATE TABLE public.match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN ('goal', 'assist', 'motm', 'yellow_card', 'red_card')),
  minute integer CHECK (minute IS NULL OR (minute >= 0 AND minute <= 200)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_events_fixture_id ON public.match_events(fixture_id);
CREATE INDEX idx_match_events_player_id ON public.match_events(player_id);
CREATE INDEX idx_match_events_event_type ON public.match_events(event_type);

CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date timestamptz NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_training_sessions_session_date ON public.training_sessions(session_date);

CREATE TABLE public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fixture_id uuid REFERENCES public.fixtures(id) ON DELETE CASCADE,
  training_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_one_or_other CHECK (
    (fixture_id IS NOT NULL AND training_id IS NULL) OR
    (fixture_id IS NULL AND training_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_availability_player_fixture
  ON public.availability(player_id, fixture_id)
  WHERE fixture_id IS NOT NULL;

CREATE UNIQUE INDEX idx_availability_player_training
  ON public.availability(player_id, training_id)
  WHERE training_id IS NOT NULL;

CREATE INDEX idx_availability_player_id ON public.availability(player_id);

CREATE TABLE public.league_table_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  team_name text NOT NULL,
  played integer NOT NULL DEFAULT 0 CHECK (played >= 0),
  won integer NOT NULL DEFAULT 0 CHECK (won >= 0),
  drawn integer NOT NULL DEFAULT 0 CHECK (drawn >= 0),
  lost integer NOT NULL DEFAULT 0 CHECK (lost >= 0),
  goals_for integer NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against integer NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  goal_difference integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  last_scraped_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_league_table_cache_season_team
  ON public.league_table_cache(season, team_name);

CREATE INDEX idx_league_table_cache_season_position
  ON public.league_table_cache(season, position);

CREATE TABLE public.squad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  squad_number integer CHECK (squad_number IS NULL OR (squad_number >= 1 AND squad_number <= 99)),
  position text,
  joined_date date,
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_squad_active ON public.squad(active);

-- =============================================================================
-- Row Level Security (reads open; writes via RPC in 003_passcode_auth.sql)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_table_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profile fields readable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "No direct profile write" ON public.profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct profile update" ON public.profiles FOR UPDATE USING (false);

CREATE POLICY "Fixtures are publicly readable" ON public.fixtures FOR SELECT USING (true);
CREATE POLICY "No direct fixture write" ON public.fixtures FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct fixture update" ON public.fixtures FOR UPDATE USING (false);
CREATE POLICY "No direct fixture delete" ON public.fixtures FOR DELETE USING (false);

CREATE POLICY "Results are publicly readable" ON public.results FOR SELECT USING (true);
CREATE POLICY "No direct results write" ON public.results FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct results update" ON public.results FOR UPDATE USING (false);
CREATE POLICY "No direct results delete" ON public.results FOR DELETE USING (false);

CREATE POLICY "Match events are publicly readable" ON public.match_events FOR SELECT USING (true);
CREATE POLICY "No direct match events write" ON public.match_events FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct match events update" ON public.match_events FOR UPDATE USING (false);
CREATE POLICY "No direct match events delete" ON public.match_events FOR DELETE USING (false);

CREATE POLICY "Training sessions are publicly readable" ON public.training_sessions FOR SELECT USING (true);
CREATE POLICY "No direct training write" ON public.training_sessions FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct training update" ON public.training_sessions FOR UPDATE USING (false);
CREATE POLICY "No direct training delete" ON public.training_sessions FOR DELETE USING (false);

CREATE POLICY "Availability is publicly readable" ON public.availability FOR SELECT USING (true);
CREATE POLICY "No direct availability write" ON public.availability FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct availability update" ON public.availability FOR UPDATE USING (false);
CREATE POLICY "No direct availability delete" ON public.availability FOR DELETE USING (false);

CREATE POLICY "League table cache is publicly readable" ON public.league_table_cache FOR SELECT USING (true);
CREATE POLICY "No direct league table write" ON public.league_table_cache FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct league table update" ON public.league_table_cache FOR UPDATE USING (false);
CREATE POLICY "No direct league table delete" ON public.league_table_cache FOR DELETE USING (false);

CREATE POLICY "Squad is publicly readable" ON public.squad FOR SELECT USING (true);
CREATE POLICY "No direct squad write" ON public.squad FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct squad update" ON public.squad FOR UPDATE USING (false);
CREATE POLICY "No direct squad delete" ON public.squad FOR DELETE USING (false);

-- =============================================================================
-- Grants
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.fixtures TO anon, authenticated;
GRANT SELECT ON public.results TO anon, authenticated;
GRANT SELECT ON public.match_events TO anon, authenticated;
GRANT SELECT ON public.training_sessions TO anon, authenticated;
GRANT SELECT ON public.league_table_cache TO anon, authenticated;
GRANT SELECT ON public.squad TO anon, authenticated;
GRANT SELECT ON public.availability TO anon, authenticated;

REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, username, display_name, is_admin, is_committee, is_approved, created_at)
  ON public.profiles TO anon, authenticated;
