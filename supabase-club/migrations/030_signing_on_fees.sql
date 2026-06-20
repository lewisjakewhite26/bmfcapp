-- Signing-on fee tracker (finance admin/committee, per season)

CREATE TABLE public.signing_on_fees (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season text NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  marked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  marked_at timestamptz,
  PRIMARY KEY (profile_id, season)
);

CREATE INDEX idx_signing_on_fees_season ON public.signing_on_fees(season);

ALTER TABLE public.signing_on_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct signing_on_fees read" ON public.signing_on_fees FOR SELECT USING (false);
CREATE POLICY "No direct signing_on_fees write" ON public.signing_on_fees FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct signing_on_fees update" ON public.signing_on_fees FOR UPDATE USING (false);
CREATE POLICY "No direct signing_on_fees delete" ON public.signing_on_fees FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.admin_list_signing_on_fees(
  p_admin_id uuid,
  p_session_token text,
  p_season text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_season text;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_season := nullif(trim(p_season), '');
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'Season is required';
  END IF;

  RETURN json_build_object(
    'season', v_season,
    'members', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'profile_id', s.player_id,
            'display_name', p.display_name,
            'paid', COALESCE(f.paid, false),
            'marked_at', f.marked_at,
            'marked_by_name', mp.display_name
          )
          ORDER BY p.display_name
        )
        FROM public.squad s
        JOIN public.profiles p ON p.id = s.player_id
        LEFT JOIN public.signing_on_fees f
          ON f.profile_id = s.player_id AND f.season = v_season
        LEFT JOIN public.profiles mp ON mp.id = f.marked_by
        WHERE s.active = true
      ),
      '[]'::json
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_signing_on_paid(
  p_admin_id uuid,
  p_session_token text,
  p_profile_id uuid,
  p_season text,
  p_paid boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_season text;
  row public.signing_on_fees%ROWTYPE;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_season := nullif(trim(p_season), '');
  IF v_season IS NULL THEN
    RAISE EXCEPTION 'Season is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.squad s
    WHERE s.player_id = p_profile_id AND s.active = true
  ) THEN
    RAISE EXCEPTION 'Invalid squad member';
  END IF;

  INSERT INTO public.signing_on_fees (profile_id, season, paid, marked_by, marked_at)
  VALUES (
    p_profile_id,
    v_season,
    COALESCE(p_paid, false),
    actor.id,
    CASE WHEN COALESCE(p_paid, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (profile_id, season) DO UPDATE
  SET
    paid = EXCLUDED.paid,
    marked_by = CASE WHEN EXCLUDED.paid THEN actor.id ELSE NULL END,
    marked_at = CASE WHEN EXCLUDED.paid THEN now() ELSE NULL END;

  SELECT * INTO row
  FROM public.signing_on_fees
  WHERE profile_id = p_profile_id AND season = v_season;

  RETURN json_build_object(
    'profile_id', row.profile_id,
    'paid', row.paid,
    'marked_at', row.marked_at,
    'marked_by_name', actor.display_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_signing_on_fees(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_signing_on_paid(uuid, text, uuid, text, boolean) TO anon, authenticated;
