-- Central admin audit log (append-only; actor validated server-side)

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_actor_id ON public.admin_audit_log(actor_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct admin_audit_log read" ON public.admin_audit_log FOR SELECT USING (false);
CREATE POLICY "No direct admin_audit_log write" ON public.admin_audit_log FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct admin_audit_log update" ON public.admin_audit_log FOR UPDATE USING (false);
CREATE POLICY "No direct admin_audit_log delete" ON public.admin_audit_log FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.log_admin_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (p_actor_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_audit(
  p_actor_id uuid,
  p_session_token text,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO actor
  FROM public.profiles
  WHERE id = p_actor_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (actor.is_admin OR actor.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public.log_admin_audit(
    actor.id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_audit_log(
  p_admin_id uuid,
  p_session_token text,
  p_limit integer DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
  capped_limit integer;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT admin_user.is_admin THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  capped_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);

  RETURN COALESCE(
    (
      SELECT json_agg(row_to_json(t) ORDER BY t.created_at DESC)
      FROM (
        SELECT
          l.id,
          l.action,
          l.entity_type,
          l.entity_id,
          l.details,
          l.created_at,
          p.display_name AS actor_name,
          p.login_name AS actor_login_name
        FROM public.admin_audit_log l
        JOIN public.profiles p ON p.id = l.actor_id
        ORDER BY l.created_at DESC
        LIMIT capped_limit
      ) t
    ),
    '[]'::json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_record_audit(uuid, text, text, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_log(uuid, text, integer) TO anon, authenticated;
