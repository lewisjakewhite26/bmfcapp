-- Auto-include every approved player in the squad.
--
-- The squad table drives fines, signing-on fees, availability, stats and
-- lineups. Previously approving a profile only flipped profiles.is_approved and
-- never created a squad row, so newly signed-up players were silently excluded
-- from fines and signing-on fees until an admin added them manually.
--
-- This trigger guarantees that any approved profile has an active squad row,
-- regardless of how approval happens (Admin -> Users RPC, the team-invite flow,
-- or a direct service-role update from a setup script). It only inserts when a
-- squad row is missing, so it never overwrites an existing player's position or
-- squad number.

CREATE OR REPLACE FUNCTION public.ensure_squad_for_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved THEN
    INSERT INTO public.squad (player_id, position, joined_date, active)
    VALUES (NEW.id, NULL, CURRENT_DATE, true)
    ON CONFLICT (player_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_squad_for_approved ON public.profiles;
CREATE TRIGGER trg_ensure_squad_for_approved
AFTER INSERT OR UPDATE OF is_approved ON public.profiles
FOR EACH ROW
WHEN (NEW.is_approved)
EXECUTE FUNCTION public.ensure_squad_for_approved();

-- Backfill: add an active squad row for every already-approved profile that is
-- still missing one. Idempotent — safe to run more than once.
INSERT INTO public.squad (player_id, position, joined_date, active)
SELECT p.id, NULL, CURRENT_DATE, true
FROM public.profiles p
WHERE p.is_approved
ON CONFLICT (player_id) DO NOTHING;
