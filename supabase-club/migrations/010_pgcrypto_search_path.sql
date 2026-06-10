-- Fix passcode auth on Supabase: pgcrypto lives in the extensions schema.
-- SECURITY DEFINER functions with search_path = public cannot resolve
-- crypt(), gen_salt(), or gen_random_bytes() without extensions in the path.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION public.login_user(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.register_user(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.complete_invite(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.admin_create_invite(uuid, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.admin_create_invite(uuid, text, text, text) SET search_path = public, extensions;
ALTER FUNCTION public.admin_regenerate_invite(uuid, text, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.admin_reset_passcode(uuid, text, uuid, text) SET search_path = public, extensions;
