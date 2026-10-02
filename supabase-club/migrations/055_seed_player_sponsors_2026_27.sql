-- One-off data load: 2026/27 player sponsors (from the club's sponsorship list).
-- Matches on first + last name, ignoring case, apostrophes and punctuation
-- ("Logan Ohara" = "Logan O'Hara"). Safe to run more than once.
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
CREATE TEMP TABLE sponsor_list_2026 (full_name text, sponsor text);

INSERT INTO sponsor_list_2026 (full_name, sponsor) VALUES
  ('Simon Darwin', 'MD Construction'),
  ('Ciaran Lines', 'Lines Valeting'),
  ('Will Dodsworth', 'Makepeace Interior Solutions'),
  ('George Davey', 'Outrank'),
  ('Chris Park', 'GH Elite'),
  ('Thomas Laing', 'DTS Consult'),
  ('Jack Hinch', 'Aspire Accounting & Tax Ltd'),
  ('Ryan Hunter', 'Walker Tyres Ltd'),
  ('James Marshall', 'JSC Locum'),
  ('Connor Noades', 'Xpress Heating'),
  ('Callum Watson', 'Village Tavern Coxhoe'),
  ('Charlie Coates', 'Emily''s Beauty'),
  ('Joe Williamson', 'Sqew'),
  ('Jack Marley', 'L Brown Installations'),
  ('Matthew Jones', 'SJ Vocals'),
  ('Jordan Cooksey', 'West Cornforth Fisheries'),
  ('Will Denholm', 'Chris Ford Sliding Wardrobes'),
  ('Carl Hodges', 'Ash Dodsworth'),
  ('Harvey Ryder', 'Bishops Lodge'),
  ('Jack Scanlon', 'Apex Mouthguards'),
  ('Dougie English', 'Martin Gray FA'),
  ('Sam Marshall', 'David Redfern Building Services'),
  ('Lee Hutchinson', 'David Redfern Building Services'),
  ('Dave Redfern', 'Mess Sedgefield'),
  ('Lewis White', '13 Apparel'),
  ('Jamie Halliday', 'Squirrel Bars'),
  ('Logan Ohara', NULL),
  ('Jack Kell', NULL);

UPDATE public.profiles p
SET sponsor_name = l.sponsor
FROM sponsor_list_2026 l
WHERE l.sponsor IS NOT NULL
  AND public.player_name_key(p.first_name || ' ' || p.last_name) = public.player_name_key(l.full_name);

-- Cross-reference report
WITH players AS (
  SELECT p.id,
         coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), p.display_name) AS full_name,
         public.player_name_key(p.first_name || ' ' || p.last_name) AS name_key,
         EXISTS (SELECT 1 FROM public.squad s WHERE s.player_id = p.id AND s.active) AS in_squad
  FROM public.profiles p
)
SELECT result, name, sponsor FROM (
  SELECT
    CASE
      WHEN pl.id IS NULL THEN '2. Not found in app'
      WHEN l.sponsor IS NULL THEN '3. Available (unchanged)'
      ELSE '1. Saved'
    END AS result,
    l.full_name AS name,
    coalesce(l.sponsor, '') AS sponsor
  FROM sponsor_list_2026 l
  LEFT JOIN players pl ON pl.name_key = public.player_name_key(l.full_name)
  UNION ALL
  SELECT '4. In squad, not on the list', pl.full_name, ''
  FROM players pl
  WHERE pl.in_squad
    AND NOT EXISTS (SELECT 1 FROM sponsor_list_2026 l WHERE public.player_name_key(l.full_name) = pl.name_key)
) report
ORDER BY result, name;
