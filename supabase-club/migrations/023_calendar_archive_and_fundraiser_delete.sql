-- Archive club events & fundraisers; allow permanent fundraiser delete; public calendar read for fundraisers

ALTER TABLE public.club_events
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.fundraisers
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_club_events_archived ON public.club_events (archived);
CREATE INDEX IF NOT EXISTS idx_fundraisers_archived ON public.fundraisers (archived);

-- Non-archived fundraisers visible on squad calendar (club_events already publicly readable)
DROP POLICY IF EXISTS "No direct fundraisers read" ON public.fundraisers;
CREATE POLICY "Fundraisers readable when not archived" ON public.fundraisers
  FOR SELECT USING (archived = false);

CREATE OR REPLACE FUNCTION public.admin_set_club_event_archived(
  p_admin_id uuid,
  p_session_token text,
  p_event_id uuid,
  p_archived boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.club_events%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.club_events
  SET archived = COALESCE(p_archived, false)
  WHERE id = p_event_id
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_fundraiser_archived(
  p_admin_id uuid,
  p_session_token text,
  p_fundraiser_id uuid,
  p_archived boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.fundraisers%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.fundraisers
  SET archived = COALESCE(p_archived, false)
  WHERE id = p_fundraiser_id
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fundraiser not found';
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_fundraiser(
  p_admin_id uuid,
  p_session_token text,
  p_fundraiser_id uuid
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

  DELETE FROM public.fundraisers WHERE id = p_fundraiser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fundraiser not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_fundraisers(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
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

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(f) ORDER BY f.archived ASC, f.date DESC, f.created_at DESC)
      FROM public.fundraisers f
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fundraiser_participation_summary(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_total bigint;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT count(*) INTO v_total FROM public.fundraisers WHERE archived = false;

  RETURN json_build_object(
    'total_fundraisers', v_total,
    'members', COALESCE(
      (
        SELECT json_agg(member_row ORDER BY member_row.participated_count ASC, member_row.display_name ASC)
        FROM (
          SELECT
            s.player_id AS profile_id,
            p.display_name,
            v_total::int AS total_fundraisers,
            COUNT(*) FILTER (WHERE fp.participated = true AND fr.id IS NOT NULL)::int AS participated_count
          FROM public.squad s
          JOIN public.profiles p ON p.id = s.player_id
          LEFT JOIN public.fundraiser_participation fp ON fp.profile_id = s.player_id
          LEFT JOIN public.fundraisers fr ON fr.id = fp.fundraiser_id AND fr.archived = false
          WHERE s.active = true
          GROUP BY s.player_id, p.display_name
        ) member_row
      ),
      '[]'::json
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_club_event_archived TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_fundraiser_archived TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_fundraiser TO anon, authenticated;
