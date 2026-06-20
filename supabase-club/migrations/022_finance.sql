-- Finance: sponsorships and expenses (admin/committee, ledger-style audit)

CREATE TYPE public.sponsorship_category AS ENUM (
  'player_sponsor',
  'match_balls',
  'kit',
  'other'
);

CREATE TYPE public.expense_category AS ENUM (
  'pitch_hire',
  'referee_fees',
  'kit',
  'equipment',
  'admin_fees',
  'other'
);

CREATE TABLE public.sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name text NOT NULL,
  category public.sponsorship_category NOT NULL DEFAULT 'other',
  item_detail text,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  paid boolean NOT NULL DEFAULT false,
  date_added date NOT NULL DEFAULT CURRENT_DATE,
  logged_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsorships_date_added ON public.sponsorships(date_added DESC);
CREATE INDEX idx_sponsorships_paid ON public.sponsorships(paid);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category public.expense_category NOT NULL DEFAULT 'other',
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  logged_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  edited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct sponsorships read" ON public.sponsorships FOR SELECT USING (false);
CREATE POLICY "No direct sponsorships write" ON public.sponsorships FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct sponsorships update" ON public.sponsorships FOR UPDATE USING (false);
CREATE POLICY "No direct sponsorships delete" ON public.sponsorships FOR DELETE USING (false);

CREATE POLICY "No direct expenses read" ON public.expenses FOR SELECT USING (false);
CREATE POLICY "No direct expenses write" ON public.expenses FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct expenses update" ON public.expenses FOR UPDATE USING (false);
CREATE POLICY "No direct expenses delete" ON public.expenses FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.assert_finance_user(p_user_id uuid, p_session_token text)
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

