-- 1) Fix: player photo (016) and sponsor logo (048) uploads.
--    Their storage policies read photo_upload_grants / sponsor_logo_upload_grants
--    directly, but both tables are RLS-locked ("No direct … access" USING false).
--    Policy subqueries run as the caller (anon), so RLS hides the grant row and
--    every upload fails with "new row violates row-level security policy".
--    Same fix as 053: check grants through SECURITY DEFINER helpers.
--
-- 2) Admin sponsor management: admins can set any player's sponsor name and
--    logo (players can still manage their own from their profile), plus a
--    bulk import for the season's sponsor list.

-- ---------------------------------------------------------------------------
-- 1) Upload policy fix
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.photo_upload_grant_active(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.photo_upload_grants g
    WHERE g.storage_path = p_path AND g.expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.sponsor_logo_grant_active(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sponsor_logo_upload_grants g
    WHERE g.storage_path = p_path AND g.expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.photo_upload_grant_active(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sponsor_logo_grant_active(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Upload with active photo grant" ON storage.objects;
DROP POLICY IF EXISTS "Replace with active photo grant" ON storage.objects;
DROP POLICY IF EXISTS "Upload with active sponsor logo grant" ON storage.objects;
DROP POLICY IF EXISTS "Replace with active sponsor logo grant" ON storage.objects;

CREATE POLICY "Upload with active photo grant"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'player-photos' AND public.photo_upload_grant_active(name));

CREATE POLICY "Replace with active photo grant"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'player-photos' AND public.photo_upload_grant_active(name))
  WITH CHECK (bucket_id = 'player-photos' AND public.photo_upload_grant_active(name));

CREATE POLICY "Upload with active sponsor logo grant"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'sponsor-logos' AND public.sponsor_logo_grant_active(name));

CREATE POLICY "Replace with active sponsor logo grant"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'sponsor-logos' AND public.sponsor_logo_grant_active(name))
  WITH CHECK (bucket_id = 'sponsor-logos' AND public.sponsor_logo_grant_active(name));

-- ---------------------------------------------------------------------------
-- 2) Admin sponsor management (admin only — uses assert_graphics_admin from 053)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_player_sponsor_name(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_sponsor_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(coalesce(p_sponsor_name, '')), '');
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  IF v_name IS NOT NULL AND length(v_name) > 80 THEN
    RAISE EXCEPTION 'Sponsor name must be 80 characters or fewer';
  END IF;

  UPDATE public.profiles SET sponsor_name = v_name WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  RETURN json_build_object('sponsor_name', v_name);
END;
$$;

-- Bulk import: [{"player_id": "…", "sponsor_name": "…" | null}, …]. All or nothing.
CREATE OR REPLACE FUNCTION public.admin_import_player_sponsors(
  p_admin_id uuid,
  p_session_token text,
  p_rows json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_name text;
  v_count integer := 0;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  IF json_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected a list of sponsors';
  END IF;
  IF json_array_length(p_rows) > 200 THEN
    RAISE EXCEPTION 'Too many rows (200 max)';
  END IF;

  FOR r IN SELECT (e->>'player_id')::uuid AS player_id, e->>'sponsor_name' AS sponsor_name
           FROM json_array_elements(p_rows) AS e
  LOOP
    v_name := nullif(trim(coalesce(r.sponsor_name, '')), '');
    IF v_name IS NOT NULL AND length(v_name) > 80 THEN
      RAISE EXCEPTION 'Sponsor name too long: %', left(v_name, 40);
    END IF;
    UPDATE public.profiles SET sponsor_name = v_name WHERE id = r.player_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Player not found: %', r.player_id;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object('updated', v_count);
END;
$$;

-- Logo upload for any player. Reuses the 048 grant table and bucket; the
-- client uploads with upsert to {player_id}/logo.{ext}.
CREATE OR REPLACE FUNCTION public.admin_prepare_player_sponsor_logo_upload(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_file_ext text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ext text := lower(trim(coalesce(p_file_ext, '')));
  v_path text;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF v_ext = 'jpeg' THEN
    v_ext := 'jpg';
  END IF;
  IF v_ext NOT IN ('jpg', 'png', 'webp', 'gif') THEN
    RAISE EXCEPTION 'Unsupported image type';
  END IF;

  v_path := p_player_id::text || '/logo.' || v_ext;

  DELETE FROM public.sponsor_logo_upload_grants WHERE player_id = p_player_id;
  INSERT INTO public.sponsor_logo_upload_grants (player_id, storage_path, expires_at)
  VALUES (p_player_id, v_path, now() + interval '10 minutes');

  RETURN json_build_object('path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_player_sponsor_logo(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_storage_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_path text := trim(coalesce(p_storage_path, ''));
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  IF v_path NOT LIKE p_player_id::text || '/logo.%' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_logo_upload_grants g
    WHERE g.player_id = p_player_id AND g.storage_path = v_path AND g.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Upload window expired. Try again.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'sponsor-logos' AND name = v_path
  ) THEN
    RAISE EXCEPTION 'Logo upload not found';
  END IF;

  UPDATE public.profiles SET sponsor_logo_url = v_path WHERE id = p_player_id;
  DELETE FROM public.sponsor_logo_upload_grants WHERE player_id = p_player_id;

  RETURN json_build_object('sponsor_logo_url', v_path);
END;
$$;

-- Clears the logo from the profile. The file is left in the bucket (it is
-- overwritten on the next upload of the same type).
CREATE OR REPLACE FUNCTION public.admin_clear_player_sponsor_logo(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);
  UPDATE public.profiles SET sponsor_logo_url = NULL WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_player_sponsor_name(uuid, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_player_sponsors(uuid, text, json) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_player_sponsor_logo_upload(uuid, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_player_sponsor_logo(uuid, text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clear_player_sponsor_logo(uuid, text, uuid) TO anon, authenticated;
