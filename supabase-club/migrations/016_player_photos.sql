-- Player profile photos (Supabase Storage + admin/committee upload grants)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.profiles.photo_url IS
  'Relative storage path in player-photos bucket (e.g. {uuid}/photo.jpg), or null.';

GRANT SELECT (photo_url) ON public.profiles TO anon, authenticated;

CREATE TABLE public.photo_upload_grants (
  player_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_upload_grants_expires_at ON public.photo_upload_grants(expires_at);

ALTER TABLE public.photo_upload_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct photo grant access" ON public.photo_upload_grants
  FOR ALL USING (false) WITH CHECK (false);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Player photos are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'player-photos');

CREATE POLICY "Upload with active photo grant"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM public.photo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  );

CREATE POLICY "Replace with active photo grant"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM public.photo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND EXISTS (
      SELECT 1
      FROM public.photo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  );

CREATE OR REPLACE FUNCTION public.admin_prepare_player_photo_upload(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid,
  p_file_ext text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  v_ext text;
  v_path text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id) THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  v_ext := lower(trim(p_file_ext));
  IF v_ext NOT IN ('jpg', 'jpeg', 'png', 'webp', 'gif') THEN
    RAISE EXCEPTION 'Unsupported image type';
  END IF;
  IF v_ext = 'jpeg' THEN
    v_ext := 'jpg';
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = p_player_id::text;

  DELETE FROM public.photo_upload_grants WHERE player_id = p_player_id;

  v_path := p_player_id::text || '/photo.' || v_ext;

  INSERT INTO public.photo_upload_grants (player_id, storage_path, expires_at)
  VALUES (p_player_id, v_path, now() + interval '10 minutes');

  RETURN json_build_object('path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_player_photo_upload(
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
  admin_user public.profiles%ROWTYPE;
  v_path text;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_path := trim(p_storage_path);
  IF v_path = '' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF (storage.foldername(v_path))[1] <> p_player_id::text THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF v_path NOT LIKE p_player_id::text || '/photo.%' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.photo_upload_grants g
    WHERE g.player_id = p_player_id
      AND g.storage_path = v_path
      AND g.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Upload window expired — try again';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'player-photos' AND name = v_path
  ) THEN
    RAISE EXCEPTION 'Photo upload not found';
  END IF;

  UPDATE public.profiles
  SET photo_url = v_path
  WHERE id = p_player_id;

  DELETE FROM public.photo_upload_grants WHERE player_id = p_player_id;

  RETURN json_build_object('photo_url', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_player_photo(
  p_admin_id uuid,
  p_session_token text,
  p_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'player-photos'
    AND (storage.foldername(name))[1] = p_player_id::text;

  DELETE FROM public.photo_upload_grants WHERE player_id = p_player_id;

  UPDATE public.profiles
  SET photo_url = NULL
  WHERE id = p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_prepare_player_photo_upload TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_player_photo_upload TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_player_photo TO anon, authenticated;
