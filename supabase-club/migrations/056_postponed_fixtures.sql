-- Postponed fixtures: let admins mark a game as postponed (with a reason)
-- instead of being forced to enter a score, and put it back on the calendar
-- once it has been rearranged.

ALTER TABLE public.fixtures
  ADD COLUMN IF NOT EXISTS postponed_reason text;

CREATE OR REPLACE FUNCTION public.admin_set_fixture_postponed(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_postponed boolean,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target public.fixtures%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO target FROM public.fixtures WHERE id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF p_postponed THEN
    -- A postponed game has no score: clear anything saved by mistake
    -- (e.g. a placeholder 0-0) so it can't count towards the table or stats.
    DELETE FROM public.match_events WHERE fixture_id = p_fixture_id;
    DELETE FROM public.results WHERE fixture_id = p_fixture_id;
    DELETE FROM public.live_match_drafts WHERE fixture_id = p_fixture_id;

    UPDATE public.fixtures
    SET status = 'postponed',
        postponed_reason = NULLIF(trim(coalesce(p_reason, '')), '')
    WHERE id = p_fixture_id;
  ELSE
    IF target.status <> 'postponed' THEN
      RAISE EXCEPTION 'Fixture is not postponed';
    END IF;

    UPDATE public.fixtures
    SET status = 'scheduled',
        postponed_reason = NULL
    WHERE id = p_fixture_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_fixture_postponed TO anon, authenticated;
