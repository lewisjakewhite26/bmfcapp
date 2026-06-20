-- Admin purge of fixtures before a cutoff date (includes DDSFL-synced rows).
-- Cascades to results, match_events, availability, lineups, and live drafts.

CREATE OR REPLACE FUNCTION public.admin_purge_fixtures_before(
  p_admin_id uuid,
  p_session_token text,
  p_cutoff timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  deleted_count integer;
  deleted_ids uuid[];
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT array_agg(id ORDER BY match_date)
  INTO deleted_ids
  FROM public.fixtures
  WHERE match_date < p_cutoff;

  IF deleted_ids IS NULL OR array_length(deleted_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('deleted_count', 0, 'fixture_ids', '[]'::jsonb);
  END IF;

  DELETE FROM public.fixtures
  WHERE id = ANY(deleted_ids);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_count', deleted_count,
    'fixture_ids', to_jsonb(deleted_ids)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_purge_fixtures_before TO anon, authenticated;
