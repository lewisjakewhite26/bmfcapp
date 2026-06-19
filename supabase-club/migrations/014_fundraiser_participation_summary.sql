-- Aggregated fundraiser participation per squad member (admin/committee only)

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

  SELECT count(*) INTO v_total FROM public.fundraisers;

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
            COUNT(fp.id) FILTER (WHERE fp.participated = true)::int AS participated_count
          FROM public.squad s
          JOIN public.profiles p ON p.id = s.player_id
          LEFT JOIN public.fundraiser_participation fp ON fp.profile_id = s.player_id
          WHERE s.active = true
          GROUP BY s.player_id, p.display_name
        ) member_row
      ),
      '[]'::json
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_fundraiser_participation_summary TO anon, authenticated;
