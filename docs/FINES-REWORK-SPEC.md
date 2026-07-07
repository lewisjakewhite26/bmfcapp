# BMFC Club Hub: Fines System Rework (26/27 Season)

Single-pass implementation brief. Work through the sections in order. Where this document names existing files, tables, or RPCs, they are known to exist. Where it says INSPECT, discover the real names/shapes in the codebase before writing code and adapt. Do not guess schema names.

UK English throughout all user-facing copy. Currency is GBP, amounts in pounds.

---

## 0. Context: current system (as-is)

- Fines live in Supabase: `fine_sessions` + `fine_entries`. All access via SECURITY DEFINER RPCs, RLS blocks direct table access.
- Preset catalogue in `src/lib/fineCatalog.ts`: late £1, sin_bin £5, no_warm_up_top £1, no_show £5. One-off fines use key `oneoff:{uuid}`.
- Totals computed at read time from unpaid `fine_entries`.
- Late fee: £2 per player per calendar MONTH, applied by `apply_fine_late_fees()` (migration `supabase-club/migrations/034_fine_late_fees.sql`), run daily 00:05 UTC by GitHub Action `.github/workflows/apply-fine-late-fees.yml`, idempotent via `fine_late_fee_runs (period_year, period_month, ...)`. Helper `fine_last_sunday_of_month(year, month)` exists. pg_cron support is optional in 034.
- Warning UI is client-side scoring in `src/lib/fineAlerts.ts` based on amount owed + AGE of oldest unpaid fine.
- Only one push exists: "New fine added" when admin saves (`src/lib/finePush.ts` -> `invokeSendPush()` -> Supabase Edge Function `send-push` -> Web Push via `push_subscriptions`). Late fees are currently silent.
- Admin UI: `src/pages/AdminFines.tsx`, picker `src/components/fines/FinePickerModal.tsx` with `FineTypeGrid.tsx` (toggle tiles) and `FineOneOffSection.tsx`.
- Player UI: `src/pages/Fines.tsx` (`FineYourBalanceCard`, `FineSquadOwedCard`), Dashboard banner `FineAlertBanner.tsx` via `useMyUnpaidFines()`.
- Players vote availability for BOTH matches and training through the app. INSPECT the availability/events schema (tables holding fixtures, training sessions, kickoff/start times, and per-player availability responses) and reuse it. Do not invent a parallel events model.
- Squad membership: active `squad` table (migration 036 auto-creates squad rows on profile approval).

---

## 1. New fine catalogue

Replace the presets in `src/lib/fineCatalog.ts`:

| Key | Label | Amount | Notes |
|---|---|---|---|
| `late` | Late | £1 | Late for training or match |
| `late_10` | Late 10+ mins | £2 | 10 minutes or more late for a match |
| `no_show` | No show | £5 | No show after declaring availability |
| `sin_bin` | Sin bin | £5 | The £12 yellow card payment to the club is handled OUTSIDE this app. Do not model it. |
| `no_vote` | No vote | £1 | No availability vote for training/game. Auto-applied by the system (section 5) but must also remain manually toggleable by admins in the picker. |
| `non_club_attire` | Non-club attire | £1 | Replaces `no_warm_up_top` |

Rules:

- `no_warm_up_top` is REMOVED from the catalogue/picker. Existing DB rows with that key must remain valid and render correctly everywhere (they store their own `label` and `amount`, so keep rendering from the row, never from catalogue lookup alone). Verify no code path breaks when a `fine_key` is absent from the catalogue.
- `late` and `late_10` are mutually exclusive per player per session. Enforce in UI (section 6) AND server-side in `admin_set_fine_entry`: enabling one deletes/blocks the other for that (session, player).
- One-off fines are renamed in all user-facing copy from "One-off fine" to "Discretional fine" (helper text: "Committee/manager's discretion. Just for this player, this event."). Key format `oneoff:{uuid}` stays unchanged. Check `finePlayerCopy.ts` and any other copy locations.
- `late_fee` (£2, system-generated) continues to exist outside the catalogue.

---

## 2. Per-fine due dates with grace window

### Rule

Every fine gets a `due_date` at creation time:

