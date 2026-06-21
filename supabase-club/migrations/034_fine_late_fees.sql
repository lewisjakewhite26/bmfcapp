-- Monthly late payment fees: £2 per player still owing after the last Sunday of each month.
-- Scheduled via GitHub Actions: .github/workflows/apply-fine-late-fees.yml (npm run apply:fine-late-fees)
-- Optional: pg_cron block below if you prefer in-database scheduling instead.

CREATE TABLE public.fine_late_fee_runs (
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  players_charged int NOT NULL DEFAULT 0 CHECK (players_charged >= 0),
  total_amount numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (period_year, period_month)
);

ALTER TABLE public.fine_late_fee_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct fine_late_fee_runs access"
  ON public.fine_late_fee_runs
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.fine_last_sunday_of_month(p_year int, p_month int)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  WITH bounds AS (
    SELECT (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS last_day
  )
  SELECT (last_day - extract(dow FROM last_day)::int)::date
  FROM bounds;
$$;

CREATE OR REPLACE FUNCTION public.apply_fine_late_fees()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_late_fee constant numeric := 2;
  v_period record;
  v_deadline date;
  v_session_id uuid;
  v_title text;
  v_charged int;
  v_total numeric;
  v_run_count int := 0;
  v_player_count int := 0;
  v_runs jsonb := '[]'::jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fine_entries) THEN
    RETURN json_build_object(
      'periods_processed', 0,
      'players_charged', 0,
      'runs', '[]'::json
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

  FOR v_period IN
    WITH first_month AS (
      SELECT date_trunc('month', min(created_at))::date AS month_start
      FROM public.fine_entries
    ),
    months AS (
      SELECT gs::date AS month_start
      FROM first_month f,
      generate_series(
        f.month_start,
        date_trunc('month', CURRENT_DATE)::date,
        interval '1 month'
      ) AS gs
    )
    SELECT
      extract(year FROM m.month_start)::int AS yr,
      extract(month FROM m.month_start)::int AS mo
    FROM months m
    WHERE public.fine_last_sunday_of_month(
      extract(year FROM m.month_start)::int,
      extract(month FROM m.month_start)::int
    ) < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1
        FROM public.fine_late_fee_runs r
        WHERE r.period_year = extract(year FROM m.month_start)::int
          AND r.period_month = extract(month FROM m.month_start)::int
      )
    ORDER BY 1, 2
  LOOP
    v_deadline := public.fine_last_sunday_of_month(v_period.yr, v_period.mo);
    v_title := format(
      'Late payment fees - %s %s',
      to_char(make_date(v_period.yr, v_period.mo, 1), 'Mon'),
      v_period.yr
    );

    SELECT id INTO v_session_id
    FROM public.fine_sessions
    WHERE title = v_title
    LIMIT 1;

    IF v_session_id IS NULL THEN
      INSERT INTO public.fine_sessions (session_date, title, notes, logged_by)
      VALUES (
        v_deadline,
        v_title,
        'Auto-generated late payment fees',
        v_actor
      )
      RETURNING id INTO v_session_id;
    END IF;

    INSERT INTO public.fine_entries (
      session_id,
      profile_id,
      fine_key,
      label,
      amount,
      logged_by
    )
    SELECT
      v_session_id,
      owing.profile_id,
      'late_fee',
      'Late payment fee',
      v_late_fee,
      v_actor
    FROM (
      SELECT DISTINCT profile_id
      FROM public.fine_entries
      WHERE NOT paid
        AND created_at::date <= v_deadline
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

    INSERT INTO public.fine_late_fee_runs (
      period_year,
      period_month,
      players_charged,
      total_amount
    )
    VALUES (v_period.yr, v_period.mo, v_charged, v_total);

    v_run_count := v_run_count + 1;
    v_player_count := v_player_count + v_charged;

    v_runs := v_runs || jsonb_build_object(
      'period', format('%s-%02s', v_period.yr, v_period.mo),
      'players_charged', v_charged,
      'total_amount', v_total
    );
  END LOOP;

  RETURN json_build_object(
    'periods_processed', v_run_count,
    'players_charged', v_player_count,
    'runs', v_runs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_fine_late_fees() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_fine_late_fees() TO service_role;

-- Schedule daily run when pg_cron is enabled (Supabase Dashboard → Database → Extensions).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apply-fine-late-fees') THEN
      PERFORM cron.unschedule(j.jobid)
      FROM cron.job j
      WHERE j.jobname = 'apply-fine-late-fees';
    END IF;

    PERFORM cron.schedule(
      'apply-fine-late-fees',
      '5 0 * * *',
      $$SELECT public.apply_fine_late_fees()$$
    );
  END IF;
END $cron$;

-- Manual test (SQL editor or Edge Function):
-- SELECT public.apply_fine_late_fees();
--
-- Optional Edge Function deploy (same RPC, useful for logs / manual invoke):
-- supabase functions deploy apply-fine-late-fees --project-ref YOUR_REF
