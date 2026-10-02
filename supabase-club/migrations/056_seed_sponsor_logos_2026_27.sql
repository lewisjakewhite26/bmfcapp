-- One-off data load: sponsor logos that ship with the site (public/sponsors/).
-- Points each player's sponsor_logo_url at the site file. A later upload in
-- the app (admin or the player) replaces it as normal. Safe to run more than once.

UPDATE public.profiles p
SET sponsor_logo_url = l.logo
FROM (VALUES
  ('Jack Scanlon',      '/sponsors/apex-mouthguards.png'),
  ('Lewis White',       '/sponsors/13-apparel.png'),
  ('Ciaran Lines',      '/sponsors/lines-valeting.png'),
  ('Freddie McCormack', '/sponsors/lines-valeting.png'),
  ('David Redfern',     '/sponsors/mess-sedgefield.png')
) AS l(full_name, logo)
WHERE public.player_name_key(p.first_name || ' ' || p.last_name) = public.player_name_key(l.full_name)
RETURNING p.first_name, p.last_name, p.sponsor_name, p.sponsor_logo_url;
