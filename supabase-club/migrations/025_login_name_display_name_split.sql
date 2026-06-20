-- Split login identifier (ChrisL) from UI display name (Chris L)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_login_name_lower
  ON public.profiles (lower(login_name))
  WHERE login_name IS NOT NULL;

-- Preserve existing logins before recomputing display names
UPDATE public.profiles
SET login_name = display_name
WHERE login_name IS NULL AND display_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.format_player_login_name(p_first_name text, p_last_name text)
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

CREATE OR REPLACE FUNCTION public.format_player_display_name(p_first_name text, p_last_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN public.normalize_name_part(p_first_name) = ''
        OR public.normalize_name_part(p_last_name) = '' THEN ''
      ELSE public.normalize_name_part(p_first_name) || ' ' ||
        upper(left(public.normalize_name_part(p_last_name), 1))
    END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_player_login_name(
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
  base := public.format_player_login_name(p_first_name, p_last_name);
  IF base = '' THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(login_name) = lower(candidate)
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  ) LOOP
    candidate := base || n::text;
    n := n + 1;
  END LOOP;

  RETURN candidate;
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

CREATE OR REPLACE FUNCTION public.apply_player_names(
  p_profile_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_first text;
  v_last text;
BEGIN
  v_first := public.normalize_name_part(p_first_name);
  v_last := public.normalize_name_part(p_last_name);

  IF v_first = '' OR length(v_first) > 40 OR v_first !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'First name must be 1–40 letters';
  END IF;

  IF v_last = '' OR length(v_last) > 40 OR v_last !~ '^[a-zA-Z][a-zA-Z'' -]*$' THEN
    RAISE EXCEPTION 'Last name must be 1–40 letters';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(first_name) = lower(v_first)
      AND lower(last_name) = lower(v_last)
      AND id <> p_profile_id
  ) THEN
    RAISE EXCEPTION 'Someone with that name is already registered';
  END IF;

  UPDATE public.profiles
  SET
    first_name = v_first,
    last_name = v_last,
    login_name = public.allocate_player_login_name(v_first, v_last, p_profile_id),
    display_name = public.allocate_player_display_name(v_first, v_last, p_profile_id),
    username = public.allocate_player_username(v_first, v_last, p_profile_id)
  WHERE id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.login_user(p_display_name text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE lower(login_name) = lower(trim(p_display_name));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid name or passcode';
  END IF;

  IF found_user.passcode_hash IS NULL
     OR found_user.passcode_hash != crypt(p_passcode, found_user.passcode_hash) THEN
    RAISE EXCEPTION 'Invalid name or passcode';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.profiles SET session_token = v_token WHERE id = found_user.id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_approved', found_user.is_approved,
    'session_token', v_token
  );
END;
$$;

-- Backfill spaced display names only; login_name already preserved from copy above
DO $$
DECLARE
  row public.profiles%ROWTYPE;
BEGIN
  FOR row IN
    SELECT * FROM public.profiles
    WHERE first_name IS NOT NULL AND last_name IS NOT NULL
  LOOP
    BEGIN
      UPDATE public.profiles
      SET display_name = public.allocate_player_display_name(
        row.first_name,
        row.last_name,
        row.id
      )
      WHERE id = row.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END;
$$;
