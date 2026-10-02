-- Matchday graphics library: background-removed player photos ("cut-outs")
-- and opponent badges used by Admin → Matchday graphics, which draws the
-- matchday, goalscorer and MOTM posts in the browser. Replaces the parked
-- Canva integration (canva-autofill can be undeployed after this ships).
--
-- Conventions (same as fines/finance/committee_todo):
--   * Tables are RLS-locked; all reads and writes go through RPCs that check
--     the caller's session token. Admin only (not committee) by request.
--   * Uploads use short-lived grants (same pattern as player-photos /
--     sponsor-logos): an RPC opens a 10-minute grant for an exact path, the
--     client uploads to that path, a confirm RPC records it.
--   * Deletes: RPCs remove the rows and open delete grants for the files;
--     the client removes the files through the Storage API. Direct SQL
--     deletes on storage.objects are avoided.
--
-- Storage layout in the public `matchday-graphics` bucket:
--   players/{player_id}/{uuid}-cutout.png    background removed, used in posts
--   players/{player_id}/{uuid}-original.jpg  resized original, kept for re-cuts
--   badges/{uuid}.{ext}                       opponent badges
-- Paths are random, but the bucket is public — these images end up on the
-- club's social media anyway.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.graphic_player_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cutout_path text NOT NULL UNIQUE,
  original_path text UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_graphic_player_photos_player ON public.graphic_player_photos(player_id);
CREATE UNIQUE INDEX idx_graphic_player_photos_one_default
  ON public.graphic_player_photos(player_id) WHERE is_default;

ALTER TABLE public.graphic_player_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct graphic_player_photos access" ON public.graphic_player_photos
  FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.opponent_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalised opponent name used to match fixtures.opponent (see
  -- public.opponent_key). One badge per opponent.
  opponent_key text NOT NULL UNIQUE,
  opponent_name text NOT NULL,
  badge_path text NOT NULL UNIQUE,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opponent_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct opponent_badges access" ON public.opponent_badges
  FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.graphics_storage_grants (
  storage_path text NOT NULL,
  action text NOT NULL CHECK (action IN ('upload', 'delete')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (storage_path, action)
);

CREATE INDEX idx_graphics_storage_grants_expires_at ON public.graphics_storage_grants(expires_at);

ALTER TABLE public.graphics_storage_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct graphics grant access" ON public.graphics_storage_grants
  FOR ALL USING (false) WITH CHECK (false);

-- Storage policies call this instead of reading graphics_storage_grants
-- directly, so the check is not filtered by that table's RLS.
CREATE OR REPLACE FUNCTION public.graphics_grant_active(p_path text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.graphics_storage_grants g
    WHERE g.storage_path = p_path
      AND g.action = p_action
      AND g.expires_at > now()
  );
$$;

GRANT EXECUTE ON FUNCTION public.graphics_grant_active(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'matchday-graphics',
  'matchday-graphics',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Matchday graphics are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'matchday-graphics');

CREATE POLICY "Upload matchday graphics with active grant"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'matchday-graphics'
    AND public.graphics_grant_active(name, 'upload')
  );

