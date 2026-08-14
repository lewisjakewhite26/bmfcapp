-- New match_event types backing the appearance-points rework:
--   appearance        — started, no goal/assist/motm/card logged (+4 in app)
--   unused_sub        — named on the bench, didn't come on (+1 in app)
--   clean_sheet_gk    — goalkeeper on a shutout (+6 in app)
--   clean_sheet_def   — defender on a shutout (+4 in app)
-- Point values live in src/lib/playerProfileStats.ts, not the database —
-- this migration only widens what event_type is allowed to be.

ALTER TABLE public.match_events DROP CONSTRAINT IF EXISTS match_events_event_type_check;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_event_type_check
  CHECK (event_type IN (
    'goal', 'assist', 'motm', 'yellow_card', 'red_card', 'substitution',
    'appearance', 'unused_sub', 'clean_sheet_gk', 'clean_sheet_def'
  ));