1. Let `LS` = last Sunday of the fine's creation month (use existing `fine_last_sunday_of_month`).
2. If `created_at::date <= LS - 7 days` (i.e. on or before the PENULTIMATE Sunday), `due_date = LS`.
3. Otherwise (created after the penultimate Sunday, including after `LS` itself), `due_date =` last Sunday of the FOLLOWING month.

Worked examples (June 2026, last Sunday = 28th, penultimate = 21st):

- Fined Sun 21 June -> due 28 June (on the penultimate Sunday still pays this month).
- Fined Mon 22 June -> due 26 July (grace, ~5 weeks).
- Fined Tue 30 June -> due 26 July.

### Implementation

- New migration: add `due_date date NOT NULL` to `fine_entries`.
- Create SQL helper `fine_due_date(created date) RETURNS date` implementing the rule above. Populate `due_date` in every insert path: `admin_set_fine_entry`, the late fee function, and the no-vote function. A BEFORE INSERT trigger defaulting `due_date` when NULL is acceptable and safer than relying on each RPC.
- Backfill existing rows: `UPDATE fine_entries SET due_date = fine_due_date(created_at::date) WHERE due_date IS NULL` (run before setting NOT NULL).
- Expose `due_date` through all read RPCs that return entries (`admin_list_fine_entries`, `list_my_unpaid_fines`, per-session detail, `list_outstanding_fines_summary` should additionally return the EARLIEST due_date and whether anything is overdue per player). Update TypeScript types in `clubApi.ts` accordingly.

---

## 3. Late fees: £2 per WEEK (rewrite of migration 034 logic)

Replace the monthly model entirely.

### Rule

- Every Monday, charge £2 to each player who has ANY unpaid `fine_entries` with `due_date < CURRENT_DATE`.
- No cap. Late fee entries do NOT use the standard due date rule: a late fee's `due_date` is the date it is applied (i.e. immediately due, overdue from the next day). This keeps a player with only an unpaid late fee eligible for next Monday's charge, so late fees compound weekly as intended. The `fine_due_date()` trigger/default must therefore be bypassed or overridden for `fine_key = 'late_fee'` inserts.
- Paused players (section 4) are skipped entirely: no charge while paused, no back-charging after unpause.
- Each charge sends a push to that player (section 8).

### Implementation

- New migration superseding 034's logic:
  - New idempotency table `fine_late_fee_runs_weekly (period_year int, period_week int, players_charged int, total_amount numeric, applied_at timestamptz, PRIMARY KEY (period_year, period_week))` using ISO year/week (`EXTRACT(ISOYEAR ...)`, `EXTRACT(WEEK ...)`). Keep the old monthly table for history; stop writing to it.
  - Rewrite `apply_fine_late_fees()`: if a row already exists for the current ISO week, exit. Otherwise find eligible players (unpaid entries past due_date, not paused), insert one `late_fee` entry each (£2, label `Late payment fee`) into a session titled e.g. `Late payment fees - w/c 06 Jul 2026`, record the run, and RETURN the list of charged player ids + new totals so the caller can push. The run-record insert and the fee-entry inserts MUST commit in the same transaction (a single SQL function body gives this for free); a crash between them must never allow a double-charge on the next tick.
  - The function stays safe to run daily: the ISO-week idempotency means only the first run on/after Monday charges.
- Scheduling: handled by the single orchestrator described in section 5a. `apply_fine_late_fees()` is called on every orchestrator tick; the ISO-week idempotency means it only charges on the first tick on/after Monday. After a charging run the orchestrator invokes `send-push` per charged player (title `Late payment fee added`, body `£2 added. You now owe £{total}.`, url `/fines`). Keep the existing daily GitHub Action + `scripts/apply-fine-late-fees.mjs` as a backstop (harmless no-op via idempotency), updated for the weekly model and to push on the rare occasion it is the one that charges.

### Player-facing copy

Update `/fines` copy (check `finePlayerCopy.ts`): explain that fines are due by the last Sunday of the month, that fines issued in the final week roll to the following month's last Sunday, and that £2 per week is added for anything unpaid past its due date.

---

