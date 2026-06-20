-- Display name format: ChrisL (no space, no period). Collision: ChrisL2, ChrisL3, …

CREATE OR REPLACE FUNCTION public.format_player_display_name(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN public.normalize_name_part(p_first_name) = ''
        OR public.normalize_name_part(p_last_name) = '' THEN ''
      ELSE public.normalize_name_part(p_first_name) ||
        upper(left(public.normalize_name_part(p_last_name), 1))
    END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_player_display_name(
  p_first_name text,
  p_last_name text,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 2;
BEGIN
  base := public.format_player_display_name(p_first_name, p_last_name);
  IF base = '' THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(display_name) = lower(candidate)
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  ) LOOP
    candidate := base || n::text;
    n := n + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Recompute display names for players who already completed onboarding
DO $$
DECLARE
  row public.profiles%ROWTYPE;
BEGIN
  FOR row IN
    SELECT * FROM public.profiles
    WHERE first_name IS NOT NULL AND last_name IS NOT NULL
  LOOP
    BEGIN
      PERFORM public.apply_player_names(row.id, row.first_name, row.last_name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;
