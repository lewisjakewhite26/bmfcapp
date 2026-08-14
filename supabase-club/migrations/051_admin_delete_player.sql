-- Admin-only permanent player deletion. Distinct from admin_set_user_approved
-- (revoke), which just flips is_approved and leaves the row (and login)
-- around. This actually removes the account and everything tied to it via
-- ON DELETE CASCADE (appearances, fines, votes, photos, sponsor logo, push
-- subscriptions, etc). Tables where they were the ADMIN acting (expenses,
-- sponsorships logged_by, audit log actor_id) are ON DELETE RESTRICT by
-- design — deletion is blocked with a clear message rather than silently
-- erasing finance/audit history.
CREATE OR REPLACE FUNCTION public.admin_delete_player(
  p_admin_id uuid,
  p_session_token text,
  p_target_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  target public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO target FROM public.profiles WHERE id = p_target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF target.is_admin THEN
    RAISE EXCEPTION 'Cannot delete an admin account';
  END IF;

  IF target.id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  BEGIN
    DELETE FROM public.profiles WHERE id = p_target_id;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Cannot delete: this player has finance or audit history logged against their account. Revoke their access instead.';
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_player TO anon, authenticated;
