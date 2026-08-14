# BMFC Club Hub — Roadmap (99/100 reached)

**Baseline:** [AUDIT.md](AUDIT.md) v16 — **99 / 100** (14 August 2026, same day as v15 — one continuous session)  
**Original target:** 99 / 100 — reached in v15. Sentry, the sole remaining item on that checklist, was **descoped by explicit operator decision**: closed ~30-player deployment, everyone's a close friend, problems surface over WhatsApp faster than a monitoring dashboard would anyway. Not worth the setup and ongoing overhead for this risk profile.  
**This doc now:** kept as the actual ongoing to-do list, not a score chase. See below.

---

## Your actual to-do list

The "99-score checklist" is closed — there's nothing left on it. That's a different thing from "nothing left to do." This is the real list.

### Operator — only you can do these

| # | Task | Notes |
|---|------|-------|
| 1 | GitHub Actions secrets — `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Gates **two** workflows: `sync-ddsfl.yml` (daily) and `fines-automation.yml` (every 5 min). Repo → Settings → Secrets and variables → Actions. |
| 2 | Confirm `fines-scheduler` Edge Function is deployed; deploy if not | `supabase functions deploy fines-scheduler` — **status unknown**, no Supabase CLI or project credentials available locally to check this from the dev machine. Check Supabase Dashboard → Edge Functions, or `supabase functions list`. |
| 3 | **Canva — parked mid-attempt, decide the path forward when ready** | Got much further this cycle: real Brand Template ID found (`DAHSSLFK7vs`), the account/Team mismatch that was causing silent "not found" errors resolved, a working OAuth token obtained, and `canva-autofill` actually deployed live for the first time. Hit a Canva-side 503 mid-retry and chose to stop rather than push through. Two ways to resume — (a) redo the OAuth token (it expires every 4h, ideally via Postman this time, not the terminal script) and finish the live-API path, or (b) switch to **Canva Bulk Create** instead: pre-generate goalscorer/MOTM images for the whole squad once via Canva's own UI, upload as static files, no token/API at all. Matchday graphics would stay manual either way, since that one's fixture-specific. `CANVA_ACCESS_TOKEN` is deliberately unset right now so the feature shows its normal mock result instead of a live error. |
| ~~4~~ | ~~Apply migration 050~~ | ✅ **Done — and 051, 052 also applied this cycle.** |
| ~~5~~ | ~~Generate the team invite link~~ | ✅ **Done.** |
| ~~6~~ | ~~Brief the squad on **ChrisL**-style login~~ | ✅ **Done.** |
| ~~7~~ | ~~Review fines applied 14 Jul – 13 Aug for the vote-loss bug~~ | ✅ **Done — confirmed sorted manually.** |
| ~~8~~ | ~~Sentry~~ | ✅ **Descoped.** Not being pursued — see top of doc. |

### Engineering — ask when you want these picked up

| # | Task | Notes |
|---|------|-------|
| 1 | **Test coverage for admin player deletion + appearance-points rework — now the top priority here** | Zero automated coverage for either, shipped this cycle. Third cycle running of shipping without tests (v14 had four untested features too) — this time it's a destructive delete action and genuinely branchy stats logic (Starting XI/Subs/Unused-subs mutual exclusion, save-time appearance dedup, the clean-sheet auto-sync "touched" escape hatch). See AUDIT.md v16 Testing section — this dropped that category from 84 to 76. |
| 2 | Finish the Canva integration, or pivot to Bulk Create | See operator task #3 above — needs an operator decision first on which path, then this becomes an engineering task either way. |
| 3 | `docs/SUPABASE-SETUP.md` migration table | Stops at 050 — add 051 (admin player deletion) and 052 (appearance points event types). |
| 4 | Playwright E2E: team join link (`/join/:token`) | Never got E2E coverage even before v14. |
| 5 | Playwright E2E: fines automation (no-vote, late fees, reminders) | Only SQL-side idempotency tables guard this currently. |
| 6 | Unit tests: `fineAlerts`, `lineupFormations.ts`, `getAuthErrorMessage` | Carried over from several audits back. |
| 7 | Accessibility — passcode fieldset, modal focus trap, contrast pass | Optional for a closed ~30-player squad, but open since v10. |
| 8 | Bundle size — main chunk now ~704 kB / ~195 kB gzip, up from ~691/192 | First actual measured increase since this was flagged. Not urgent, but worth a `manualChunks` pass if the trend continues — four cycles flagged now. |
| 9 | Data hygiene: `fixtures.opponent` has at least one double-space value (`"Durham  Rangers Fc"`) | Not user-visible (HTML collapses it), but broke direct SQL lookups this cycle. Worth a cleanup pass across the `fixtures` table. |

---

## Overview

| Milestone | Score | Status |
|-----------|------:|--------|
| v5 — lazy routes, live matchday, photos | 90 | ✅ |
| v6 — invite onboarding, passcode self-service | 92 | ✅ |
| v7 — prod fixes, ChrisL, photo grant | 93 | ✅ |
| v8 — finance admin (sponsorships + expenses) | 94 | ✅ |
| v9 — all migrations 001–022 on Club Hub | 95 | ✅ |
| v10 — GK clean sheets, calendar archive, PWA prompt | 96 | ✅ |
| v11 — E2E in CI, team invite link, login/display split | 98 | ✅ |
| v12 — admin fines, late-fee automation | 98 | ✅ |
| v13 — player fines released, fines rework, DDSFL vote-loss fix, sub credit UX | 98 | ✅ |
| v14 — admin audit log routed, sponsor logos, committee to-do, Canva foundation | 98 | ✅ |
| v15 — no-vote fine labels; Sentry descoped by operator decision | 99 | ✅ **Target reached** |
| **v16 — admin player deletion; real appearance-tracking gap found + fixed; appearance/clean-sheet points; Canva parked mid-attempt** | **99** | ✅ Same day as v15 |

---

## Timeline

```mermaid
gantt
    title Roadmap — 99/100 reached 14 Aug 2026
    dateFormat  YYYY-MM-DD
    section v13-v14 DONE
    Player fines page released               :done, v13f, 2026-08-01, 1d
    Substitutes + credit (046-047)            :done, v13g, 2026-08-13, 1d
    DDSFL vote-loss bug found + fixed         :done, v13h, 2026-08-13, 1d
    Admin audit log routed                    :done, v14a, 2026-08-14, 1d
    Sponsor logos (048)                       :done, v14b, 2026-08-14, 1d
    Committee to-do (049)                     :done, v14c, 2026-08-14, 1d
    Canva foundation (paused)                 :done, v14d, 2026-08-14, 1d
    Docs brought current                      :done, v14e, 2026-08-14, 1d
    section v15 DONE — target reached
    No-vote fine event labels (050)           :done, v15a, 2026-08-14, 1d
    Sentry descoped by operator decision      :done, v15b, 2026-08-14, 1d
    section v16 DONE — same day
    Admin player deletion (051)               :done, v16a, 2026-08-14, 1d
    Appearance-tracking gap found + fixed     :done, v16b, 2026-08-14, 1d
    Appearance/clean-sheet points (052)       :done, v16c, 2026-08-14, 1d
    Canva progressed then parked by request   :done, v16d, 2026-08-14, 1d
    section Ops — real work, no score impact
    Apply migrations 001-052 on Supabase      :done, ops1, 2026-08-14, 1d
    GitHub secrets - DDSFL + fines-automation :active, ops2, 2026-08-14, 1d
    Confirm fines-scheduler deployed          :active, ops3, 2026-08-14, 1d
    section Blocked on operator
    Decide Canva path - finish or Bulk Create :b1, TBD, 1d
    section Top priority next
    Tests for delete-player + points rework   :t1, TBD, 2d
    section Optional polish
    Test coverage for v14 features            :t2, 2026-09-01, 2d
    Passcode fieldset + focus trap            :a1, 2026-09-01, 1d
