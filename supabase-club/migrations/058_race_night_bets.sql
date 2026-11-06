-- Race night bets: taken on phones at the betting desk (Admin -> Race night -> Bets).
-- Each bet gets a ticket number to write on the slip. Winning bets share 50% of
-- their race's pot by stake; the club keeps the rest. Payouts only show once a
-- race is marked as run (the race night show does this when its video ends).
-- Admin/committee only, via RPC.

CREATE SEQUENCE IF NOT EXISTS public.race_night_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS public.race_night_bets (
  ticket integer PRIMARY KEY DEFAULT nextval('public.race_night_ticket_seq'),
  race_id text NOT NULL,
  runner_number integer NOT NULL CHECK (runner_number BETWEEN 1 AND 30),
  amount numeric(8,2) NOT NULL CHECK (amount > 0 AND amount <= 1000),
  voided boolean NOT NULL DEFAULT false,
  paid_out boolean NOT NULL DEFAULT false,
  taken_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  paid_at timestamptz
);

ALTER SEQUENCE public.race_night_ticket_seq OWNED BY public.race_night_bets.ticket;

CREATE INDEX IF NOT EXISTS race_night_bets_race_idx ON public.race_night_bets (race_id);

-- Races that have been run (their video has played). Payouts show only for these.
CREATE TABLE IF NOT EXISTS public.race_night_runs (
  race_id text PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now()
);

-- Entry fees and owner/jockey prizes, shared by every phone.
CREATE TABLE IF NOT EXISTS public.race_night_money (
  id text PRIMARY KEY DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.race_night_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_night_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_night_money ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct race_night_bets access" ON public.race_night_bets FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No direct race_night_runs access" ON public.race_night_runs FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY "No direct race_night_money access" ON public.race_night_money FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.race_night_check_admin(p_admin_id uuid, p_session_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO admin_user
  FROM public.profiles
  WHERE id = p_admin_id AND session_token = p_session_token;

  IF NOT FOUND OR NOT (admin_user.is_admin OR admin_user.is_committee) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.race_night_check_admin FROM PUBLIC, anon, authenticated;

-- Everything the betting screens need in one call.
CREATE OR REPLACE FUNCTION public.admin_get_race_night_bets(
  p_admin_id uuid,
  p_session_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  RETURN json_build_object(
    'bets', COALESCE((
      SELECT json_agg(json_build_object(
        'ticket', b.ticket,
        'raceId', b.race_id,
        'runner', b.runner_number,
        'amount', b.amount,
        'voided', b.voided,
        'paidOut', b.paid_out,
        'createdAt', b.created_at
      ) ORDER BY b.ticket)
      FROM public.race_night_bets b
    ), '[]'::json),
    'runs', COALESCE((SELECT json_agg(r.race_id ORDER BY r.run_at) FROM public.race_night_runs r), '[]'::json),
    'money', COALESCE((SELECT m.data FROM public.race_night_money m WHERE m.id = 'default'), '{}'::jsonb)
  );
END;
$$;

-- Takes a bet and returns its ticket number. Refused once the race has run.
CREATE OR REPLACE FUNCTION public.admin_add_race_night_bet(
  p_admin_id uuid,
  p_session_token text,
  p_race_id text,
  p_runner integer,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ticket integer;
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  IF p_race_id IS NULL OR length(p_race_id) = 0 OR length(p_race_id) > 100 THEN
    RAISE EXCEPTION 'Invalid race';
  END IF;

  IF EXISTS (SELECT 1 FROM public.race_night_runs WHERE race_id = p_race_id) THEN
    RAISE EXCEPTION 'Race already run';
  END IF;

  INSERT INTO public.race_night_bets (race_id, runner_number, amount, taken_by)
  VALUES (p_race_id, p_runner, round(p_amount, 2), p_admin_id)
  RETURNING ticket INTO new_ticket;

  RETURN json_build_object('ticket', new_ticket);
END;
$$;

-- Cancels a bet taken by mistake (money handed back). Not once it's been paid out.
CREATE OR REPLACE FUNCTION public.admin_void_race_night_bet(
  p_admin_id uuid,
  p_session_token text,
  p_ticket integer,
  p_voided boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  UPDATE public.race_night_bets
  SET voided = p_voided, voided_at = CASE WHEN p_voided THEN now() ELSE NULL END
  WHERE ticket = p_ticket AND NOT paid_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_pay_race_night_bet(
  p_admin_id uuid,
  p_session_token text,
  p_ticket integer,
  p_paid boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  UPDATE public.race_night_bets
  SET paid_out = p_paid, paid_at = CASE WHEN p_paid THEN now() ELSE NULL END
  WHERE ticket = p_ticket AND NOT voided;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_race_night_run(
  p_admin_id uuid,
  p_session_token text,
  p_race_id text,
  p_run boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  IF p_run THEN
    INSERT INTO public.race_night_runs (race_id) VALUES (p_race_id) ON CONFLICT (race_id) DO NOTHING;
  ELSE
    DELETE FROM public.race_night_runs WHERE race_id = p_race_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_race_night_money(
  p_admin_id uuid,
  p_session_token text,
  p_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.race_night_check_admin(p_admin_id, p_session_token);

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR length(p_data::text) > 5000 THEN
    RAISE EXCEPTION 'Invalid settings';
  END IF;

  INSERT INTO public.race_night_money (id, data) VALUES ('default', p_data)
  ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_race_night_bets TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_race_night_bet TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_void_race_night_bet TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_pay_race_night_bet TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_race_night_run TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_race_night_money TO anon, authenticated;