CREATE OR REPLACE FUNCTION public.admin_list_sponsorships(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_finance_user(p_admin_id, p_session_token);

  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'id', s.id,
      'sponsor_name', s.sponsor_name,
      'category', s.category,
      'item_detail', s.item_detail,
      'amount', s.amount,
      'paid', s.paid,
      'date_added', s.date_added,
      'logged_by_id', s.logged_by,
      'logged_by_name', lp.display_name,
      'edited_by_id', s.edited_by,
      'edited_by_name', ep.display_name,
      'edited_at', s.edited_at,
      'created_at', s.created_at
    ) ORDER BY s.date_added DESC, s.created_at DESC)
    FROM public.sponsorships s
    JOIN public.profiles lp ON lp.id = s.logged_by
    LEFT JOIN public.profiles ep ON ep.id = s.edited_by
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_sponsorship(
  p_admin_id uuid,
  p_session_token text,
  p_sponsor_name text,
  p_category public.sponsorship_category,
  p_item_detail text,
  p_amount numeric,
  p_paid boolean,
  p_date_added date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  row public.sponsorships%ROWTYPE;
  v_name text;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_name := trim(p_sponsor_name);
  IF v_name = '' OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Sponsor name must be 1–120 characters';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be zero or greater';
  END IF;

  IF p_date_added IS NULL THEN
    RAISE EXCEPTION 'Date is required';
  END IF;

  INSERT INTO public.sponsorships (
    sponsor_name, category, item_detail, amount, paid, date_added, logged_by
  )
  VALUES (
    v_name,
    p_category,
    nullif(trim(p_item_detail), ''),
    round(p_amount, 2),
    coalesce(p_paid, false),
    p_date_added,
    actor.id
  )
  RETURNING * INTO row;

  RETURN (
    SELECT json_build_object(
      'id', s.id,
      'sponsor_name', s.sponsor_name,
      'category', s.category,
      'item_detail', s.item_detail,
      'amount', s.amount,
      'paid', s.paid,
      'date_added', s.date_added,
      'logged_by_id', s.logged_by,
      'logged_by_name', actor.display_name,
      'edited_by_id', s.edited_by,
      'edited_by_name', NULL,
      'edited_at', s.edited_at,
      'created_at', s.created_at
    )
    FROM public.sponsorships s
    WHERE s.id = row.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_sponsorship(
  p_admin_id uuid,
  p_session_token text,
  p_sponsorship_id uuid,
  p_sponsor_name text,
  p_category public.sponsorship_category,
  p_item_detail text,
  p_amount numeric,
  p_paid boolean,
  p_date_added date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_name text;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_name := trim(p_sponsor_name);
  IF v_name = '' OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Sponsor name must be 1–120 characters';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be zero or greater';
  END IF;

  UPDATE public.sponsorships
  SET
    sponsor_name = v_name,
    category = p_category,
    item_detail = nullif(trim(p_item_detail), ''),
    amount = round(p_amount, 2),
    paid = coalesce(p_paid, false),
    date_added = p_date_added,
    edited_by = actor.id,
    edited_at = now()
  WHERE id = p_sponsorship_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship not found';
  END IF;

  RETURN (
    SELECT json_build_object(
      'id', s.id,
      'sponsor_name', s.sponsor_name,
      'category', s.category,
      'item_detail', s.item_detail,
      'amount', s.amount,
      'paid', s.paid,
      'date_added', s.date_added,
      'logged_by_id', s.logged_by,
      'logged_by_name', lp.display_name,
      'edited_by_id', s.edited_by,
      'edited_by_name', actor.display_name,
      'edited_at', s.edited_at,
      'created_at', s.created_at
    )
    FROM public.sponsorships s
    JOIN public.profiles lp ON lp.id = s.logged_by
    WHERE s.id = p_sponsorship_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_sponsorship(
  p_admin_id uuid,
  p_session_token text,
  p_sponsorship_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_finance_user(p_admin_id, p_session_token);

  DELETE FROM public.sponsorships WHERE id = p_sponsorship_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sponsorship not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_expenses(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_finance_user(p_admin_id, p_session_token);

  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'id', e.id,
      'description', e.description,
      'category', e.category,
      'amount', e.amount,
      'expense_date', e.expense_date,
      'logged_by_id', e.logged_by,
      'logged_by_name', lp.display_name,
      'edited_by_id', e.edited_by,
      'edited_by_name', ep.display_name,
      'edited_at', e.edited_at,
      'created_at', e.created_at
    ) ORDER BY e.expense_date DESC, e.created_at DESC)
    FROM public.expenses e
    JOIN public.profiles lp ON lp.id = e.logged_by
    LEFT JOIN public.profiles ep ON ep.id = e.edited_by
  ), '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_expense(
  p_admin_id uuid,
  p_session_token text,
  p_description text,
  p_category public.expense_category,
  p_amount numeric,
  p_expense_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  row public.expenses%ROWTYPE;
  v_desc text;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_desc := trim(p_description);
  IF v_desc = '' OR length(v_desc) > 200 THEN
    RAISE EXCEPTION 'Description must be 1–200 characters';
  END IF;

  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be zero or greater';
  END IF;

  IF p_expense_date IS NULL THEN
    RAISE EXCEPTION 'Date is required';
  END IF;

  INSERT INTO public.expenses (description, category, amount, expense_date, logged_by)
  VALUES (v_desc, p_category, round(p_amount, 2), p_expense_date, actor.id)
  RETURNING * INTO row;

  RETURN json_build_object(
    'id', row.id,
    'description', row.description,
    'category', row.category,
    'amount', row.amount,
    'expense_date', row.expense_date,
    'logged_by_id', row.logged_by,
    'logged_by_name', actor.display_name,
    'edited_by_id', row.edited_by,
    'edited_by_name', NULL,
    'edited_at', row.edited_at,
    'created_at', row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_expense(
  p_admin_id uuid,
  p_session_token text,
  p_expense_id uuid,
  p_description text,
  p_category public.expense_category,
  p_amount numeric,
  p_expense_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor public.profiles%ROWTYPE;
  v_desc text;
BEGIN
  actor := public.assert_finance_user(p_admin_id, p_session_token);

  v_desc := trim(p_description);
  IF v_desc = '' OR length(v_desc) > 200 THEN
    RAISE EXCEPTION 'Description must be 1–200 characters';
  END IF;

  UPDATE public.expenses
  SET
    description = v_desc,
    category = p_category,
    amount = round(p_amount, 2),
    expense_date = p_expense_date,
    edited_by = actor.id,
    edited_at = now()
  WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  RETURN (
    SELECT json_build_object(
      'id', e.id,
      'description', e.description,
      'category', e.category,
      'amount', e.amount,
      'expense_date', e.expense_date,
      'logged_by_id', e.logged_by,
      'logged_by_name', lp.display_name,
      'edited_by_id', e.edited_by,
      'edited_by_name', actor.display_name,
      'edited_at', e.edited_at,
      'created_at', e.created_at
    )
    FROM public.expenses e
    JOIN public.profiles lp ON lp.id = e.logged_by
    WHERE e.id = p_expense_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_expense(
  p_admin_id uuid,
  p_session_token text,
  p_expense_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_finance_user(p_admin_id, p_session_token);

  DELETE FROM public.expenses WHERE id = p_expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_finance_overview(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid_income numeric;
  v_pending_income numeric;
  v_total_expenses numeric;
BEGIN
  PERFORM public.assert_finance_user(p_admin_id, p_session_token);

  SELECT coalesce(sum(amount), 0) INTO v_paid_income
  FROM public.sponsorships WHERE paid = true;

  SELECT coalesce(sum(amount), 0) INTO v_pending_income
  FROM public.sponsorships WHERE paid = false;

  SELECT coalesce(sum(amount), 0) INTO v_total_expenses
  FROM public.expenses;

  RETURN json_build_object(
    'paid_income', v_paid_income,
    'pending_income', v_pending_income,
    'total_expenses', v_total_expenses,
    'net_balance', v_paid_income - v_total_expenses,
    'sponsorship_by_category', coalesce((
      SELECT json_agg(json_build_object(
        'category', sc.category,
        'paid_amount', sc.paid_amount,
        'pending_amount', sc.pending_amount
      ) ORDER BY sc.category)
      FROM (
        SELECT
          category,
          coalesce(sum(amount) FILTER (WHERE paid), 0) AS paid_amount,
          coalesce(sum(amount) FILTER (WHERE NOT paid), 0) AS pending_amount
        FROM public.sponsorships
        GROUP BY category
      ) sc
    ), '[]'::json),
    'expenses_by_category', coalesce((
      SELECT json_agg(json_build_object(
        'category', ec.category,
        'amount', ec.amount
      ) ORDER BY ec.category)
      FROM (
        SELECT category, sum(amount) AS amount
        FROM public.expenses
        GROUP BY category
      ) ec
    ), '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_sponsorships TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_sponsorship TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_sponsorship TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_sponsorship TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_expenses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_expense TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_expense TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_expense TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_finance_overview TO anon, authenticated;
