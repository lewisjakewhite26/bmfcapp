-- BMFC Club Hub — initial admin (run once after migrations)
-- 1. Change display name and passcode below
-- 2. Run in Supabase SQL editor
-- 3. Log in with that name + passcode, then create squad invites from Admin

INSERT INTO public.profiles (
  username,
  display_name,
  passcode_hash,
  is_admin,
  is_committee,
  is_approved
)
VALUES (
  'lewis',
  'Lewis',
  crypt('1111', gen_salt('bf')),
  true,
  true,
  true
)
ON CONFLICT (username) DO NOTHING;

-- Note: if username 'lewis' already exists, edit the name above or run:
-- UPDATE public.profiles SET is_admin = true, is_committee = true, is_approved = true
-- WHERE display_name = 'Your Name';
