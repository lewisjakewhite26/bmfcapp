-- Persist in-progress live matchday logs (survives refresh / device change)

CREATE TABLE public.live_match_drafts (
  fixture_id uuid PRIMARY KEY REFERENCES public.fixtures(id) ON DELETE CASCADE,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals_for integer NOT NULL DEFAULT 0 CHECK (goals_for >= 0),
  goals_against integer NOT NULL DEFAULT 0 CHECK (goals_against >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_live_match_drafts_updated_at ON public.live_match_drafts(updated_at);

ALTER TABLE public.live_match_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct live draft access" ON public.live_match_drafts
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.admin_get_live_match_draft(
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
  row public.live_match_drafts%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fixtures
    WHERE id = p_fixture_id AND status = 'in_progress'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO row FROM public.live_match_drafts WHERE fixture_id = p_fixture_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'fixture_id', p_fixture_id,
      'entries', '[]'::json,
      'goals_for', 0,
      'goals_against', 0
    );
  END IF;

  RETURN json_build_object(
    'fixture_id', row.fixture_id,
    'entries', row.entries,
    'goals_for', row.goals_for,
    'goals_against', row.goals_against,
    'updated_at', row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_live_match_draft(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_entries json,
  p_goals_for integer,
  p_goals_against integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.fixtures
    WHERE id = p_fixture_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Fixture is not live';
  END IF;

  IF p_goals_for < 0 OR p_goals_against < 0 THEN
    RAISE EXCEPTION 'Invalid score';
  END IF;

  INSERT INTO public.live_match_drafts (fixture_id, entries, goals_for, goals_against, updated_at)
  VALUES (p_fixture_id, COALESCE(p_entries, '[]'::json), p_goals_for, p_goals_against, now())
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    entries = EXCLUDED.entries,
    goals_for = EXCLUDED.goals_for,
    goals_against = EXCLUDED.goals_against,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_live_match_draft(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.live_match_drafts WHERE fixture_id = p_fixture_id;
END;
$$;

-- Clear draft when match is finalised
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

  DELETE FROM public.live_match_drafts WHERE fixture_id = p_fixture_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_live_match_draft TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_live_match_draft TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_live_match_draft TO anon, authenticated;
