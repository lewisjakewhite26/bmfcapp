-- Goalkeeper clean-sheet attribution: manual override + live log snapshot on result save

ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS goalkeeper_player_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS live_log_entries jsonb;

CREATE INDEX IF NOT EXISTS idx_results_goalkeeper_player_id ON public.results(goalkeeper_player_id);

CREATE OR REPLACE FUNCTION public.admin_submit_match_result(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_goals_for integer,
  p_goals_against integer,
  p_notes text,
  p_events json,
  p_goalkeeper_player_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  ev json;
  draft_entries jsonb;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT entries INTO draft_entries
  FROM public.live_match_drafts
  WHERE fixture_id = p_fixture_id;

  INSERT INTO public.results (fixture_id, goals_for, goals_against, notes, goalkeeper_player_id, live_log_entries)
  VALUES (p_fixture_id, p_goals_for, p_goals_against, p_notes, p_goalkeeper_player_id, draft_entries)
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    goals_for = EXCLUDED.goals_for,
    goals_against = EXCLUDED.goals_against,
    notes = EXCLUDED.notes,
    goalkeeper_player_id = EXCLUDED.goalkeeper_player_id,
    live_log_entries = COALESCE(EXCLUDED.live_log_entries, public.results.live_log_entries);

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
