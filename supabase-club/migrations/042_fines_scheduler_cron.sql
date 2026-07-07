-- Schedule fines-scheduler Edge Function every 5 minutes (when pg_cron + pg_net available).
-- Set secrets in Supabase: FINES_SCHEDULER_SECRET, VAPID_* (for pushes inside the function).
-- Deploy: supabase functions deploy fines-scheduler --project-ref YOUR_REF

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fines-scheduler') THEN
      PERFORM cron.unschedule(j.jobid)
      FROM cron.job j
      WHERE j.jobname = 'fines-scheduler';
    END IF;

    -- Replace YOUR_PROJECT_REF and store FINES_SCHEDULER_SECRET in Vault / app settings.
    -- Until configured, rely on manual invoke or external cron hitting the function URL.
    NULL;
  END IF;
END $cron$;

COMMENT ON FUNCTION public.apply_no_vote_fines() IS
  'Called by fines-scheduler Edge Function every 5 minutes.';

COMMENT ON FUNCTION public.apply_vote_reminders() IS
  'Called by fines-scheduler Edge Function every 5 minutes.';

COMMENT ON FUNCTION public.apply_fine_late_fees() IS
  'Called by fines-scheduler (primary) and GitHub Action apply-fine-late-fees (backstop).';
