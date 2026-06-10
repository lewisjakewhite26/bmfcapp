-- BMFC Club Hub — passcode auth (name + 4-digit passcode, no email)
-- Run after 001_club_hub_schema.sql and 002_push_subscriptions.sql

-- Upgrade path only (skip harmlessly on fresh installs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passcode_hash text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_token text;

-- =============================================================================
-- Auth helpers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.slug_username(p_display_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base text;
  candidate text;
  n integer := 2;
BEGIN
  base := lower(regexp_replace(trim(p_display_name), '[^a-zA-Z0-9]+', '_', 'g'));
  base := trim(both '_' from base);
  IF base = '' THEN
    base := 'player';
  END IF;
  IF length(base) > 16 THEN
    base := left(base, 16);
  END IF;

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    candidate := base || '_' || n::text;
    n := n + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_session(p_user_id uuid, p_session_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND session_token = p_session_token
  );
$$;

CREATE OR REPLACE FUNCTION public.register_user(p_display_name text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_username text;
  v_token text;
  new_user public.profiles%ROWTYPE;
BEGIN
  v_display_name := trim(p_display_name);

  IF v_display_name = '' OR length(v_display_name) > 40 THEN
    RAISE EXCEPTION 'Name must be 1–40 characters';
  END IF;

  IF p_passcode !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'Passcode must be exactly 4 digits';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(display_name) = lower(v_display_name)
  ) THEN
    RAISE EXCEPTION 'That name is already registered';
  END IF;

  v_username := public.slug_username(v_display_name);
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.profiles (
    username, display_name, passcode_hash, session_token, is_approved
  )
  VALUES (
    v_username,
    v_display_name,
    crypt(p_passcode, gen_salt('bf')),
    v_token,
    false
  )
  RETURNING * INTO new_user;

  RETURN json_build_object(
    'id', new_user.id,
    'username', new_user.username,
    'display_name', new_user.display_name,
    'is_admin', new_user.is_admin,
    'is_committee', new_user.is_committee,
    'is_approved', new_user.is_approved,
    'session_token', v_token
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.login_user(p_display_name text, p_passcode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE lower(display_name) = lower(trim(p_display_name));

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

CREATE OR REPLACE FUNCTION public.get_session_user(p_user_id uuid, p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  IF NOT public.verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO found_user FROM public.profiles WHERE id = p_user_id;

  RETURN json_build_object(
    'id', found_user.id,
    'username', found_user.username,
    'display_name', found_user.display_name,
    'is_admin', found_user.is_admin,
    'is_committee', found_user.is_committee,
    'is_approved', found_user.is_approved,
    'session_token', p_session_token
  );
END;
$$;

-- =============================================================================
-- Session-gated writes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_availability(
  p_user_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_training_id uuid,
  p_status text,
  p_message text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
  row public.availability%ROWTYPE;
BEGIN
  IF NOT public.verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  SELECT * INTO found_user FROM public.profiles WHERE id = p_user_id;
  IF NOT found_user.is_approved THEN
    RAISE EXCEPTION 'Account not approved';
  END IF;

  IF p_status NOT IN ('yes', 'no', 'maybe') THEN
    RAISE EXCEPTION 'Invalid availability status';
  END IF;

  IF (p_fixture_id IS NULL) = (p_training_id IS NULL) THEN
    RAISE EXCEPTION 'Provide fixture or training, not both';
  END IF;

  IF p_fixture_id IS NOT NULL THEN
    SELECT * INTO row
    FROM public.availability
    WHERE player_id = p_user_id AND fixture_id = p_fixture_id;

    IF FOUND THEN
      UPDATE public.availability
      SET status = p_status, message = p_message
      WHERE id = row.id
      RETURNING * INTO row;
    ELSE
      INSERT INTO public.availability (player_id, fixture_id, training_id, status, message)
      VALUES (p_user_id, p_fixture_id, NULL, p_status, p_message)
      RETURNING * INTO row;
    END IF;
  ELSE
    SELECT * INTO row
    FROM public.availability
    WHERE player_id = p_user_id AND training_id = p_training_id;

    IF FOUND THEN
      UPDATE public.availability
      SET status = p_status, message = p_message
      WHERE id = row.id
      RETURNING * INTO row;
    ELSE
      INSERT INTO public.availability (player_id, fixture_id, training_id, status, message)
      VALUES (p_user_id, NULL, p_training_id, p_status, p_message)
      RETURNING * INTO row;
    END IF;
  END IF;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_profiles(p_admin_id uuid, p_session_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'id', id,
      'username', username,
      'display_name', display_name,
      'is_admin', is_admin,
      'is_committee', is_committee,
      'is_approved', is_approved,
      'created_at', created_at
    ) ORDER BY created_at)
    FROM public.profiles
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_approved(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid,
  p_approved boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
  SET is_approved = p_approved
  WHERE id = p_target_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_submit_match_result(
  p_admin_id uuid,
  p_session_token text,
  p_fixture_id uuid,
  p_goals_for integer,
  p_goals_against integer,
  p_notes text,
  p_events json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  ev json;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.results (fixture_id, goals_for, goals_against, notes)
  VALUES (p_fixture_id, p_goals_for, p_goals_against, p_notes)
  ON CONFLICT (fixture_id)
  DO UPDATE SET
    goals_for = EXCLUDED.goals_for,
    goals_against = EXCLUDED.goals_against,
    notes = EXCLUDED.notes;

  DELETE FROM public.match_events WHERE fixture_id = p_fixture_id;

  IF p_events IS NOT NULL AND json_array_length(p_events) > 0 THEN
    FOR ev IN SELECT * FROM json_array_elements(p_events) LOOP
      INSERT INTO public.match_events (fixture_id, player_id, event_type, minute)
      VALUES (
        p_fixture_id,
        (ev->>'player_id')::uuid,
        ev->>'event_type',
        NULLIF(ev->>'minute', '')::integer
      );
    END LOOP;
  END IF;

  UPDATE public.fixtures SET status = 'completed' WHERE id = p_fixture_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_training_session(
  p_admin_id uuid,
  p_session_token text,
  p_session_date timestamptz,
  p_location text,
  p_notes text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.training_sessions%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.training_sessions (session_date, location, notes)
  VALUES (p_session_date, p_location, p_notes)
  RETURNING * INTO row;

  RETURN row_to_json(row);
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_push_subscription(
  p_user_id uuid,
  p_session_token text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  INSERT INTO public.push_subscriptions (player_id, endpoint, p256dh, auth, user_agent, updated_at)
  VALUES (p_user_id, p_endpoint, p_p256dh, p_auth, p_user_agent, now())
  ON CONFLICT (endpoint)
  DO UPDATE SET
    player_id = EXCLUDED.player_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_push_subscription(
  p_user_id uuid,
  p_session_token text,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.verify_session(p_user_id, p_session_token) THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE player_id = p_user_id AND endpoint = p_endpoint;
END;
$$;

-- =============================================================================
-- Grants
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.register_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_approved TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_submit_match_result TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_training_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_push_subscription TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_push_subscription TO anon, authenticated;

