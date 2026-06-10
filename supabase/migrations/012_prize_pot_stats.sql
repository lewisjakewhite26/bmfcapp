-- Public aggregate stats for prize pot display (no per-user payment data exposed)

CREATE OR REPLACE FUNCTION get_prize_pot_stats()
RETURNS json AS $$
DECLARE
  paid_count integer;
  total_count integer;
  entry_fee constant integer := 10;
  pot_share constant numeric := 0.75;
BEGIN
  SELECT COUNT(*)::integer INTO total_count FROM users;
  SELECT COUNT(*)::integer INTO paid_count FROM users WHERE has_paid = true;

  RETURN json_build_object(
    'total_entrants', total_count,
    'paid_entrants', paid_count,
    'unpaid_entrants', GREATEST(total_count - paid_count, 0),
    'total_collected_gbp', paid_count * entry_fee,
    'prize_pot_gbp', (paid_count * entry_fee * pot_share),
    'potential_prize_pot_gbp', (total_count * entry_fee * pot_share)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_prize_pot_stats TO anon, authenticated;
