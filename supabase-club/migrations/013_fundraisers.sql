-- Fundraiser events and squad participation (admin/committee only via RPC)

CREATE TABLE public.fundraisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fundraisers_date ON public.fundraisers(date DESC);

CREATE TABLE public.fundraiser_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraiser_id uuid NOT NULL REFERENCES public.fundraisers(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participated boolean NOT NULL DEFAULT false,
  UNIQUE (fundraiser_id, profile_id)
);

CREATE INDEX idx_fundraiser_participation_fundraiser
  ON public.fundraiser_participation(fundraiser_id);

ALTER TABLE public.fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraiser_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct fundraisers read" ON public.fundraisers FOR SELECT USING (false);
CREATE POLICY "No direct fundraisers write" ON public.fundraisers FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct fundraisers update" ON public.fundraisers FOR UPDATE USING (false);
CREATE POLICY "No direct fundraisers delete" ON public.fundraisers FOR DELETE USING (false);

CREATE POLICY "No direct fundraiser participation read" ON public.fundraiser_participation FOR SELECT USING (false);
CREATE POLICY "No direct fundraiser participation write" ON public.fundraiser_participation FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct fundraiser participation update" ON public.fundraiser_participation FOR UPDATE USING (false);
CREATE POLICY "No direct fundraiser participation delete" ON public.fundraiser_participation FOR DELETE USING (false);

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
      SELECT json_agg(row_to_json(f) ORDER BY f.date DESC, f.created_at DESC)
      FROM public.fundraisers f
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_fundraiser(
  p_admin_id uuid,
  p_session_token text,
  p_name text,
  p_date date,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_name text;
  row public.fundraisers%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_name := trim(p_name);
  IF v_name = '' OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Name must be 1–120 characters';
  END IF;

  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Date is required';
  END IF;

  INSERT INTO public.fundraisers (name, date, notes)
  VALUES (v_name, p_date, nullif(trim(p_notes), ''))
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_fundraiser_participation(
  p_admin_id uuid,
  p_session_token text,
  p_fundraiser_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  fundraiser_row public.fundraisers%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO fundraiser_row
  FROM public.fundraisers
  WHERE id = p_fundraiser_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fundraiser not found';
  END IF;

  RETURN json_build_object(
    'fundraiser', row_to_json(fundraiser_row),
    'participants', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'profile_id', s.player_id,
            'display_name', p.display_name,
            'participated', COALESCE(fp.participated, false)
          )
          ORDER BY p.display_name
        )
        FROM public.squad s
        JOIN public.profiles p ON p.id = s.player_id
        LEFT JOIN public.fundraiser_participation fp
          ON fp.fundraiser_id = p_fundraiser_id AND fp.profile_id = s.player_id
        WHERE s.active = true
      ),
      '[]'::json
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_fundraiser_participation(
  p_admin_id uuid,
  p_session_token text,
  p_fundraiser_id uuid,
  p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  entry jsonb;
  v_profile_id uuid;
  v_participated boolean;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fundraisers WHERE id = p_fundraiser_id) THEN
    RAISE EXCEPTION 'Fundraiser not found';
  END IF;

  IF jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'entries must be a JSON array';
  END IF;

  FOR entry IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_profile_id := (entry->>'profile_id')::uuid;
    v_participated := COALESCE((entry->>'participated')::boolean, false);

    IF NOT EXISTS (
      SELECT 1 FROM public.squad s
      WHERE s.player_id = v_profile_id AND s.active = true
    ) THEN
      RAISE EXCEPTION 'Invalid squad member';
    END IF;

    INSERT INTO public.fundraiser_participation (fundraiser_id, profile_id, participated)
    VALUES (p_fundraiser_id, v_profile_id, v_participated)
    ON CONFLICT (fundraiser_id, profile_id) DO UPDATE
    SET participated = EXCLUDED.participated;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_fundraisers TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_fundraiser TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_fundraiser_participation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_fundraiser_participation TO anon, authenticated;