## 4. Player pause (freezes all automation)

### Behaviour

Admin can pause any squad player. While paused, the player:

- receives NO auto no-vote fines,
- receives NO vote reminder pushes,
- accrues NO weekly late fees (existing debt is frozen, not cleared),
- can still be fined manually by an admin (manual fines are a deliberate act, not automation).

Unpausing resumes everything from that point. Never back-charge for the paused period.

### Implementation

- Migration: add to the `squad` table (INSPECT its real name/shape): `paused boolean NOT NULL DEFAULT false`, `paused_reason text`, `paused_at timestamptz`.
- New RPC `admin_set_player_pause(profile_id, paused, reason)` (SECURITY DEFINER, admin-gated like other admin RPCs).
- All three automation functions filter `WHERE NOT paused`.
- Admin UI: pause toggle on the player card in `AdminFines.tsx` (or the admin player management screen if one exists; INSPECT and pick the natural home). Show a small "Paused" badge, optional reason input, and show paused state in the Payments tab so an admin understands why a paused player's debt is not growing.
- Player UI: no special treatment needed beyond their balance simply not growing.

---

## 5. Automated no-vote fines

### Rule

For every votable event (match AND training), any active, non-paused squad member with NO availability response when the event's start time passes gets an automatic £1 `no_vote` fine, applied within a few minutes of start time, with a push.

### Implementation

- INSPECT the existing events/availability schema first: table(s) for fixtures and training sessions, the start/kickoff timestamp column, and the availability responses table (what constitutes "voted": any response row, including "unavailable", counts as voted; only the absence of any response is fined).
- Idempotency table: `fine_no_vote_runs (event_type text, event_id uuid/bigint to match schema, processed_at timestamptz, players_fined int, PRIMARY KEY (event_type, event_id))`.
- SQL function `apply_no_vote_fines()`:
  1. Find events with `start_time <= now()` AND `start_time >= now() - interval '7 days'` (safety window so ancient events are never retro-fined on first deploy) AND no row in `fine_no_vote_runs`.
  2. For each: non-voters = active squad, not paused, no availability response for that event.
  3. Insert £1 `no_vote` entries into a fine session for that event's date. Reuse the session for that date if the admin already created one; otherwise auto-create (migration 035 auto-titles from date). Respect the unique constraint `(session_id, profile_id, fine_key)`: if an admin already manually added `no_vote` for that player/session, skip, do not duplicate.
  4. Record the run. Return fined players + event label for the push layer.
- Seed `fine_no_vote_runs` for all past events in the initial migration so nothing historic fires on deploy.
- Push per fined player: title `No vote fine`, body `£1 added for not voting on {event label}. You owe £{total}.`, url `/fines`.
- Intended semantics of admin removal: idempotency is per EVENT, not per player. If an admin deletes an auto-applied no-vote fine, the run record for that event already exists, so the scheduler will never re-apply it. Admin removal is final. Do not "fix" this.

---

## 5a. Scheduler: single orchestrator (canonical architecture)

One new Supabase scheduled Edge Function, `fines-scheduler`, invoked every 5 minutes, is the CANONICAL trigger for all fines automation. Each tick it, in order:

1. Calls `apply_no_vote_fines()` (section 5) and pushes for each returned fined player.
2. Calls `apply_vote_reminders()` (section 7) and pushes each returned reminder.
3. Calls `apply_fine_late_fees()` (section 3) and pushes for each returned charged player.

All three underlying operations are idempotent, so ticks are cheap no-ops when nothing is due. Scheduling mechanism: use Supabase's cron scheduling for Edge Functions (pg_cron + pg_net invoking the function URL is the standard pattern; INSPECT what the project already uses and follow it). Do NOT split the three jobs across different mechanisms. pg_cron is not required to call SQL directly and no SQL-side push/outbox machinery is needed; the Edge Function does the pushing with the rows the SQL functions return.

The existing daily GitHub Action remains as a late-fee backstop only (section 3). Document the whole arrangement in a code comment at the top of `fines-scheduler`.

---

## 6. Admin picker changes (`FinePickerModal` / `FineTypeGrid`)