```

---

## Phase 19 — Sentry descoped ✅

Five straight audits named this the last blocker to 99. Closed by decision, not by shipping.

| Task | Status | Notes |
|------|--------|-------|
| Evaluate whether Sentry is worth the setup/maintenance cost for this deployment | ✅ | Operator call: closed ~30-friend squad, WhatsApp already serves as the incident channel |
| Remove as an open item from AUDIT.md / ROADMAP-99.md | ✅ | This cycle |
| Reflect the decision in the score | ✅ | 98 → 99 — see AUDIT.md v15 Executive Summary for the full reasoning |

---

## Phase 20 — Admin player deletion ✅

Revoke only ever un-approved a player and left the row behind. Departed/duplicate accounts had no real removal path.

| Task | Status | Ref |
|------|--------|-----|
| `admin_delete_player` — admin-only, blocks admin/self targets | ✅ | `051` |
| Blocks (with a clear message, not a raw Postgres error) if the player has finance or audit-log history that would be silently erased | ✅ | `051` — catches `foreign_key_violation` |
| Delete button on both the Pending-approval cards and the All-members table | ✅ | `AdminUsers.tsx` |
| In-app `ConfirmDialog` for the confirmation, not the browser's native `confirm()` | ✅ | Matches the pattern already used in `AdminFines.tsx` |

---

## Phase 21 — Appearance-tracking gap found + fixed, appearance/clean-sheet points ✅

Started as an operator report of a duplicate player account. Turned into finding a real, previously-invisible gap in how the app records who actually played.

| Task | Status | Ref |
|------|--------|-----|
| Root cause found: appearance credit for plain starters (no goal/card/motm) depended on an *optional* saved formation lineup — most fixtures don't have one | ✅ Diagnosed | Confirmed via direct SQL against production |
| Mandatory Starting XI checklist added to Results entry — independent of whether the (still-optional) formation picker was used | ✅ | `ResultEntryForm.tsx` |
| Substitutes section un-gated — previously only rendered when a lineup existed, silently hiding bench-credit for most fixtures | ✅ | Same root cause as the disappearing-button bug that surfaced this whole investigation |
| New "Unused substitutes" bench roll-call — small credit for being named but not brought on | ✅ | |
| Clean-sheet credit for keeper + defenders auto-inferred from Starting XI/Subs + stored squad position, live-synced with a manual-override escape hatch | ✅ | Simplified mid-cycle after operator feedback that the first design asked the same question twice |
| New points table: goal +10, assist +6, motm +12, appearance +4, substitution +2, clean_sheet_gk +6, clean_sheet_def +4, unused_sub +1, yellow −3, red −10 | ✅ | `playerProfileStats.ts` |
| New `match_events` types (`appearance`, `unused_sub`, `clean_sheet_gk`, `clean_sheet_def`) | ✅ | `052` |
| Real missing appearance backfilled for the specific case that surfaced the bug | ✅ | Direct SQL, once root cause understood |
| Automated tests for any of the above | ❌ | **Top engineering priority — see to-do list at top of this doc** |

---

## Phase 18b — No-vote fine event labels ✅

| Task | Status | Ref |
|------|--------|-----|
| `apply_no_vote_fines()` reissued — label now includes the fixture/training | ✅ | `050` |
| Uses parentheses, not an em dash, per `docs/COPY-RULES.md` | ✅ | |
| Forward-only, no backfill (event not stored on existing rows, can't reliably re-derive) | ⚠️ Flagged, not fixable without new tracking | |

---

## Phase 14 — Admin audit log routed ✅

The single longest-open item on this roadmap prior to v15. Backend existed since before v11; three consecutive audits flagged it as "built but unreachable."

| Task | Status | Ref |
|------|--------|-----|
| Route `/admin/audit` | ✅ | `App.tsx` |
| Admin-only gate matching the RPC's own check (`requireAdmin`, not just `adminOnly`) | ✅ | |
| Nav link from Admin hub | ✅ | `Admin.tsx` |

---

## Phase 15 — Player-managed sponsor logos ✅

| Task | Status | Ref |
|------|--------|-----|
| `sponsor_name` / `sponsor_logo_url` on `profiles`, publicly SELECT-granted (mirrors `photo_url`) | ✅ | `048` |
| Self-service Storage upload — time-limited grant pattern, same as player photos (016) but player-authenticated, not admin | ✅ | `048` |
| "My sponsor" card — placed on Dashboard first, **relocated to player's own profile** after operator correction | ✅ | `PlayerProfileView.tsx` |
| Admin-side visibility on Squad list + one-click real download (fetch → blob → forced save) | ✅ | `AdminSquad.tsx` — no new migration needed |

---

## Phase 16 — Committee to-do list ✅

| Task | Status | Ref |
|------|--------|-----|
| `committee_todo` table, RLS blocks direct access | ✅ | `049` |
| RPCs: create, list, set status — admin/committee only (`assert_committee_user`) | ✅ | `049` |
| `completed_by`/`completed_at` set atomically server-side, reinforced by a table-level `CHECK` constraint | ✅ | `049` |
| `/admin/todo` — add, assign to any squad/committee member, mark done/undo, full attribution | ✅ | `AdminTodo.tsx` |

---

## Phase 17 — Canva graphics ⚠️ Parked mid-attempt by operator decision

Built to be safe-by-construction: the Canva OAuth token can never live in a client-exposed `VITE_` variable, so the real API call is server-side only, gated the same way `send-push` is. Got substantially further this cycle than "foundation" — genuinely mid-integration when it got parked.

| Task | Status | Ref |
|------|--------|-----|
| `lib/canva.ts` — mockable service, template list, `triggerAutofillDesign` | ✅ | |
| `canva-autofill` Edge Function — mirrors `send-push`'s session-auth shape; returns a labelled mock result when `CANVA_ACCESS_TOKEN` is unset | ✅ | `supabase-club/functions/canva-autofill/` |
| `/admin/canva` — template picker, player picker, generate flow | ✅ | `AdminCanva.tsx` |
| Registered in `supabase/config.toml` | ✅ | |
| **Real Brand Template ID found and wired in** (`DAHSSLFK7vs`) — lives in a Canva Education Team distinct from the personal account originally assumed, which was the actual cause of an earlier "not found" API error | ✅ This cycle | |
| **`canva-autofill` deployed live** for the first time (previously only registered, never live) — via Supabase Dashboard's browser editor, no CLI locally | ✅ This cycle | |
| OAuth token obtained once via a one-off Node script | ✅ This cycle | Expires every 4h, no auto-refresh built |
| Data fields tagged on the Canva template itself (player photo/name, sponsor logo as fillable fields) | ❌ Not done | Needed either way before autofill can vary content per player |
| Image asset upload step (player photo, sponsor logo) | ❌ Not done | Only text fields (`player_name`, `sponsor_name`) are wired |
| **Parked here** — hit a Canva-side 503 mid-retry, operator chose to stop rather than push through | ⚠️ | `CANVA_ACCESS_TOKEN` deliberately left unset so the feature shows its safe mock result in the meantime |
| **Resume when ready — pick one:** (a) redo the OAuth token (ideally via Postman, not the terminal script — copy/paste from a terminal caused real problems this cycle), tag data fields, wire up image uploads; or (b) switch to **Canva Bulk Create** instead — pre-generate goalscorer/MOTM images for the whole squad as a one-off batch via Canva's own UI, upload as static files, no token/API needed at all. Matchday graphic would stay manual regardless, since it's fixture-specific. | Open — **operator decision pending, no rush** | |

---

## Phase 18 — Documentation debt ✅

| Task | Status | Ref |
|------|--------|-----|
| `README.md` migration reference — was stuck at "001–028" since v11 | ✅ | Now "001–049" |
| `README.md` Features/Roles tables — missing fines, sponsor logos, audit log, committee to-do, Fines Helper role | ✅ | Updated |
| `docs/SUPABASE-SETUP.md` migration table — stalled at 030 for three audit cycles | ✅ | Now covers 031–050 |
| `docs/SUPABASE-SETUP.md` — `fines-scheduler` and `canva-autofill` Edge Functions undocumented | ✅ | New "Other Edge Functions" section |
| `docs/SUPABASE-SETUP.md` role permissions table — missing Fines Helper row | ✅ | Added |

---

## Phase 11 — Fines system rework, 26/27 season ✅

Unchanged since v13 — full detail in AUDIT.md v13 history. All migrations (037–044) confirmed applied.

---

## Phase 12 — Data integrity: DDSFL vote-loss bug ✅

Fix and fines review both closed. Charges from the 14 Jul – 13 Aug window were checked and sorted manually, operator confirmed.

---

## Phase 13 — Substitute appearance credit UX ✅

Unchanged since v13. Migrations 046–047 confirmed applied.

---

## Phase 1–10 — Previously complete

Onboarding, prod hotfixes, finance admin, calendar/PWA polish, GK clean sheets, team invite, admin fines + late-fee automation. All migrations 001–035 confirmed applied. See AUDIT.md v11–v13 history for detail.

---

## Phase 7 — Ops closure

| Task | Status | Notes |
|------|--------|-------|
| Apply **001–052** on Club Hub | ✅ | Operator confirmed, including 051 (delete player) and 052 (appearance points) applied this cycle |
| **Review fines applied 14 Jul – 13 Aug for the vote-loss bug window** | ✅ | Operator confirmed — sorted manually |
| Generate team invite link (Admin → Squad members) | ✅ | Operator confirmed |
| Brief squad on **ChrisL** login format | ✅ | Operator confirmed |
| GitHub Actions secrets — **both** `sync-ddsfl.yml` and `fines-automation.yml` | ⚠️ | `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; optional `FINES_SCHEDULER_SECRET` |
| Deploy `fines-scheduler` Edge Function | ⚠️ **Unknown** | No local Supabase CLI/credentials to check — verify via Dashboard → Edge Functions |
| Decide Canva's path forward — finish live API or switch to Bulk Create | ⚠️ | Parked mid-attempt this cycle, no rush — see Phase 17 |
| ~~Sentry~~ | ✅ **Descoped** | Operator decision — see Phase 19 |