CREATE POLICY "Delete matchday graphics with active grant"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (
    bucket_id = 'matchday-graphics'
    AND public.graphics_grant_active(name, 'delete')
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Lower-case, trimmed, single-spaced. "Ferryhill  Ivorson " → "ferryhill ivorson".
CREATE OR REPLACE FUNCTION public.opponent_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.assert_graphics_admin(p_admin_id uuid, p_session_token text)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT found_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN found_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.graphics_image_ext(p_ext text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_ext text := lower(trim(coalesce(p_ext, '')));
BEGIN
  IF v_ext = 'jpeg' THEN
    v_ext := 'jpg';
  END IF;
  IF v_ext NOT IN ('png', 'jpg', 'webp') THEN
    RAISE EXCEPTION 'Use a PNG, JPEG or WebP image';
  END IF;
  RETURN v_ext;
END;
$$;

CREATE OR REPLACE FUNCTION public.graphics_open_grant(p_path text, p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.graphics_storage_grants WHERE expires_at < now() - interval '1 day';

  INSERT INTO public.graphics_storage_grants (storage_path, action, expires_at)
  VALUES (p_path, p_action, now() + interval '10 minutes')
  ON CONFLICT (storage_path, action) DO UPDATE SET expires_at = EXCLUDED.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.graphics_take_upload_grant(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.graphics_storage_grants g
    WHERE g.storage_path = p_path AND g.action = 'upload' AND g.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Upload window expired. Try again.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'matchday-graphics' AND name = p_path
  ) THEN
    RAISE EXCEPTION 'Upload not found. Try again.';
  END IF;

  DELETE FROM public.graphics_storage_grants
  WHERE storage_path = p_path AND action = 'upload';
END;
$$;

-- ---------------------------------------------------------------------------
-- Library read
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_graphics_library(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  RETURN json_build_object(
    'photos', coalesce((
      SELECT json_agg(json_build_object(
        'id', p.id,
        'player_id', p.player_id,
        'cutout_path', p.cutout_path,
        'original_path', p.original_path,
        'is_default', p.is_default,
        'created_at', p.created_at
      ) ORDER BY p.is_default DESC, p.created_at DESC)
      FROM public.graphic_player_photos p
    ), '[]'::json),
    'badges', coalesce((
      SELECT json_agg(json_build_object(
        'id', b.id,
        'opponent_key', b.opponent_key,
        'opponent_name', b.opponent_name,
        'badge_path', b.badge_path,
        'updated_at', b.updated_at
      ) ORDER BY b.opponent_name)
      FROM public.opponent_badges b
    ), '[]'::json)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Player cut-outs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_prepare_graphic_photo_upload(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_include_original boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text := gen_random_uuid()::text;
  v_cutout text;
  v_original text;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  v_cutout := 'players/' || p_player_id::text || '/' || v_id || '-cutout.png';
  PERFORM public.graphics_open_grant(v_cutout, 'upload');

  IF coalesce(p_include_original, false) THEN
    v_original := 'players/' || p_player_id::text || '/' || v_id || '-original.jpg';
    PERFORM public.graphics_open_grant(v_original, 'upload');
  END IF;

  RETURN json_build_object('cutout_path', v_cutout, 'original_path', v_original);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_graphic_photo(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_cutout_path text,
  p_original_path text,
  p_make_default boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_prefix text := 'players/' || p_player_id::text || '/';
  v_default boolean;
  v_row public.graphic_player_photos%ROWTYPE;
BEGIN
  admin_user := public.assert_graphics_admin(p_admin_id, p_session_token);

  IF p_cutout_path IS NULL OR p_cutout_path NOT LIKE v_prefix || '%-cutout.png' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;
  IF p_original_path IS NOT NULL AND p_original_path NOT LIKE v_prefix || '%-original.jpg' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  PERFORM public.graphics_take_upload_grant(p_cutout_path);
  IF p_original_path IS NOT NULL THEN
    PERFORM public.graphics_take_upload_grant(p_original_path);
  END IF;

  v_default := coalesce(p_make_default, false)
    OR NOT EXISTS (SELECT 1 FROM public.graphic_player_photos WHERE player_id = p_player_id);

  IF v_default THEN
    UPDATE public.graphic_player_photos SET is_default = false
    WHERE player_id = p_player_id AND is_default;
  END IF;

  INSERT INTO public.graphic_player_photos (player_id, cutout_path, original_path, is_default, created_by)
  VALUES (p_player_id, p_cutout_path, p_original_path, v_default, admin_user.id)
  RETURNING * INTO v_row;

  RETURN json_build_object(
    'id', v_row.id,
    'player_id', v_row.player_id,
    'cutout_path', v_row.cutout_path,
    'original_path', v_row.original_path,
    'is_default', v_row.is_default,
    'created_at', v_row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_default_graphic_photo(
  p_admin_id uuid,
  p_session_token text,
  p_photo_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player uuid;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  SELECT player_id INTO v_player FROM public.graphic_player_photos WHERE id = p_photo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photo not found';
  END IF;

  UPDATE public.graphic_player_photos SET is_default = false
  WHERE player_id = v_player AND is_default AND id <> p_photo_id;

  UPDATE public.graphic_player_photos SET is_default = true WHERE id = p_photo_id;
END;
$$;

-- Returns the storage paths to remove; delete grants are opened for them.
CREATE OR REPLACE FUNCTION public.admin_delete_graphic_photo(
  p_admin_id uuid,
  p_session_token text,
  p_photo_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.graphic_player_photos%ROWTYPE;
  v_paths text[];
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  DELETE FROM public.graphic_player_photos WHERE id = p_photo_id RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Photo not found';
  END IF;

  -- Promote the newest remaining photo if the default was removed.
  IF v_row.is_default THEN
    UPDATE public.graphic_player_photos SET is_default = true
    WHERE id = (
      SELECT id FROM public.graphic_player_photos
      WHERE player_id = v_row.player_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;

  v_paths := array_remove(ARRAY[v_row.cutout_path, v_row.original_path], NULL);
  PERFORM public.graphics_open_grant(p, 'delete') FROM unnest(v_paths) AS p;

  RETURN json_build_object('paths', to_json(v_paths));
END;
$$;

-- ---------------------------------------------------------------------------
-- Opponent badges
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_prepare_opponent_badge_upload(
  p_admin_id uuid,
  p_session_token text,
  p_file_ext text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  v_path := 'badges/' || gen_random_uuid()::text || '.' || public.graphics_image_ext(p_file_ext);
  PERFORM public.graphics_open_grant(v_path, 'upload');

  RETURN json_build_object('path', v_path);
END;
$$;

-- Saves (or replaces) the badge for an opponent. Returns the new row plus
-- the previous badge path (if any) with a delete grant opened for it.
CREATE OR REPLACE FUNCTION public.admin_confirm_opponent_badge(
  p_admin_id uuid,
  p_session_token text,
  p_opponent_name text,
  p_badge_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_key text := public.opponent_key(p_opponent_name);
  v_old_path text;
  v_row public.opponent_badges%ROWTYPE;
BEGIN
  admin_user := public.assert_graphics_admin(p_admin_id, p_session_token);

  IF v_key = '' THEN
    RAISE EXCEPTION 'Opponent name is required';
  END IF;
  IF p_badge_path IS NULL OR p_badge_path NOT LIKE 'badges/%' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  PERFORM public.graphics_take_upload_grant(p_badge_path);

  SELECT badge_path INTO v_old_path FROM public.opponent_badges WHERE opponent_key = v_key;

  INSERT INTO public.opponent_badges (opponent_key, opponent_name, badge_path, updated_by, updated_at)
  VALUES (v_key, trim(p_opponent_name), p_badge_path, admin_user.id, now())
  ON CONFLICT (opponent_key) DO UPDATE SET
    opponent_name = EXCLUDED.opponent_name,
    badge_path = EXCLUDED.badge_path,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_row;

  IF v_old_path IS NOT NULL AND v_old_path <> p_badge_path THEN
    PERFORM public.graphics_open_grant(v_old_path, 'delete');
  ELSE
    v_old_path := NULL;
  END IF;

  RETURN json_build_object(
    'badge', json_build_object(
      'id', v_row.id,
      'opponent_key', v_row.opponent_key,
      'opponent_name', v_row.opponent_name,
      'badge_path', v_row.badge_path,
      'updated_at', v_row.updated_at
    ),
    'replaced_path', v_old_path
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_opponent_badge(
  p_admin_id uuid,
  p_session_token text,
  p_badge_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
BEGIN
  PERFORM public.assert_graphics_admin(p_admin_id, p_session_token);

  DELETE FROM public.opponent_badges WHERE id = p_badge_id RETURNING badge_path INTO v_path;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Badge not found';
  END IF;

  PERFORM public.graphics_open_grant(v_path, 'delete');
  RETURN json_build_object('paths', json_build_array(v_path));
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- Internal helpers are not callable from the client.
REVOKE ALL ON FUNCTION public.assert_graphics_admin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.graphics_open_grant(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.graphics_take_upload_grant(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_graphics_library(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_graphic_photo_upload(uuid, text, uuid, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_graphic_photo(uuid, text, uuid, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_default_graphic_photo(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_graphic_photo(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_prepare_opponent_badge_upload(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_opponent_badge(uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_opponent_badge(uuid, text, uuid) TO anon, authenticated;
