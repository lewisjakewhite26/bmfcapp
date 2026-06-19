-- Club calendar events (socials, AGM, committee meetings, etc.)

CREATE TYPE public.club_event_type AS ENUM ('social', 'agm', 'committee', 'other');

CREATE TABLE public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type public.club_event_type NOT NULL DEFAULT 'other',
  event_date timestamptz NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_club_events_event_date ON public.club_events(event_date);

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club events are publicly readable" ON public.club_events FOR SELECT USING (true);
CREATE POLICY "No direct club event write" ON public.club_events FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct club event update" ON public.club_events FOR UPDATE USING (false);
CREATE POLICY "No direct club event delete" ON public.club_events FOR DELETE USING (false);

GRANT SELECT ON public.club_events TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_club_event(
  p_admin_id uuid,
  p_session_token text,
  p_title text,
  p_event_type public.club_event_type,
  p_event_date timestamptz,
  p_location text,
  p_notes text
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

  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  INSERT INTO public.club_events (title, event_type, event_date, location, notes)
  VALUES (
    trim(p_title),
    p_event_type,
    p_event_date,
    NULLIF(trim(p_location), ''),
    NULLIF(trim(p_notes), '')
  )
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_club_event(
  p_admin_id uuid,
  p_session_token text,
  p_event_id uuid,
  p_title text,
  p_event_type public.club_event_type,
  p_event_date timestamptz,
  p_location text,
  p_notes text
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

  IF trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  UPDATE public.club_events
  SET
    title = trim(p_title),
    event_type = p_event_type,
    event_date = p_event_date,
    location = NULLIF(trim(p_location), ''),
    notes = NULLIF(trim(p_notes), '')
  WHERE id = p_event_id
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_club_event(
  p_admin_id uuid,
  p_session_token text,
  p_event_id uuid
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

  DELETE FROM public.club_events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_club_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_club_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_club_event TO anon, authenticated;
