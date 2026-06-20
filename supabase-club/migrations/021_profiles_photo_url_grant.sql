-- Allow public read of player photo paths (URLs are unguessable storage paths)

GRANT SELECT (photo_url) ON public.profiles TO anon, authenticated;
