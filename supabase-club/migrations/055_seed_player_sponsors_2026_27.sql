-- One-off data load: 2026/27 player sponsors (from the club's sponsorship list).
-- Matches on first + last name, ignoring case, apostrophes and punctuation
-- ("Logan Ohara" = "Logan O'Hara"),
-- plus a few common short forms (Will/William, Dave/David). Safe to run more than once.
--
-- When run in the Supabase SQL editor, the final SELECT shows a cross-reference:
--   Saved                         → sponsor written to that player
--   Not found in app              → no player with that name; check the spelling,
--                                   then set it in Admin → Matchday graphics → Sponsors
--   Available (unchanged)         → on the list with no sponsor; left as is
--   In squad, not on the list     → active squad player missing from the list
--
-- Logos are not part of this; add them per player in the Sponsors tab.

CREATE OR REPLACE FUNCTION public.player_name_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(lower(replace(replace(coalesce(p_name, ''), '''', ''), '’', '')), '[^a-z0-9]+', ' ', 'g'));
$$;

DROP TABLE IF EXISTS pg_temp.sponsor_list_2026;
-- full_name is the registered (DDSFL) name; aliases cover how the player may
-- have typed it in the app (Will/William, Dave/David, Chris/Christopher...).
CREATE TEMP TABLE sponsor_list_2026 (full_name text, sponsor text, aliases text[] DEFAULT '{}');

INSERT INTO sponsor_list_2026 (full_name, sponsor, aliases) VALUES
  ('Simon Darwin', 'MD Construction', '{}'),
  ('Ciaran Lines', 'Lines Valeting', '{}'),
  ('George Davey', 'Outrank', '{}'),
  ('Christopher Park', 'GH Elite', '{"Chris Park"}'),
  ('Thomas Laing', 'DTS Consult', '{"Tom Laing"}'),
  ('Jack Hinch', 'Aspire Accounting & Tax Ltd', '{}'),
  ('Ryan Hunter', 'Walker Tyres Ltd', '{}'),
  ('James Marshall', 'JSC Locum', '{}'),
  ('Connor Noades', 'Xpress Heating', '{}'),
  ('Callum Watson', 'Village Tavern Coxhoe', '{}'),
  ('Charlie Coates', 'Emily''s Beauty', '{"Charles Coates"}'),
  ('Joe Williamson', 'Sqew', '{"Joseph Williamson"}'),
  ('Jack Marley', 'L Brown Installations', '{}'),
  ('Mathew Jones', 'SJ Vocals', '{"Matthew Jones","Matt Jones"}'),
  ('Jordan Cooksey', 'West Cornforth Fisheries', '{}'),
  ('William Denholm', 'Chris Ford Sliding Wardrobes', '{"Will Denholm"}'),
  ('Carl Hodges', 'Ash Dodsworth', '{}'),
  ('Harvey Ryder', 'Bishops Lodge', '{}'),
  ('Jack Scanlon', 'Apex Mouthguards', '{}'),
  ('Dougie English', 'Martin Gray FA', '{"Douglas English","Doug English"}'),
  ('Sam Marshall', 'David Redfern Building Services', '{"Samuel Marshall"}'),
  ('Lee Hutchinson', 'David Redfern Building Services', '{}'),
  ('David Redfern', 'Mess Sedgefield', '{"Dave Redfern"}'),
  ('Lewis White', '13 Apparel', '{}'),
  ('Jamie Halliday', 'Squirrel Bars', '{}'),
  ('Caidan King', 'David Redfern Building Services', '{}'),
  ('Freddie McCormack', 'Lines Valeting', '{"Frederick McCormack","Fred McCormack"}'),
  ('Logan Ohara', NULL, '{"Logan Doyle"}'), -- registered as Logan Doyle, goes by O'Hara
  ('Jack Kell', NULL, '{}');
-- Will Dodsworth (Makepeace Interior Solutions) has left the club.

DROP TABLE IF EXISTS pg_temp.sponsor_keys_2026;
CREATE TEMP TABLE sponsor_keys_2026 AS
SELECT l.full_name, l.sponsor, public.player_name_key(n) AS name_key
FROM sponsor_list_2026 l, unnest(array_prepend(l.full_name, l.aliases)) AS n;

-- Name tidy: Ellis Hare doesn't use his middle name.
UPDATE public.profiles
SET first_name = 'Ellis'
WHERE public.player_name_key(first_name) = 'ellis james'
  AND public.player_name_key(last_name) = 'hare';

UPDATE public.profiles p
SET sponsor_name = k.sponsor
FROM sponsor_keys_2026 k
WHERE k.sponsor IS NOT NULL
  AND public.player_name_key(p.first_name || ' ' || p.last_name) = k.name_key;

-- Cross-reference report
WITH players AS (
  SELECT p.id,
         coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), p.display_name) AS full_name,
         public.player_name_key(p.first_name || ' ' || p.last_name) AS name_key,
         EXISTS (SELECT 1 FROM public.squad s WHERE s.player_id = p.id AND s.active) AS in_squad
  FROM public.profiles p
),
matched AS (
  SELECT DISTINCT l.full_name, l.sponsor, pl.id
  FROM sponsor_list_2026 l
  LEFT JOIN sponsor_keys_2026 k ON k.full_name = l.full_name
  LEFT JOIN players pl ON pl.name_key = k.name_key
)
SELECT result, name, sponsor FROM (
  SELECT DISTINCT
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM matched m2 WHERE m2.full_name = m.full_name AND m2.id IS NOT NULL) THEN '2. Not found in app'
      WHEN m.sponsor IS NULL THEN '3. Available (unchanged)'
      ELSE '1. Saved'
    END AS result,
    m.full_name AS name,
    coalesce(m.sponsor, '') AS sponsor
  FROM matched m
  UNION ALL
  SELECT '4. In squad, not on the list', pl.full_name, ''
  FROM players pl
  WHERE pl.in_squad
    AND NOT EXISTS (SELECT 1 FROM sponsor_keys_2026 k WHERE k.name_key = pl.name_key)
) report
ORDER BY result, name;
