-- Committee to-do list: simple task tracker for committee/admin, assignable
-- to any squad member. All access via RPCs (RLS blocks direct table access,
-- same convention as fines/finance/lineups).

CREATE TABLE public.committee_todo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT committee_todo_done_fields CHECK (
    (status = 'done' AND completed_at IS NOT NULL) OR
    (status = 'pending' AND completed_at IS NULL AND completed_by IS NULL)
  )
);

CREATE INDEX idx_committee_todo_status ON public.committee_todo(status);
CREATE INDEX idx_committee_todo_assigned_to ON public.committee_todo(assigned_to);

ALTER TABLE public.committee_todo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct committee_todo access" ON public.committee_todo
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.assert_committee_user(p_user_id uuid, p_session_token text)
RETURNS public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO found_user
  FROM public.profiles
  WHERE id = p_user_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (found_user.is_admin OR found_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN found_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.todo_entry_to_json(
  t public.committee_todo,
  p_assigned_name text,
  p_created_name text,
  p_completed_name text
)
RETURNS json
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT json_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'assigned_to', t.assigned_to,
    'assigned_name', p_assigned_name,
    'status', t.status,
    'created_by', t.created_by,
    'created_name', p_created_name,
    'completed_by', t.completed_by,
    'completed_name', p_completed_name,
    'created_at', t.created_at,
    'completed_at', t.completed_at
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_create_todo(
  p_admin_id uuid,
  p_session_token text,
  p_title text,
  p_description text,
  p_assigned_to uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_title text;
  row public.committee_todo%ROWTYPE;
BEGIN
  actor := public.assert_committee_user(p_admin_id, p_session_token);

  v_title := nullif(trim(p_title), '');
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Title is required';
  END IF;

  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_assigned_to
  ) THEN
    RAISE EXCEPTION 'Assignee not found';
  END IF;

  INSERT INTO public.committee_todo (title, description, assigned_to, created_by)
  VALUES (v_title, nullif(trim(p_description), ''), p_assigned_to, actor.id)
  RETURNING * INTO row;

  RETURN (
    SELECT public.todo_entry_to_json(row, ap.display_name, cp.display_name, NULL)
    FROM public.profiles cp
    LEFT JOIN public.profiles ap ON ap.id = row.assigned_to
    WHERE cp.id = row.created_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_todos(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_committee_user(p_admin_id, p_session_token);

  RETURN COALESCE((
    SELECT json_agg(
      public.todo_entry_to_json(t, ap.display_name, cp.display_name, comp.display_name)
      ORDER BY t.status ASC, t.created_at DESC
    )
    FROM public.committee_todo t
    JOIN public.profiles cp ON cp.id = t.created_by
    LEFT JOIN public.profiles ap ON ap.id = t.assigned_to
    LEFT JOIN public.profiles comp ON comp.id = t.completed_by
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_todo_status(
  p_admin_id uuid,
  p_session_token text,
  p_todo_id uuid,
  p_done boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  row public.committee_todo%ROWTYPE;
BEGIN
  actor := public.assert_committee_user(p_admin_id, p_session_token);

  IF NOT EXISTS (SELECT 1 FROM public.committee_todo WHERE id = p_todo_id) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF p_done THEN
    UPDATE public.committee_todo
    SET status = 'done', completed_by = actor.id, completed_at = now()
    WHERE id = p_todo_id
    RETURNING * INTO row;
  ELSE
    UPDATE public.committee_todo
    SET status = 'pending', completed_by = NULL, completed_at = NULL
    WHERE id = p_todo_id
    RETURNING * INTO row;
  END IF;

  RETURN (
    SELECT public.todo_entry_to_json(row, ap.display_name, cp.display_name, comp.display_name)
    FROM public.profiles cp
    LEFT JOIN public.profiles ap ON ap.id = row.assigned_to
    LEFT JOIN public.profiles comp ON comp.id = row.completed_by
    WHERE cp.id = row.created_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_todo(uuid, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_todos(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_todo_status(uuid, text, uuid, boolean) TO anon, authenticated;