- Lateness becomes ONE cycling tile: tap 1 -> `Late £1`, tap 2 -> `Late 10+ mins £2`, tap 3 -> off. Visually indicate the current state and that it cycles. On save, the diff logic must translate the tile state into the correct add/remove of `late` vs `late_10` (never both).
- Grid now shows: Lateness (cycling), No show, Sin bin, No vote, Non-club attire. Adjust the 2-column grid layout so five tiles sit tidily (2-2-1 with the odd tile full-width is fine).
- One-off section renamed to "Discretional fine" per section 1.
- `handleSavePlayerFines` diff logic updated for the new keys and mutual exclusivity. Existing push-on-save behaviour unchanged.

---

## 7. Vote reminder pushes

- Non-voters (active, not paused) for any upcoming event get reminder pushes at T-48h and T-24h before event start.
- Idempotency table `fine_vote_reminder_runs (event_type, event_id, reminder_kind text CHECK (reminder_kind IN ('48h','24h')), sent_at, PRIMARY KEY (event_type, event_id, reminder_kind))`.
- Runs inside the `fines-scheduler` orchestrator (section 5a) as SQL function `apply_vote_reminders()`: find events where `start_time - interval '48 hours' <= now()` (and separately 24h) with no run recorded, push non-voters, record run. Events created inside a window get whichever reminders remain (skip elapsed ones by recording them as sent).
- Push copy: title `Vote reminder`, body `You haven't voted for {event label} ({when}). No vote = £1 fine.`, url pointing at the availability page (INSPECT route).
- These reminders are NOT fines; nothing is inserted into `fine_entries`.

---

## 8. Push notification additions (`src/lib/finePush.ts` / server side)

Three new push types, all via the existing `send-push` Edge Function, all errors swallowed (never block the triggering job):

1. Weekly late fee charged (section 3).
2. Auto no-vote fine applied (section 5).
3. Vote reminders (section 7).

Server-triggered pushes originate from Edge Functions/scripts, not the browser client; reuse whatever `invokeSendPush` does at the HTTP level.

---

## 9. Warning UI: deadline-aware rescoring (`src/lib/fineAlerts.ts`)

Replace the age axis with a due-date axis. Amount axis unchanged.

Amount owed (unchanged): >= £15 +3, >= £8 +2, >= £4 +1.

Deadline proximity, based on the EARLIEST `due_date` among the player's unpaid entries. Define `days_until = due_date - today`:

| Condition | Score |
|---|---|
| Overdue (`days_until < 0`) | +3 |
| Due today or within 3 days (`0 <= days_until <= 3`) | +2 |
| Due within 7 days (`4 <= days_until <= 7`) | +1 |
| Due in more than 7 days | +0 |

Due TODAY scores +2, not +1: it is the most urgent non-overdue state. Unit tests (acceptance check 11) must cover the band edges: days_until of -1, 0, 3, 4, 7, 8.

Levels unchanged: >= 4 critical (red, pulsing), >= 2 warning (amber), > 0 normal (blue), nothing owed = hidden.

Additional display requirements:

- `FineYourBalanceCard` and `FineAlertBanner`: show the due date plainly, e.g. `Due by Sun 26 Jul` or `Overdue since Sun 28 Jun` (+ note that £2/week is being added when overdue).
- `FineSquadOwedCard`: update `list_outstanding_fines_summary` to return earliest due_date / overdue flag per player instead of (or alongside) `oldest_unpaid_days`, and score the squad rows with the same new logic. Remove now-dead age plumbing (`daysSince` usage for scoring) or repurpose carefully; keep the codebase consistent, no orphaned logic.

---

## 10. Migration and file touch list (summary)

SQL (new migrations in `supabase-club/migrations/`, numbered after the latest existing):

1. `due_date` column + `fine_due_date()` helper + backfill + insert trigger (with the `late_fee` override: due on application date).
2. Weekly late fees: `fine_late_fee_runs_weekly`, rewritten `apply_fine_late_fees()`.
3. Pause: squad columns + `admin_set_player_pause` RPC + pause filters added to automation functions.
4. No-vote automation: `fine_no_vote_runs` (seeded with past events) + `apply_no_vote_fines()`.
5. Reminders: `fine_vote_reminder_runs` + `apply_vote_reminders()`.
   (Scheduling for 2/4/5 lives in the `fines-scheduler` Edge Function per section 5a, plus whatever cron/pg_net migration is needed to invoke it every 5 minutes.)