---

## Phase 2 — Testing depth (dropped to 76 this cycle — no longer just a flag)

| Task | Status |
|------|--------|
| Core suite (playerNames, liveMatchEvents, cleanSheet, bench-toggle credit) | ✅ |
| iOS device E2E, admin fines E2E | ✅ |
| Coverage for audit log, sponsor logos, committee to-do, Canva (v14) | ❌ Still none |
| **Coverage for admin player deletion (v16)** | ❌ None — a destructive action with an untested FK-violation guard |
| **Coverage for appearance-points rework (v16)** | ❌ None — Starting XI/Subs/Unused-subs exclusion logic, save-time dedup, and the clean-sheet auto-sync escape hatch are all untested |
| Playwright E2E: team join link (`/join/:token`) | Open |
| Playwright E2E: fines automation (no-vote, late fees, reminders) | Open |
| Unit tests: `lineupFormations.ts`, `getAuthErrorMessage`, `fineAlerts` | Open |

---

## Phase 9 — Accessibility

Optional for a closed ~30-player squad. Unchanged since v10.

| Task | Status |
|------|--------|
| Skip-to-content, labelled forms | ✅ |
| Passcode fieldset + modal focus trap | Open |
| Colour contrast spot-check | Open |

---

## Category scores (v15 → v16)

