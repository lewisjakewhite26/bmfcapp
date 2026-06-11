-- Saved match lineups (formation + player slots per fixture)

CREATE TABLE public.lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id uuid NOT NULL UNIQUE REFERENCES public.fixtures(id) ON DELETE CASCADE,
  formation text NOT NULL,
  slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lineups_fixture_id ON public.lineups(fixture_id);

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lineups are publicly readable" ON public.lineups FOR SELECT USING (true);
CREATE POLICY "No direct lineups write" ON public.lineups FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct lineups update" ON public.lineups FOR UPDATE USING (false);
CREATE POLICY "No direct lineups delete" ON public.lineups FOR DELETE USING (false);

GRANT SELECT ON public.lineups TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_lineup(
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
  row public.lineups%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO row FROM public.lineups WHERE fixture_id = p_fixture_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_lineup(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_formation text,
  p_slots jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.lineups%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fixtures WHERE id = p_fixture_id) THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  IF p_formation NOT IN ('4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2') THEN
    RAISE EXCEPTION 'Invalid formation';
  END IF;

  IF jsonb_typeof(p_slots) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'slots must be a JSON array';
  END IF;

  INSERT INTO public.lineups (fixture_id, formation, slots)
  VALUES (p_fixture_id, p_formation, p_slots)
  ON CONFLICT (fixture_id) DO UPDATE
  SET
    formation = EXCLUDED.formation,
    slots = EXCLUDED.slots,
    updated_at = now()
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_lineup TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_lineup TO anon, authenticated;
