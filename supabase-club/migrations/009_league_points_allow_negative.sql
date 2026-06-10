-- DDSFL teams can have point deductions (negative totals).
ALTER TABLE public.league_table_cache
  DROP CONSTRAINT IF EXISTS league_table_cache_points_check;
