# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v16)** — see [ROADMAP-99.md](ROADMAP-99.md).  
> **Last updated:** 14 August 2026 · **Commit:** `5133594` on `main`

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~30 players, all close friends, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~704 kB JS (~195 kB gzip main chunk), admin routes lazy-loaded — up from ~691/192 kB in v15, see Performance  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings** (this cycle's work briefly introduced one `exhaustive-deps` warning — caught and fixed before merge, see Bug register #25)  
**Tests verified:** **52** unit tests (Vitest, 10 files, up from 38/8 — added same session once the coverage gap was raised) + **26** E2E tests (Playwright, 6 spec files across chromium + 2 iOS device projects, unchanged). See Testing section for exactly what's covered and what's genuinely still open.

**Supabase:** Club Hub project confirmed (`kqxsbb…` — EvidInsight); separate from WC predictor (`owkql…`). Migrations through **052** applied, operator confirmed same day.

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 11 Jun 2026 | 77/100 | P0 closed; Vercel live; CI; lineup builder |
| v2 | 19 Jun 2026 | 79/100 | ConfigRequired diagnostics; legacy WC cleanup |
| v3 | 19 Jun 2026 | 83/100 | Phase 1 done; skeletons; placeholder PWA icons |
| v4 | 19 Jun 2026 | 87/100 | Push wired; real crest; DDSFL 2026/27; fundraisers |
| v5 | 19 Jun 2026 | 90/100 | Lazy routes; live matchday; photos; events; copy audit |
| v6 | 20 Jun 2026 | 92/100 | Onboarding rework; passcode self-service; migration 019 |
| v7 | 20 Jun 2026 | 93/100 | Prod bug fixes; ChrisL format; photo_url grant; migrations 019–021 |
| v8 | 20 Jun 2026 | 94/100 | Finance admin — sponsorships, expenses, ledger dashboard; migration 022 |
| v9 | 20 Jun 2026 | 95/100 | All migrations 001–022 applied on Club Hub |
| v10 | 20 Jun 2026 | 96/100 | GK clean sheets; calendar archive; PWA install prompt; migrations 023–024 |
| v11 | 20 Jun 2026 | 98/100 | E2E in CI; team invite link; login/display split; migrations 025–028 |
| v12 | 21 Jun 2026 | 98/100 | Admin fines (032–035); late-fee automation; player `/fines` built but hidden |
| v13 | 13 Aug 2026 | 98/100 | Player `/fines` released; fines system rework (26/27); DDSFL vote-loss bug found + fixed; substitute appearance credit UX; migrations 036–047 |
| v14 | 14 Aug 2026 | 98/100 | Admin audit log routed (closes that named blocker); player-managed sponsor logos; committee to-do list; Canva graphics foundation (paused — mock only); all docs brought current through migration 049 |
| v15 | 14 Aug 2026 | 99/100 | Sentry **descoped by operator decision** — closed 30-friend deployment, WhatsApp is the incident channel, formal error monitoring isn't worth the overhead. That was the sole remaining item on the 99-score checklist; with it explicitly out of scope rather than merely undone, 99/100 is reached. No code changes that cycle beyond migration 050 (no-vote fine labels). |
| **v16 (this doc)** | **14 Aug 2026** | **99/100** | Same day as v15 — one continuous session. Admin player deletion (migration 051); a real appearance-tracking gap found and fixed via live investigation of a duplicate-account report, plus a full appearance/clean-sheet points rework (migration 052); Canva integration progressed materially then **parked mid-attempt by operator decision** — real Brand Template ID found, `canva-autofill` deployed live for the first time, OAuth token obtained once, hit a Canva-side outage, operator chose to pause rather than push through. No score-checklist items reopened, but **Testing debt has now compounded for a third cycle** — see Testing section for why that's a sharper concern this time than in v14. |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations **001–052** | ✅ **All applied on Club Hub** — operator confirmed this cycle |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secret | ⚠️ Needed by **two** workflows: `sync-ddsfl.yml` (daily) and `fines-automation.yml` (every 5 min) — confirm both have secrets set |
| Admin fines (log + payments) | ✅ Shipped — `/admin/fines`, migrations **032+** |
| Player fines page (`/fines`) | ✅ Live — dashboard alert banner, auto push on new fines, bank details for paying |
| Admin audit log | ✅ Routed v14 — `/admin/audit`, admin-only, linked from Admin hub |
| Player-managed sponsor logos | ✅ v14 — self-service upload on own player profile (migration 048) |
| Committee to-do list | ✅ v14 — `/admin/todo`, migration 049, RLS-gated |
| **Admin player deletion** | ✅ **New this cycle** — `admin_delete_player` (migration 051), admin-only, distinct from Revoke. Blocks deleting admins/self; blocks (with a clear message) if the player has finance or audit-log history logged against them, rather than silently erasing it. In-app `ConfirmDialog` used, not the browser's native `confirm()`. |
| **Appearance & clean-sheet points rework** | ✅ **New this cycle** — mandatory Starting XI checklist + un-gated Substitutes list at result-entry closes a real gap where plain starters (no goal/card/motm, no saved lineup) were never counted as having appeared. New `unused_sub` credit for named-but-unused bench players. Clean-sheet points for keeper + defenders now auto-inferred from Starting XI/Subs + stored position, not a second manual question. Migration 052 widens `match_events.event_type`; zero changes needed to most of the stats-aggregation code, which already generalised over event type. |
| **Canva graphics** | ⚠️ **Progressed, then parked mid-attempt by operator decision.** This cycle: found the real Brand Template ID (`DAHSSLFK7vs`), discovered it lives under a Canva Education Team distinct from the personal account the OAuth integration first authorized against, obtained a working access token, and — for the first time since v14 — **actually deployed** `canva-autofill` to Supabase (previously only registered, never live). Hit a Canva-side 503 mid-retry; operator chose to stop here rather than push through, and is weighing finishing the live-API path vs. switching to Canva's Bulk Create (pre-generate static images, no token needed) for a future cycle. `CANVA_ACCESS_TOKEN` deliberately left unset so the function reverts to its safe mock-result behaviour in the meantime. |
| README + `docs/SUPABASE-SETUP.md` | ✅ v14 — migration table, roles table, both edge functions documented (not refreshed again this cycle; migrations 051–052 not yet added to `SUPABASE-SETUP.md`'s table — see Roadmap) |
| ESLint | ✅ 0 / 0 (transiently 1 warning mid-cycle, fixed before commit — see Bug register #25) |
| GitHub Actions CI | ✅ Lint, build, Vitest, Playwright E2E (chromium + 2 iOS device projects) |
| Push notifications | ✅ Edge fn + Vercel VAPID key; fires on new fines |
| `send-push` edge function | ✅ Deployed to Club Hub |
| `fines-scheduler` edge function | ⚠️ Still unconfirmed — no local Supabase CLI/credentials to check (unchanged since v13) |
| `canva-autofill` edge function | ✅ **Deployed this cycle** (via Supabase Dashboard's browser editor — still no local CLI) — feature itself is parked, but the function is live and returning correct mock results |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. `admin_delete_player` is the most destructive admin capability in the app to date — full account, appearance, fine, and vote history erasure via `ON DELETE CASCADE` — and it's guarded accordingly: strict `is_admin`-only (not committee), can't target an admin or yourself, and a caught `foreign_key_violation` turns what would otherwise be an opaque Postgres error into "this player has finance or audit history — revoke instead" when the RESTRICT-protected tables (expenses/sponsorships `logged_by`, audit log `actor_id`) would block it. The `canva-autofill` Edge Function's design — real OAuth token stays a server-side Supabase secret, never a client-exposed `VITE_` variable — held up through this cycle's real integration attempt exactly as intended.

**Onboarding note:** Unchanged since v13 — login name (`ChrisL`) vs display name (`Chris L`), one-time and team invite links, quick admin add (migration 045).

---

## Changes since audit v15 (99/100)

Same-day, one continuous session. Started as a Canva API integration task, ended up surfacing and fixing a real production data-integrity gap along the way.

| Item | Status |
|------|--------|
| **Admin player deletion** — `admin_delete_player` (migration 051), admin-only, blocked on admin/self targets and on players with RESTRICT-protected finance/audit history. Distinct from Revoke, which only un-approves and leaves the row. In-app `ConfirmDialog` used for the confirmation, replacing a `window.confirm()` — closes one instance of a small, longstanding inconsistency (AdminEvents/Fixtures/Fundraisers/Training still use the native browser dialog, see Findings). | ✅ |
| **Real appearance-tracking gap found and fixed.** Investigating an operator report of a duplicate player account (two logins for the same person) surfaced that the account with real match history had a substitute appearance that silently never saved — traced to the Results-entry "Substitutes" section only rendering when a formal lineup had been saved for that fixture, which most fixtures don't have. Broader consequence: **any plain starter with no goal/card/motm and no saved lineup was never counted as having appeared, for any fixture, with no error or indication of the gap.** Fixed via a mandatory Starting XI checklist at the point of entering a result, independent of the (now-optional) formation picker. | ✅ |
| **Appearance & clean-sheet points rework** (migration 052) — new match-event types (`appearance`, `unused_sub`, `clean_sheet_gk`, `clean_sheet_def`) feed the existing points system with almost no changes to the aggregation code, which already generalised over event type. New points table: goal +10, assist +6, motm +12 (was +15), appearance +4, substitution +2 (was 0), clean_sheet_gk +6, clean_sheet_def +4, unused_sub +1, yellow −3, red −10. Clean-sheet keeper/defender credit auto-infers from Starting XI/Subs + stored squad position, live-synced until an admin makes a manual edit — deliberately designed so it doesn't ask the same question twice. | ✅ |
| **Canva integration progressed, then parked by operator decision** — real Brand Template ID found and wired in; discovered and resolved a Canva-account/Team mismatch that had been silently causing "not found" errors; obtained a working OAuth token; deployed `canva-autofill` live for the first time. Hit a Canva-side 503 mid-retry; operator chose to pause rather than push through, weighing the live-API path against switching to Canva Bulk Create (static, pre-generated images, no token) for later. | ⚠️ Parked mid-attempt, by request |
| **A genuine pre-existing data-quality defect surfaced (not caused) this cycle** — at least one fixture's `opponent` value has a double space (`"Durham  Rangers Fc"`), which broke naive `ilike` string-matching during the investigation above. Not user-visible (HTML collapses the whitespace in rendered UI), so not a functional bug, but worth a data-hygiene pass on `fixtures.opponent` at some point. Not fixed this cycle — flagged only. | ⚠️ Flagged, not fixed |
| Test coverage for what shipped this cycle (delete-player, appearance-points rework) | ✅ **Added same session** — 14 new unit tests (38→52) once the gap was raised; RPC-level and E2E coverage still open, see Testing section |
| GitHub Actions secrets, `fines-scheduler` deployment confirmation | ⚠️ Still operator, unchanged since v13 |

---

## Changes since audit v13 (98/100)

Smaller cycle than v13 by commit count, but closes the single item that's blocked "path to 99" the longest.

| Item | Status |
|------|--------|
| **Admin audit log routed** — `/admin/audit`, linked from Admin hub. Backend (migration 029) and the page component both existed before v11; the only thing missing for three audit cycles was a `<Route>` and a nav link. | ✅ |
| **Player-managed sponsor logos** — migration 048 adds `sponsor_name`/`sponsor_logo_url` to `profiles` (publicly SELECT-granted, mirroring `photo_url`) plus a `sponsor-logos` Storage bucket. Self-service RPCs (`prepare_sponsor_logo_upload`, `confirm_sponsor_logo_upload`, `delete_sponsor_logo`, `save_sponsor_name`) reuse the time-limited storage-grant pattern from player photos (migration 016), but authenticated as the player, not an admin. Initially placed on Dashboard, **relocated to the player's own profile page** per operator correction — matches the existing convention for self-editable fields (passcode change lives there too). | ✅ |
| **Admin visibility for sponsor data** — Admin → Squad list now shows each player's sponsor name + logo thumbnail with a genuine one-click download (fetches the blob client-side and forces a save with a sensible filename, not just an "open in new tab" link). No new migration — reused the public grant already in 048. | ✅ |
| **Committee to-do list** — migration 049, `committee_todo` table, RLS blocks direct access (same convention as fines/finance/lineups). `admin_set_todo_status` sets `completed_by`/`completed_at` atomically server-side, mirroring how fines RPCs never trust client-supplied `logged_by`. `/admin/todo` — add, assign to any squad/committee member, mark done/undo, full attribution shown. | ✅ |
| **Canva graphics foundation** — `lib/canva.ts` (mockable service), `canva-autofill` Edge Function (mirrors `send-push`'s session-auth pattern), `/admin/canva` template picker + generate flow. Deliberately built so the real Canva OAuth token can never live client-side. Operator has asked to pause here — no Canva account linked yet. | ⚠️ Paused by request |
| **Docs brought current** — `README.md` and `docs/SUPABASE-SETUP.md` were stale at migration 030 for three audit cycles running. Both now cover 031–049, the Fines Helper role, both new Edge Functions, and the four new admin tools. | ✅ |
| GitHub Actions secrets for DDSFL sync **and** fines automation | ⚠️ Still operator |
| Sentry | ❌ Still open — the one item with zero progress across **five** consecutive audits now |
| Test coverage for the four new features (audit log, sponsor logos, committee to-do, Canva) | ❌ None written — see Testing section |

---

## Changes since audit v14 (98/100)

Thin cycle — one small shipped fix, one scoring decision that closes the roadmap out.

| Item | Status |
|------|--------|
| **No-vote fine labels now include the event** — migration 050, `apply_no_vote_fines()` reissued. Entries read "No vote (vs Shildon AFC)" or "No vote (Training)" instead of a bare "No vote", matching the context already sent in the push notification. `fine_key` unchanged, forward-only (no backfill — `fine_entries` doesn't store which specific event an entry was for, so past rows can't be reliably re-labelled). | ✅ |
| **Sentry descoped — operator decision, not a gap.** For a closed ~30-player deployment where everyone is a close friend and the operator gets notified of problems via WhatsApp anyway, formal error monitoring was judged not worth the setup and ongoing overhead. This was the sole remaining item on the 99-score checklist across five consecutive audits. Descoping it (rather than leaving it "open" indefinitely for something that will never be prioritised) is the honest call — see Executive summary. | ✅ Descoped |

---

## Executive summary

| | |
|---|---|
| **Overall score** | **99 / 100** *(unchanged — no checklist item reopened)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 99 / 100 (audit v15, 14 Aug 2026, same day) |
| **Public-launch equivalent** | ~78 / 100 *(unaffected)* |
| **99 target** | Still reached — nothing formally on that checklist regressed. See caveat below on Testing. |

The topline holds at 99 because nothing on the original checklist reopened — but this cycle's real story is in the category detail, not the headline. Two things happened worth separating clearly:

**The good:** a genuine, previously-invisible data-integrity gap got found and fixed. An operator report about a duplicate player account led to discovering that appearance credit for plain starters (no goal, card, or MOTM) depended entirely on an *optional* saved formation lineup — most fixtures don't have one, so those appearances were silently never counted, with no error or indication anything was missing. That's now fixed with a mandatory Starting XI checklist at the point of entering a result, and clean-sheet credit for keeper/defenders is now auto-inferred from that checklist instead of a separate manual question. Real bug, found through real investigation, root-caused rather than patched around.

**The concern, caught and largely addressed same session:** this cycle initially shipped two more non-trivial features — admin player deletion (a genuinely destructive capability) and the appearance-points rework (meaningfully intricate logic: mutual-exclusion between Starting XI/Subs/Unused-subs, save-time dedup so scorers don't get double-credited, a live-syncing auto-inference effect with a manual-override escape hatch) — with zero new tests, same as v14's four features. v15 explicitly flagged that if this repeated it should be "treated as accumulating debt rather than a one-off." It did repeat, briefly — then 14 new unit tests went in before this audit closed, covering the pure logic behind both features plus a previously-100%-untested file (`playerProfileStats.ts`) that predates this cycle entirely. What's left open (server-side RPC guards, E2E, component-level UI logic) is now a smaller, more specific gap than a blanket "nothing was tested" — see Testing for the honest breakdown of what's covered and what isn't.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 93 | −1 | Excellent |
| 2 | [Security](#2-security) | 71 | — | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 73 | −1 | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 99 | — | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 95 | +2 | Excellent |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 85 | — | Excellent |
| 8 | [Database & Supabase](#8-database--supabase) | 99 | — | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 87 | −7 | Good, recovering |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 99 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 97 | — | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 95 | — | Excellent |

---

## 1. Code Quality & Architecture

**Score: 93 / 100** *(−1)* · **Excellent**

### Strengths
- `admin_delete_player` mirrors the established `SECURITY DEFINER` + session-token + role-check shape used by every other admin RPC, and adds a genuinely thoughtful touch: it catches `foreign_key_violation` specifically and re-raises a human-readable message ("this player has finance or audit history — revoke instead") rather than letting a raw Postgres constraint error reach the UI.
- Migration 052 is a single `ALTER TABLE ... CHECK` — no new tables, no new columns. The four new event types slot straight into `playerStats.ts`'s existing generic per-event loop with a one-line exclusion for `unused_sub`; nothing else in the aggregation code needed to change. Reuse of existing architecture over building a parallel system.
- Clean-sheet auto-inference (`autoDefenderIds`/`autoKeeperId` derived from Starting XI + stored squad position, synced via a "touched" escape hatch) is a real answer to direct operator feedback mid-session that the original design asked the same question twice — implemented as a genuine simplification, not just noted for later.
- `ResultEntryForm.tsx` reused the codebase's existing self-referential-event trick (`player_id === related_player_id` on a `substitution` row) for the new appearance credit rather than inventing a second mechanism, keeping one pattern for "this happened with no real event details" instead of two.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `051_admin_delete_player.sql` | Friendly `foreign_key_violation` handling instead of a leaked Postgres error. |
| Positive | `playerStats.ts` | New event types required a single-line change to the aggregation loop — architecture already generalised over event type. |
| Positive | `ResultEntryForm.tsx` | Clean-sheet credit auto-syncs from Starting XI/position with a manual-override escape hatch, not a second blank-by-default question. |
| Low | Testing | Admin player deletion and the appearance-points rework initially shipped with zero tests — third cycle running of that pattern. Caught and largely addressed same session (14 new unit tests). Server-side RPC guards and E2E for both features remain untested — see Testing section. |
| Low | `ResultEntryForm.tsx` | Briefly introduced an `exhaustive-deps` lint warning (helper took the whole `fixture` object but the effect's deps array only listed three of its fields) — caught and fixed same session before merge, matching the project's established "catch it before it ships" precedent (see Bug register #20/#21 from v14). |
| Low | Bundle | Main chunk grew ~691 kB → ~704 kB / ~192 kB → ~195 kB gzip this cycle — see Performance. |
| Low | `docs/SUPABASE-SETUP.md` | Migration table still stops at 050 — migrations 051–052 not yet documented there. |

---

## 2. Security

**Score: 71 / 100** · **Adequate for closed-squad use** *(~48 public-launch equivalent)*

`admin_delete_player` is the most destructive capability added to the admin surface since audit tracking began — full account, appearance, fine, and vote-history erasure via `ON DELETE CASCADE`. Guarded appropriately for what it does: strict `is_admin`-only (not `is_committee`, unlike most other admin RPCs — a deliberate, correct escalation given the blast radius), explicit checks blocking a target who is an admin or is the caller themselves, and the RESTRICT-protected tables (expense/sponsorship `logged_by`, audit log `actor_id`) still can't be silently erased — the delete fails with a clear message instead. No regression elsewhere; sponsor logo and committee to-do RPCs from v14 unchanged and still correctly scoped.

---

## 3. Performance

**Score: 73 / 100** *(−1)* · **Good for team scale**

Main JS chunk grew ~691 kB → ~704 kB (~192 kB → ~195 kB gzip) this cycle — small in absolute terms, but the first measured increase since the bundle-size watch item was first flagged, now four audit cycles running without a `manualChunks` pass. `AdminResults`/`AdminUsers` are still separately lazy-loaded (15.45 kB / 15.93 kB respectively), so the growth is coming from something in the main/shared bundle, not the new admin sections themselves — worth a proper look if it keeps trending up rather than continuing to defer it.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

No accessibility-focused work this cycle — unchanged since v10.

---

## 5. User Experience

**Score: 99 / 100** · **Excellent**

Admins now have a real Delete for departed/duplicate players instead of only Revoke-and-leave-pending — closes a gap raised directly this cycle. Clean-sheet credit no longer asks the same question twice (auto-inferred from Starting XI, editable only when needed). The disappearing-Substitutes-section bug (only rendered when a lineup existed) is fixed, and confirmed as fixed against the exact case that surfaced it.

Trade-off worth naming rather than hiding: Results entry is now a longer form — Starting XI, Substitutes, Unused substitutes, and (on a shutout) a Defenders override, all before the existing Match events section. More accurate, more clicks. Deliberate and requested, not accidental bloat, but real to whoever enters results week to week.

| Severity | Issue |
|----------|-------|
| Low | Results entry form has grown to four tap-list sections plus Match events — worth watching if it starts feeling like a chore rather than a checklist. |
| Low | Canva template list is still placeholder-adjacent for anyone who reopens `/admin/canva` while the integration is parked — shows the real template ID now, but calling it "live" would be wrong; it'll mock-result until `CANVA_ACCESS_TOKEN` is set again. |
| Low | No admin-side way to bulk-review which players have/haven't set a sponsor — unchanged since v14. |

---

## 6. Data Integrity & Business Logic

**Score: 95 / 100** *(+2)* · **Excellent**

The standout finding this cycle. Investigating an operator report of a duplicate player account — same person, two logins, one apparently unable to register availability — led to discovering the real mechanism: `fetchAvailablePlayersForFixture` and `ResultEntryForm`'s Substitutes section both silently required a saved `lineups` row to work at all, and most fixtures never get one. A "yes" availability vote or a bench-toggle credit against a fixture with no saved lineup simply vanished from every downstream view with **no error, no warning, nothing** — a real, live, previously-undetected gap between what admins entered and what the app actually recorded. Confirmed and repaired for the specific case that surfaced it (a genuine match appearance, backfilled via direct SQL once the root cause was understood), then closed properly at the source: appearance credit no longer depends on an optional formation lineup existing at all.

`admin_delete_player`'s CASCADE behaviour is correct-by-design for a genuinely departed player (matches "he's left" exactly), and the RESTRICT-protected tables mean finance/audit history can't be accidentally swept away in the same action — a real integrity safeguard, not just a permissions check.

---

## 7. DDSFL Integration & Data Sync

**Score: 85 / 100** · **Excellent**

Unchanged this cycle — no DDSFL-related work.

---

## 8. Database & Supabase

**Score: 99 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations **001–052** | ✅ **All confirmed applied on Club Hub this cycle** |
| **Admin player deletion (051)** | ✅ Applied — friendly FK-violation handling verified in place |
| **Appearance/clean-sheet event types (052)** | ✅ Applied — single `CHECK` constraint widen, no new tables |
| `fines-scheduler` edge function | ⚠️ Still unconfirmed — unchanged since v13 |
| **`canva-autofill` edge function** | ✅ **Deployed live this cycle** for the first time (previously only registered in `supabase/config.toml`) — no CLI available locally, deployed via Supabase Dashboard's browser editor instead |
| `send-push` | ✅ Deployed |
| Admin audit log schema + RPCs (029) | ✅ Shipped and reachable since v14 |

---

## 9. Testing & Reliability

**Score: 87 / 100** *(+11 from 76 same-day; still −7 net vs. v15's 84)* · **Good, recovering**

Caught mid-cycle and substantially addressed before this audit closed. **Unit tests: 38 → 52** (E2E unchanged at 26). New coverage, added same session:

- `playerStats.test.ts` — the four new event types (`appearance`, `unused_sub`, `clean_sheet_gk`, `clean_sheet_def`) are now directly tested, including the one behaviour most worth protecting: `unused_sub` correctly does **not** count as an appearance, and appearance/clean-sheet rows for the same player don't double-count.
- `playerProfileStats.test.ts` — new file, **zero coverage existed for this file before today**, not just for this cycle's changes. Full points table now locked in (`eventImpact`), plus `matchImpactPoints` and `getSeasonImpactTotal`.
- `mockData.test.ts` — new file, covers `removeMockUser` (the mock-mode counterpart to `admin_delete_player`): removes from both the admin list and squad, throws cleanly on an unknown or already-removed id.

**What's still genuinely untested, and why it's not scored as a full recovery to v15's 84:**

- **Server-side RPC guards.** `admin_delete_player`'s `is_admin`-only check, the block on deleting an admin or yourself, and the friendly `foreign_key_violation` message are all SQL, not TypeScript — and this project has no database test harness for *any* RPC, so this isn't a new gap introduced this cycle, but it is a real one that remains open.
- **E2E, unchanged at 26.** Neither admin player deletion nor the new Results-entry sections have integration-level coverage — the unit tests prove the pure logic is correct in isolation, not that the full click-through flow works.
- **`ResultEntryForm.tsx`'s own UI-embedded logic** (the mutual-exclusion between Starting XI/Subs/Unused-subs tap-lists, the clean-sheet auto-sync "touched" escape hatch) has no component-level test — consistent with the rest of this codebase, which has never had a component-testing convention (no React Testing Library in the project), so closing this would be a new investment, not catching up to an existing standard.

CI unchanged in shape: lint → build → Vitest (verify job) + Playwright E2E (separate job).

---

## 10. DevOps & Deployment

**Score: 99 / 100** · **Excellent**

`canva-autofill` went from "registered but never deployed" to actually live this cycle — the gap flagged in v14/v15 is closed, even though the feature it serves is now paused. Deployed via the Supabase Dashboard's browser-based function editor since there's still no Supabase CLI on the dev machine — same workaround used for every Supabase-side change this session, worth setting up properly if this keeps coming up. No Sentry — descoped by operator decision, not a gap.

---

## 11. UI & Design Consistency

**Score: 97 / 100** · **Excellent**

New Starting XI / Substitutes / Unused subs / Defenders sections reuse the exact same tap-pill pattern already established for the bench-toggle credit — no new interaction model introduced for what's conceptually the same action four times over. The delete-player confirmation now uses the app's own `ConfirmDialog` instead of the browser's native `confirm()`, closing one instance of a small inconsistency — though `AdminEvents`, `AdminFixtures`, `AdminFundraisers`, and `AdminTraining` still use native `confirm()` for their own delete actions, so the inconsistency isn't fully closed app-wide, just narrowed by one page.

---

## 12. Copy & Content

**Score: 95 / 100** · **Excellent**

New copy this cycle ("Starting XI · who started?", "Unused substitutes · on the bench, didn't play", the delete-player confirmation message) matches the plain, direct tone used everywhere else in the admin surface — no jargon, states exactly what tapping/confirming does.

---

## Bug register

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | ~~Medium~~ | Migration 011 not on prod | ✅ |
| 2 | ~~Medium~~ | GK clean sheets over-count | ✅ `ed6bde1`, migration 024 |
| 3 | ~~Low~~ | Vitest worker timeout (Windows/OneDrive) | ✅ CI container; `test:ci` locally |
| 4 | ~~Low~~ | Placeholder crest | ✅ |
| 5 | ~~Low~~ | Push without Vercel VAPID | ✅ |
| 6 | ~~Medium~~ | Stale fixtures in upcoming | ✅ |
| 7 | ~~Medium~~ | Live match lost on crash | ✅ |
| 8 | ~~Medium~~ | Admin pre-entered name on invite | ✅ v6 |
| 9 | ~~Low~~ | Migration 019 GRANT ambiguous | ✅ |
| 10 | ~~High~~ | Dashboard/calendar 400 — match_events embed | ✅ `7189fcc` |
| 11 | ~~Medium~~ | Stats 400 — `photo_url` not granted | ✅ 021 |
| 12 | ~~Low~~ | AdminLineup "Invalid Date" | ✅ `7265a28` |
| 13 | ~~Medium~~ | No E2E tests | ✅ `7265a28` |
| 14 | ~~Low~~ | Empty production squad → no stats/profiles | ✅ Migration 036 |
| 15 | ~~Low~~ | Migrations 023–028 not yet on prod | ✅ Operator |
| 16 | Low | GitHub Actions secrets missing → DDSFL sync fails nightly | ⚠️ Operator — also blocks fines automation |
| 17 | ~~Low~~ | Player `/fines` built but route hidden | ✅ `72fb7e0` |
| 18 | ~~High~~ | DDSFL sync fixture-merge cascaded away player votes, false whole-squad no-vote fines | ✅ `cc52303` — **fines from 14 Jul – 13 Aug reviewed and sorted manually, operator confirmed** |
| 19 | ~~Low~~ | Admin audit log built but not routed | ✅ **Fixed this cycle** — `/admin/audit` |
| 20 | Low | Mock "Created by Unknown" on committee to-do (dev-bypass session user not seeded into mock profiles list) | ✅ Caught and fixed same session, before ever shipping |
| 21 | Low | Sponsor logo card initially placed on Dashboard instead of player profile | ✅ Corrected same session per operator feedback |
| 22 | High | Substitutes section on Results entry only rendered when a saved formation lineup existed for that fixture — most fixtures don't have one, so bench-credit was silently unavailable with no indication anything was missing | ✅ Fixed this cycle — section un-gated, no longer depends on a lineup |
| 23 | High | Plain starters (no goal/assist/motm/card) had no appearance credit path at all unless a lineup happened to be saved — a real, previously undetected gap affecting stats accuracy for an unknown number of past fixtures | ✅ Fixed this cycle — mandatory Starting XI checklist is now the source of truth, independent of the lineup tool |
| 24 | Low | At least one fixture has a double space in `opponent` (`"Durham  Rangers Fc"`) — broke naive SQL `ilike` matching during investigation; not user-visible in rendered UI | ⚠️ Flagged, not fixed — data-hygiene pass recommended |
| 25 | Low | `ResultEntryForm.tsx` briefly introduced an ESLint `exhaustive-deps` warning mid-cycle | ✅ Caught and fixed same session, before ever shipping |

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login (login name + passcode) | Dev bypass / ✅ | ✅ |
| One-time invite / team invite link / quick admin add | ✅ | ✅ |
| Player fines (`/fines`), admin fines, fines-only role | ✅ | ✅ |
| Weekly late-fee automation, no-vote automation, player pause | — | ✅ |
| Starting XI / Subs / Unused subs / clean-sheet points | ✅ | ✅ |
| **Admin player deletion** | ✅ | ✅ **New this cycle** |
| Admin audit log (`/admin/audit`) | ✅ | ✅ |
| Player-managed sponsor logo + name (own profile) | ✅ | ✅ |
| Admin sponsor visibility + download (Squad list) | ✅ | ✅ |
| Committee to-do (`/admin/todo`) | ✅ | ✅ |
| **Canva template graphics** (`/admin/canva`) | ✅ mock result | ⚠️ Mock result — function is deployed, but `CANVA_ACCESS_TOKEN` deliberately unset while parked |
| Push notifications (incl. new-fine push) | ✅ | ✅ |
| PWA install prompt | ✅ | ✅ |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **001–052** on Club Hub | ✅ Operator confirmed |
| 2 | Review fines applied 14 Jul – 13 Aug for wrongful `no_vote` charges (Bug #18) | ✅ Operator confirmed — sorted manually |
| 3 | Generate team invite link (Admin → Squad members) | ✅ Operator confirmed |
| 4 | Brief squad: sign in as **ChrisL**-style login name | ✅ Operator confirmed |
| 5 | GitHub Actions secrets for **both** DDSFL and fines-automation workflows | ⚠️ Operator, unchanged since v13 |
| 6 | Confirm `fines-scheduler` Edge Function deployed | ⚠️ **Unknown** — no local Supabase CLI/credentials to verify |
| 7 | Decide Canva's future: finish the live API path or switch to Bulk Create | ⚠️ Operator — parked mid-attempt, no rush |

### P1 — Path to 99 ✅ Reached

See [ROADMAP-99.md](ROADMAP-99.md) — now maintained as the real ongoing to-do list rather than a score chase.

| # | Task | Status |
|---|------|--------|
| 1–14 | Everything through v15's list | ✅ Closed |
| 15 | **Sentry** | ✅ **Descoped — operator decision.** Not pursued: closed ~30-friend deployment, WhatsApp is the incident channel, not worth the setup/maintenance overhead for this risk profile. |
| 16 | **Test coverage for admin player deletion + appearance-points rework** | ✅ **Unit coverage added same session** (38→52 tests). Still open: server-side RPC guards (no DB test harness exists in this project for any RPC) and E2E for both new flows (still 26, unchanged). See Testing section. |

---

## Summary

**99 / 100** — still reached, nothing on the formal checklist reopened. The real content of this cycle: a genuine, previously-invisible data-integrity gap (appearance credit silently depending on an optional saved lineup) was found through live investigation of an operator-reported issue and fixed at the root, not patched around. Admin player deletion shipped, properly guarded. Canva integration got substantially further — real template ID, a working token, the Edge Function actually deployed for the first time — then was deliberately parked by operator decision after a Canva-side outage, rather than pushed through under pressure.

Testing debt briefly repeated for a third cycle — flagged as a watch-item in v14, held flat through v15, then two more untested features shipped here too. Unlike the previous two cycles, it didn't stay that way: 14 new unit tests went in same session once the gap was raised, taking the suite from 38 to 52 and closing out both the new logic *and* a pre-existing blind spot (`playerProfileStats.ts` had zero coverage before today, unrelated to this cycle specifically). What's still open — server-side RPC guards, E2E for the two new flows — is real but smaller and more specific than "nothing was tested," and doesn't require a database test harness this project has never had, just deliberate follow-up. See Testing section for the honest line between what's covered and what isn't.

**Operator:** GitHub Actions secrets for both workflows, confirm `fines-scheduler` is deployed (can't check this remotely), decide Canva's path forward when ready. Migrations through 052 confirmed applied.

**Engineering, when picked up:** E2E coverage for admin player deletion and the Results-entry rework is the standing recommendation — see Testing section and [ROADMAP-99.md](ROADMAP-99.md) for the full to-do list.

---

*End of Club Hub audit v16. App baseline `5133594`; docs updated 14 August 2026.*
