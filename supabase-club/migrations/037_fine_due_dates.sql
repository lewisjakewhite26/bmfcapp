-- Per-fine due dates with penultimate-Sunday grace window (26/27 fines rework).

CREATE OR REPLACE FUNCTION public.fine_due_date(p_created date)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  WITH bounds AS (
    SELECT
      extract(year FROM p_created)::int AS yr,
      extract(month FROM p_created)::int AS mo,
      public.fine_last_sunday_of_month(
        extract(year FROM p_created)::int,
        extract(month FROM p_created)::int
      ) AS ls
  ),
  next_month AS (
    SELECT (make_date(b.yr, b.mo, 1) + interval '1 month')::date AS d
    FROM bounds b
  )
  SELECT CASE
    WHEN p_created <= (b.ls - 7) THEN b.ls
    ELSE public.fine_last_sunday_of_month(
      extract(year FROM nm.d)::int,
      extract(month FROM nm.d)::int
    )
  END
  FROM bounds b
  CROSS JOIN next_month nm;
$$;

ALTER TABLE public.fine_entries
  ADD COLUMN IF NOT EXISTS due_date date;

UPDATE public.fine_entries
SET due_date = public.fine_due_date(created_at::date)
WHERE due_date IS NULL;

ALTER TABLE public.fine_entries
  ALTER COLUMN due_date SET NOT NULL;

CREATE OR REPLACE FUNCTION public.fine_entries_set_due_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.due_date IS NULL THEN
    IF NEW.fine_key = 'late_fee' THEN
      NEW.due_date := COALESCE(NEW.created_at, now())::date;
    ELSE
      NEW.due_date := public.fine_due_date(COALESCE(NEW.created_at, now())::date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fine_entries_due_date ON public.fine_entries;
CREATE TRIGGER trg_fine_entries_due_date
  BEFORE INSERT ON public.fine_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fine_entries_set_due_date();
