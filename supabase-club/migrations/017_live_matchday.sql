-- Live matchday logging: in_progress fixtures, substitutions, squad numbers

-- ---------------------------------------------------------------------------
-- Fixture status: add in_progress
-- ---------------------------------------------------------------------------

ALTER TABLE public.fixtures DROP CONSTRAINT IF EXISTS fixtures_status_check;

ALTER TABLE public.fixtures
  ADD CONSTRAINT fixtures_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Match events: substitutions (player off + related player on)
-- ---------------------------------------------------------------------------

ALTER TABLE public.match_events
  ADD COLUMN IF NOT EXISTS related_player_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN (
    'goal', 'assist', 'motm', 'yellow_card', 'red_card', 'substitution'
  ));

-- ---------------------------------------------------------------------------
-- Squad shirt numbers on upsert
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_upsert_squad(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_position text,
  p_joined_date date DEFAULT NULL,
  p_squad_number integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.squad%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF p_squad_number IS NOT NULL AND (p_squad_number < 1 OR p_squad_number > 99) THEN
    RAISE EXCEPTION 'Squad number must be between 1 and 99';
  END IF;

  INSERT INTO public.squad (player_id, position, joined_date, active, squad_number)
  VALUES (
    p_player_id,
    NULLIF(trim(p_position), ''),
    COALESCE(p_joined_date, CURRENT_DATE),
    true,
    p_squad_number
  )
  ON CONFLICT (player_id)
  DO UPDATE SET
    position = EXCLUDED.position,
    joined_date = COALESCE(EXCLUDED.joined_date, squad.joined_date),
    squad_number = EXCLUDED.squad_number,
    active = true
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

-- ---------------------------------------------------------------------------
-- Start live match (manual fixtures only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_start_live_match(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.fixtures%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO row FROM public.fixtures WHERE id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF row.ddsfl_fixture_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only manually added fixtures can go live here';
  END IF;

  IF row.status NOT IN ('scheduled', 'in_progress') THEN
    RAISE EXCEPTION 'Fixture cannot go live';
  END IF;

  UPDATE public.fixtures
  SET status = 'in_progress'
  WHERE id = p_fixture_id
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

-- ---------------------------------------------------------------------------
-- Submit result (supports related_player_id for substitutions)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_submit_match_result(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_goals_for integer,
  p_goals_against integer,
  p_notes text,
  p_events json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  ev json;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.results (fixture_id, goals_for, goals_against, notes)
  VALUES (p_fixture_id, p_goals_for, p_goals_against, p_notes)
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    goals_for = EXCLUDED.goals_for,
    goals_against = EXCLUDED.goals_against,
    notes = EXCLUDED.notes;

  DELETE FROM public.match_events WHERE fixture_id = p_fixture_id;

  IF p_events IS NOT NULL AND json_array_length(p_events) > 0 THEN
    FOR ev IN SELECT * FROM json_array_elements(p_events) LOOP
      INSERT INTO public.match_events (fixture_id, player_id, event_type, minute, related_player_id)
      VALUES (
        p_fixture_id,
        (ev->>'player_id')::uuid,
        ev->>'event_type',
        NULLIF(ev->>'minute', '')::integer,
        NULLIF(ev->>'related_player_id', '')::uuid
      );
    END LOOP;
  END IF;

  UPDATE public.fixtures SET status = 'completed' WHERE id = p_fixture_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_start_live_match TO anon, authenticated;
