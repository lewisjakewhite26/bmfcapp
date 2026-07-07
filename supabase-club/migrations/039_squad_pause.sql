-- Player pause: freezes fines automation (no-vote, reminders, weekly late fees).

ALTER TABLE public.squad
  ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

CREATE OR REPLACE FUNCTION public.squad_is_paused(p_player_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT sq.paused
      FROM public.squad sq
      WHERE sq.player_id = p_player_id
        AND sq.active = true
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_player_pause(
  p_admin_id uuid,
  p_session_token text,
  p_profile_id uuid,
  p_paused boolean,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  row public.squad%ROWTYPE;
BEGIN
  actor := public.assert_fines_admin(p_admin_id, p_session_token);

  UPDATE public.squad sq
  SET
    paused = p_paused,
    paused_reason = CASE WHEN p_paused THEN nullif(trim(p_reason), '') ELSE NULL END,
    paused_at = CASE WHEN p_paused THEN now() ELSE NULL END
  WHERE sq.player_id = p_profile_id
    AND sq.active = true
  RETURNING * INTO row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid squad member';
  END IF;

  RETURN json_build_object(
    'profile_id', row.player_id,
    'paused', row.paused,
    'paused_reason', row.paused_reason,
    'paused_at', row.paused_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_player_pause(uuid, text, uuid, boolean, text) TO anon, authenticated;

-- Re-apply pause filter to weekly late fees.
CREATE OR REPLACE FUNCTION public.apply_fine_late_fees()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_late_fee constant numeric := 2;
  v_iso_year int;
  v_iso_week int;
  v_session_id uuid;
  v_title text;
  v_week_start date;
  v_charged int := 0;
  v_total numeric := 0;
  v_charges jsonb := '[]'::jsonb;
  v_player record;
BEGIN
  v_iso_year := extract(isoyear FROM CURRENT_DATE)::int;
  v_iso_week := extract(week FROM CURRENT_DATE)::int;

  IF EXISTS (
    SELECT 1
    FROM public.fine_late_fee_runs_weekly r
    WHERE r.period_year = v_iso_year AND r.period_week = v_iso_week
  ) THEN
    RETURN json_build_object(
      'period_year', v_iso_year,
      'period_week', v_iso_week,
      'players_charged', 0,
      'total_amount', 0,
      'charges', '[]'::json
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fine_entries e
    WHERE NOT e.paid
      AND e.due_date < CURRENT_DATE
      AND NOT public.squad_is_paused(e.profile_id)
  ) THEN
    INSERT INTO public.fine_late_fee_runs_weekly (period_year, period_week, players_charged, total_amount)
    VALUES (v_iso_year, v_iso_week, 0, 0);
    RETURN json_build_object(
      'period_year', v_iso_year,
      'period_week', v_iso_week,
      'players_charged', 0,
      'total_amount', 0,
      'charges', '[]'::json
    );
  END IF;

  SELECT id INTO v_actor
  FROM public.profiles
  WHERE is_admin OR is_committee
  ORDER BY is_admin DESC, created_at ASC
  LIMIT 1;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No admin profile found for fine late fees';
  END IF;

  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  v_title := format('Late payment fees - w/c %s', to_char(v_week_start, 'DD Mon YYYY'));

  SELECT id INTO v_session_id
  FROM public.fine_sessions
  WHERE title = v_title
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.fine_sessions (session_date, title, notes, logged_by)
    VALUES (v_week_start, v_title, 'Auto-generated weekly late payment fees', v_actor)
    RETURNING id INTO v_session_id;
  END IF;

  INSERT INTO public.fine_entries (
    session_id,
    profile_id,
    fine_key,
    label,
    amount,
    logged_by,
    due_date
  )
  SELECT
    v_session_id,
    owing.profile_id,
    'late_fee',
    'Late payment fee',
    v_late_fee,
    v_actor,
    CURRENT_DATE
  FROM (
    SELECT DISTINCT e.profile_id
    FROM public.fine_entries e
    WHERE NOT e.paid
      AND e.due_date < CURRENT_DATE
      AND NOT public.squad_is_paused(e.profile_id)
  ) owing
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.fine_entries existing
    WHERE existing.session_id = v_session_id
      AND existing.profile_id = owing.profile_id
      AND existing.fine_key = 'late_fee'
  )
  ON CONFLICT (session_id, profile_id, fine_key) DO NOTHING;

  GET DIAGNOSTICS v_charged = ROW_COUNT;
  v_total := v_charged * v_late_fee;

  INSERT INTO public.fine_late_fee_runs_weekly (
    period_year,
    period_week,
    players_charged,
    total_amount
  )
  VALUES (v_iso_year, v_iso_week, v_charged, v_total);

  FOR v_player IN
    SELECT
      e.profile_id,
      (
        SELECT COALESCE(SUM(fe.amount), 0)::numeric
        FROM public.fine_entries fe
        WHERE fe.profile_id = e.profile_id
          AND NOT fe.paid
      ) AS total_owed
    FROM public.fine_entries e
    WHERE e.session_id = v_session_id
      AND e.fine_key = 'late_fee'
      AND e.created_at >= now() - interval '1 minute'
    GROUP BY e.profile_id
  LOOP
    v_charges := v_charges || jsonb_build_object(
      'profile_id', v_player.profile_id,
      'total_owed', v_player.total_owed
    );
  END LOOP;

  RETURN json_build_object(
    'period_year', v_iso_year,
    'period_week', v_iso_week,
    'players_charged', v_charged,
    'total_amount', v_total,
    'charges', v_charges
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_fine_late_fees() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_fine_late_fees() TO service_role;