99/100 doesn't mean every category is maxed — it means the one named blocker (Sentry) is resolved. These categories are still real, honest numbers, not all ceiling.

| Category | v15 | v16 | Notes |
|----------|---:|----:|-------|
| Code Quality | 94 | 93 | −1 — good pattern reuse this cycle, offset by shipping more untested, more intricate logic |
| Security | 71 | 71 | Unchanged — new delete capability is well-guarded, doesn't move the number either way |
| Performance | 74 | 73 | −1 — first measured bundle-size increase since the watch item was flagged (~691→~704 kB) |
| Accessibility | 53 | 53 | Still open, optional for this deployment |
| User Experience | 99 | 99 | Unchanged — real wins (delete button, auto clean-sheet credit) offset by a longer results-entry form |
| Data Integrity | 93 | 95 | **+2 — a genuine, previously-invisible appearance-tracking gap found and fixed at the root** |
| DDSFL Integration | 85 | 85 | Unchanged |
| Database & Supabase | 99 | 99 | Unchanged — migrations 051–052 applied cleanly |
| Testing | 84 | 76 | **−8 — third straight cycle of shipping without tests, now on higher-stakes logic. See Phase 2.** |
| DevOps | 99 | 99 | Unchanged — `canva-autofill` finally deployed live, closing a longstanding gap |
| UI & Design | 97 | 97 | Unchanged — `ConfirmDialog` adopted in one more place, still inconsistent elsewhere |
| Copy & Content | 95 | 95 | Unchanged |