6. RPC updates: `admin_set_fine_entry` (late/late_10 exclusivity, due_date), read RPCs exposing due_date, `list_outstanding_fines_summary` rework.

TypeScript/React:

- `src/lib/fineCatalog.ts` (new presets), `fineAlerts.ts` (rescore), `finePush.ts` (+ server-side push helpers), `finePlayerCopy.ts` (copy), `clubApi.ts` (types/wrappers, pause RPC).
- `src/components/fines/FineTypeGrid.tsx` (cycling tile, new grid), `FinePickerModal.tsx`, `FineOneOffSection.tsx` (rename), `FineYourBalanceCard.tsx`, `FineSquadOwedCard.tsx`, `FineAlertBanner.tsx` (due dates).
- `src/pages/AdminFines.tsx` (save diff logic, pause toggle, paused indicators), `Fines.tsx` (copy, due dates).
- NEW `supabase-club/functions/fines-scheduler/index.ts` (canonical orchestrator, section 5a).
- `.github/workflows/apply-fine-late-fees.yml` + `scripts/apply-fine-late-fees.mjs` (weekly logic + push, backstop role only; the script calls the RPC directly as today). The standalone `supabase-club/functions/apply-fine-late-fees/index.ts` Edge Function is REDUNDANT once `fines-scheduler` exists: delete it and remove anything that invokes it, rather than leaving a third half-maintained trigger path.

Suggested `/fines` player copy (adapt as needed): "Fines are due by the last Sunday of the month. Fined in the final week? You get until the following month's last Sunday. Anything unpaid after its due date picks up £2 every week until it's cleared."

Docs: update the fines system markdown doc to match the new behaviour.

---

## 11. Acceptance checks (verify before finishing)

1. Fine created Sun 21 Jun 2026 has due_date 28 Jun; created Mon 22 Jun has due_date 26 Jul; created Tue 30 Jun has due_date 26 Jul.
2. Running `apply_fine_late_fees()` five days in a row in the same ISO week charges exactly once; the charge only hits players with entries past due_date; paused players never charged; each charged player would receive one push.
3. A late fee entry gets `due_date` = its application date (NOT the grace rule): a player whose only unpaid entry is a late fee applied last Monday IS charged again this Monday.
4. Event passes its start time -> within the scheduler interval, every active non-paused non-voter has exactly one £1 no_vote entry; re-running processes nothing; a player the admin already manually fined `no_vote` for that session is not duplicated; voters (including "unavailable" voters) are never fined.
5. Deploying against existing data fires zero historic no-vote fines and zero elapsed reminders.
6. Cycling tile: off -> £1 late -> £2 late_10 -> off; DB never holds both `late` and `late_10` for the same (session, player), even via direct RPC misuse.
7. Old `no_warm_up_top` entries still render with correct label/amount everywhere.
8. Warning levels: £4 owed due in 10 days = 1+0 = 1 = normal; £4 owed due tomorrow = 1+2 = 3 = warning; £4 owed overdue = 1+3 = 4 = CRITICAL (any overdue balance >= £4 pulses red; deliberate, since £2/week is accruing); £2 owed overdue = 0+3 = 3 = warning. Confirm the maths in tests.
9. Pausing a player mid-debt: their total stops growing, they get no reminders or no-vote fines, unpausing resumes with no back-charges.
10. ISO week idempotency behaves at the year boundary: runs in late Dec / early Jan (e.g. Mon 29 Dec 2025 = ISO 2026-W01) charge exactly once per ISO week, no skip and no double-charge. Use ISOYEAR, never calendar year.
11. `fineAlerts.ts` scoring has UNIT tests covering every row of the check-8 table, not just E2E coverage; the scoring table is easy to get subtly wrong.
12. Existing Playwright suite still passes; add/adjust tests for the picker cycling tile and the new copy at minimum.
