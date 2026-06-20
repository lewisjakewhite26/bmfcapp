-- Allow 4-2-1-3 in saved lineups (flat back four, double pivot, #10, front three).

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

  IF p_formation NOT IN ('4-4-2', '4-3-3', '4-2-3-1', '4-2-1-3', '3-5-2', '5-3-2') THEN
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