Testing is now the category furthest from ceiling that's actually moving in the wrong direction — see the to-do list at the top of this doc.

---

## Recommended next 3 actions

See "Your actual to-do list" at the top for the full picture — these are just the highest-priority real items:

1. **Test coverage for admin player deletion and the appearance-points rework** — the clearest actual risk in the app right now, not a formal blocker but worth prioritising before more logic gets built on top of it untested.
2. **GitHub Actions secrets** for both `sync-ddsfl.yml` and `fines-automation.yml` — quick, unblocks two automated workflows.
3. **Decide Canva's path forward** when ready — finish the live API (needs a fresh token + data-field tagging in Canva) or switch to Bulk Create (static images, no token). Either is fine; leaving it parked is fine too.

---

## What was never required, with or without Sentry

- Public-scale auth (OAuth, MFA, rate limiting)
- Full WCAG 2.2 AA certification
- Real-time DDSFL sync
- E2E coverage of every fines automation edge case
- Canva fully live — a real integration attempt got most of the way there this cycle; finishing it (or replacing it with Bulk Create) is a when-you're-ready decision, not a requirement

---

## Tracking progress

This doc no longer has a score to chase. Keep it updated as a to-do list:

1. Run `npm run lint`, `npm run build`, `npm run test:ci` (or push to GitHub for CI)
2. Update [AUDIT.md](AUDIT.md) for real changes worth recording
3. Mark items done in this file as they're actually done

---

*Roadmap updated 14 August 2026. Baseline: AUDIT.md v16 (app at `accddb0`). **99/100 — target reached in v15, held in v16. Sentry descoped by operator decision, not shipped. Testing debt is the real open risk now — see the to-do list at the top. This doc continues as the real to-do list.*
