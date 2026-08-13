-- Player-managed sponsor logos: each player can attach a personal sponsor
-- name + logo to their own profile (self-service, mirrors the player-photos
-- time-limited storage grant pattern from migration 016, but authenticated
-- as the player themselves rather than an admin acting on their behalf).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text;

COMMENT ON COLUMN public.profiles.sponsor_logo_url IS
  'Relative storage path in sponsor-logos bucket (e.g. {uuid}/logo.jpg), or null.';

GRANT SELECT (sponsor_name, sponsor_logo_url) ON public.profiles TO anon, authenticated;

CREATE TABLE public.sponsor_logo_upload_grants (
  player_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsor_logo_upload_grants_expires_at ON public.sponsor_logo_upload_grants(expires_at);

ALTER TABLE public.sponsor_logo_upload_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct sponsor logo grant access" ON public.sponsor_logo_upload_grants
  FOR ALL USING (false) WITH CHECK (false);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-logos',
  'sponsor-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Sponsor logos are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sponsor-logos');

CREATE POLICY "Upload with active sponsor logo grant"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'sponsor-logos'
    AND EXISTS (
      SELECT 1
      FROM public.sponsor_logo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  );

CREATE POLICY "Replace with active sponsor logo grant"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (
    bucket_id = 'sponsor-logos'
    AND EXISTS (
      SELECT 1
      FROM public.sponsor_logo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  )
  WITH CHECK (
    bucket_id = 'sponsor-logos'
    AND EXISTS (
      SELECT 1
      FROM public.sponsor_logo_upload_grants g
      WHERE g.storage_path = name
        AND g.expires_at > now()
    )
  );

CREATE OR REPLACE FUNCTION public.prepare_sponsor_logo_upload(
  p_user_id uuid,
  p_session_token text,
  p_file_ext text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_ext text;
  v_path text;
BEGIN
  actor := public.assert_approved_player(p_user_id, p_session_token);

  v_ext := lower(trim(p_file_ext));
  IF v_ext NOT IN ('jpg', 'jpeg', 'png', 'webp', 'gif') THEN
    RAISE EXCEPTION 'Unsupported image type';
  END IF;
  IF v_ext = 'jpeg' THEN
    v_ext := 'jpg';
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'sponsor-logos'
    AND (storage.foldername(name))[1] = actor.id::text;

  DELETE FROM public.sponsor_logo_upload_grants WHERE player_id = actor.id;

  v_path := actor.id::text || '/logo.' || v_ext;

  INSERT INTO public.sponsor_logo_upload_grants (player_id, storage_path, expires_at)
  VALUES (actor.id, v_path, now() + interval '10 minutes');

  RETURN json_build_object('path', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_sponsor_logo_upload(
  p_user_id uuid,
  p_session_token text,
  p_storage_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_path text;
BEGIN
  actor := public.assert_approved_player(p_user_id, p_session_token);

  v_path := trim(p_storage_path);
  IF v_path = '' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF (storage.foldername(v_path))[1] <> actor.id::text THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF v_path NOT LIKE actor.id::text || '/logo.%' THEN
    RAISE EXCEPTION 'Invalid storage path';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sponsor_logo_upload_grants g
    WHERE g.player_id = actor.id
      AND g.storage_path = v_path
      AND g.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Upload window expired — try again';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'sponsor-logos' AND name = v_path
  ) THEN
    RAISE EXCEPTION 'Logo upload not found';
  END IF;

  UPDATE public.profiles
  SET sponsor_logo_url = v_path
  WHERE id = actor.id;

  DELETE FROM public.sponsor_logo_upload_grants WHERE player_id = actor.id;

  RETURN json_build_object('sponsor_logo_url', v_path);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sponsor_logo(
  p_user_id uuid,
  p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
BEGIN
  actor := public.assert_approved_player(p_user_id, p_session_token);

  DELETE FROM storage.objects
  WHERE bucket_id = 'sponsor-logos'
    AND (storage.foldername(name))[1] = actor.id::text;

  DELETE FROM public.sponsor_logo_upload_grants WHERE player_id = actor.id;

  UPDATE public.profiles
  SET sponsor_logo_url = NULL
  WHERE id = actor.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_sponsor_name(
  p_user_id uuid,
  p_session_token text,
  p_sponsor_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_name text;
BEGIN
  actor := public.assert_approved_player(p_user_id, p_session_token);

  v_name := nullif(trim(p_sponsor_name), '');
  IF v_name IS NOT NULL AND length(v_name) > 80 THEN
    RAISE EXCEPTION 'Sponsor name must be 80 characters or fewer';
  END IF;

  UPDATE public.profiles
  SET sponsor_name = v_name
  WHERE id = actor.id;

  RETURN json_build_object('sponsor_name', v_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.prepare_sponsor_logo_upload(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sponsor_logo_upload(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sponsor_logo(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_sponsor_name(uuid, text, text) TO anon, authenticated;
