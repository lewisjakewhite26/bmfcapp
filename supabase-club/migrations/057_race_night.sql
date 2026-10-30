-- Race night programme: one shared document (races, runners, sponsors, results)
-- edited from Admin -> Race night. Admin/committee only, via RPC.

CREATE TABLE IF NOT EXISTS public.race_night (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.race_night ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct race_night read" ON public.race_night FOR SELECT USING (false);
CREATE POLICY "No direct race_night write" ON public.race_night FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct race_night update" ON public.race_night FOR UPDATE USING (false);
CREATE POLICY "No direct race_night delete" ON public.race_night FOR DELETE USING (false);

-- Starting programme, taken from the "Race Night Programme" Google Sheet.
INSERT INTO public.race_night (id, data)
VALUES ('default', '{"title":"Race Night","races":[{"id":"race-1","sponsor":"D Dalton Building Services","runners":[{"id":"race-1-runner-1","number":1,"horse":"","owner":"Cooksey","jockey":"David Ryder","position":null},{"id":"race-1-runner-2","number":2,"horse":"","owner":"Will Denholm","jockey":"Carrie Mekins","position":null},{"id":"race-1-runner-3","number":3,"horse":"","owner":"Jack Marley","jockey":"Damien","position":null},{"id":"race-1-runner-4","number":4,"horse":"","owner":"James Marshall","jockey":"Sean","position":null},{"id":"race-1-runner-5","number":5,"horse":"Usain Colt","owner":"Harvey Ryder","jockey":"Parksey","position":null},{"id":"race-1-runner-6","number":6,"horse":"","owner":"Dan Jones","jockey":"Danny Bell","position":null},{"id":"race-1-runner-7","number":7,"horse":"Lightning Lankshear","owner":"Dave Redfern","jockey":"Carrie Mekins","position":null},{"id":"race-1-runner-8","number":8,"horse":"","owner":"Josh Findlay","jockey":"Kell","position":null}]},{"id":"race-2","sponsor":"Village Dairy Farm","runners":[{"id":"race-2-runner-1","number":1,"horse":"Parkseys Stallion","owner":"Parksey","jockey":"Damien","position":null},{"id":"race-2-runner-2","number":2,"horse":"Boozy is a puff","owner":"Kimey","jockey":"Sean","position":null},{"id":"race-2-runner-3","number":3,"horse":"","owner":"Dova","jockey":"Kell","position":null},{"id":"race-2-runner-4","number":4,"horse":"Stable Foundation","owner":"Dave Redfern","jockey":"","position":null},{"id":"race-2-runner-5","number":5,"horse":"","owner":"Cooksey","jockey":"Carrie","position":null},{"id":"race-2-runner-6","number":6,"horse":"Brian Brobby","owner":"Ryan Hunter","jockey":"B","position":null},{"id":"race-2-runner-7","number":7,"horse":"","owner":"Rob Latham","jockey":"Harvey Ryder","position":null},{"id":"race-2-runner-8","number":8,"horse":"Pints, Pints, Pints","owner":"Harvey Ryder","jockey":"David Ryder","position":null}]},{"id":"race-3","sponsor":"DGS Limited","runners":[{"id":"race-3-runner-1","number":1,"horse":"Dinner Nanny","owner":"Kimey","jockey":"Parksy","position":null},{"id":"race-3-runner-2","number":2,"horse":"My Tits","owner":"Scanners","jockey":"Carrie Mekins","position":null},{"id":"race-3-runner-3","number":3,"horse":"Eileen","owner":"David Ryder","jockey":"","position":null},{"id":"race-3-runner-4","number":4,"horse":"Really Fast Horse","owner":"Lew White","jockey":"","position":null},{"id":"race-3-runner-5","number":5,"horse":"","owner":"Caidan King","jockey":"","position":null},{"id":"race-3-runner-6","number":6,"horse":"","owner":"Ash Jenks","jockey":"","position":null},{"id":"race-3-runner-7","number":7,"horse":"","owner":"Jamie Halliday","jockey":"","position":null},{"id":"race-3-runner-8","number":8,"horse":"","owner":"Dougie","jockey":"","position":null}]},{"id":"race-4","sponsor":"Turnbull FC Clothing","runners":[{"id":"race-4-runner-1","number":1,"horse":"Feel the Noise","owner":"David Ryder","jockey":"Parksey","position":null},{"id":"race-4-runner-2","number":2,"horse":"","owner":"Ellis Hare","jockey":"","position":null},{"id":"race-4-runner-3","number":3,"horse":"","owner":"Freddie","jockey":"","position":null},{"id":"race-4-runner-4","number":4,"horse":"","owner":"George","jockey":"","position":null},{"id":"race-4-runner-5","number":5,"horse":"","owner":"Hodgey","jockey":"","position":null},{"id":"race-4-runner-6","number":6,"horse":"","owner":"Hutchy","jockey":"","position":null},{"id":"race-4-runner-7","number":7,"horse":"","owner":"Joe Sheldon","jockey":"","position":null},{"id":"race-4-runner-8","number":8,"horse":"","owner":"Josh","jockey":"","position":null}]},{"id":"race-5","sponsor":"JSC Locum","runners":[{"id":"race-5-runner-1","number":1,"horse":"","owner":"Tom Laing","jockey":"","position":null},{"id":"race-5-runner-2","number":2,"horse":"","owner":"Logan","jockey":"","position":null},{"id":"race-5-runner-3","number":3,"horse":"","owner":"Sam Marshall","jockey":"","position":null},{"id":"race-5-runner-4","number":4,"horse":"","owner":"Noadsy","jockey":"","position":null},{"id":"race-5-runner-5","number":5,"horse":"","owner":"Karen Marshall","jockey":"","position":null},{"id":"race-5-runner-6","number":6,"horse":"","owner":"Linsey","jockey":"","position":null},{"id":"race-5-runner-7","number":7,"horse":"","owner":"","jockey":"","position":null},{"id":"race-5-runner-8","number":8,"horse":"","owner":"","jockey":"","position":null}]},{"id":"race-6","sponsor":"Lew & Al''s Mobile Mince & Dumplings","runners":[{"id":"race-6-runner-1","number":1,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-2","number":2,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-3","number":3,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-4","number":4,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-5","number":5,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-6","number":6,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-7","number":7,"horse":"","owner":"","jockey":"","position":null},{"id":"race-6-runner-8","number":8,"horse":"","owner":"","jockey":"","position":null}]}]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.admin_get_race_night(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.race_night%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO row FROM public.race_night WHERE id = 'default';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object('data', row.data, 'version', row.version);
END;
$$;

-- Saves the whole programme. p_expected_version stops two people silently
-- overwriting each other: if someone else saved first, this raises
-- 'Changed elsewhere' and the app offers a reload.
CREATE OR REPLACE FUNCTION public.admin_save_race_night(
  p_admin_id uuid,
  p_session_token text,
  p_data jsonb,
  p_expected_version integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  row public.race_night%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data->'races') <> 'array' THEN
    RAISE EXCEPTION 'Invalid programme';
  END IF;

  IF length(p_data::text) > 200000 THEN
    RAISE EXCEPTION 'Programme too large';
  END IF;

  SELECT * INTO row FROM public.race_night WHERE id = 'default' FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.race_night (id, data) VALUES ('default', p_data)
    RETURNING * INTO row;
  ELSE
    IF row.version <> p_expected_version THEN
      RAISE EXCEPTION 'Changed elsewhere';
    END IF;

    UPDATE public.race_night
    SET data = p_data, version = row.version + 1, updated_at = now()
    WHERE id = 'default'
    RETURNING * INTO row;
  END IF;

  RETURN json_build_object('version', row.version);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_race_night TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_race_night TO anon, authenticated;
