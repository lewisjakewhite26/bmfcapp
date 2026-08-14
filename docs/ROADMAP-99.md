# BMFC Club Hub — Roadmap (99/100 reached)

**Baseline:** [AUDIT.md](AUDIT.md) v15 — **99 / 100** (14 August 2026)  
**Original target:** 99 / 100 — reached this cycle. Sentry, the sole remaining item on that checklist, was **descoped by explicit operator decision**: closed ~30-player deployment, everyone's a close friend, problems surface over WhatsApp faster than a monitoring dashboard would anyway. Not worth the setup and ongoing overhead for this risk profile.  
**This doc now:** kept as the actual ongoing to-do list, not a score chase. See below.

---

## Your actual to-do list

The "99-score checklist" is closed — there's nothing left on it. That's a different thing from "nothing left to do." This is the real list.

### Operator — only you can do these

| # | Task | Notes |
|---|------|-------|
| 1 | GitHub Actions secrets — `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Gates **two** workflows: `sync-ddsfl.yml` (daily) and `fines-automation.yml` (every 5 min). Repo → Settings → Secrets and variables → Actions. |
| 2 | Confirm `fines-scheduler` Edge Function is deployed; deploy if not | `supabase functions deploy fines-scheduler` — **status unknown**, no Supabase CLI or project credentials available locally to check this from the dev machine. Check Supabase Dashboard → Edge Functions, or `supabase functions list`. |
| 3 | Apply migration **050** (no-vote fine labels) | Same as every migration — you run these, not automated. |
| 4 | Link a Canva account when ready | Get a Canva Connect API OAuth token, set it as the `CANVA_ACCESS_TOKEN` secret on the Supabase project, supply real brand template IDs to swap into `lib/canva.ts`. Nothing on the engineering side can happen without this — the whole feature is blocked on you doing this step. |
| ~~5~~ | ~~Generate the team invite link~~ | ✅ **Done.** |
| ~~6~~ | ~~Brief the squad on **ChrisL**-style login~~ | ✅ **Done.** |
| ~~7~~ | ~~Review fines applied 14 Jul – 13 Aug for the vote-loss bug~~ | ✅ **Done — confirmed sorted manually.** |
| ~~8~~ | ~~Sentry~~ | ✅ **Descoped.** Not being pursued — see top of doc. |

### Engineering — ask when you want these picked up

| # | Task | Notes |
|---|------|-------|
| 1 | **Wire up the real Canva API path** | Code is written (`canva-autofill` Edge Function) but has never run against a real account — blocked on operator task #4 above. Once unblocked: test the asset-upload step (image fields aren't wired yet, only text), verify job polling, confirm real template field names match what's sent. |
| 2 | **Test coverage for what shipped in v14** | Zero unit/E2E tests for admin audit log, sponsor logos, committee to-do, or Canva. Verification so far has been manual Playwright scripts run once and discarded — nothing regression-proof. |
| 3 | Playwright E2E: team join link (`/join/:token`) | Never got E2E coverage even before v14. |
| 4 | Playwright E2E: fines automation (no-vote, late fees, reminders) | Only SQL-side idempotency tables guard this currently. |
| 5 | Unit tests: `fineAlerts`, `lineupFormations.ts`, `getAuthErrorMessage` | Carried over from several audits back. |
| 6 | Accessibility — passcode fieldset, modal focus trap, contrast pass | Optional for a closed ~30-player squad, but open since v10. |
| 7 | Bundle size — main chunk sitting at ~691 kB / ~192 kB gzip | Not urgent, flagged three cycles running. Worth a `manualChunks` pass if it keeps growing. |

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
| **v15 — no-vote fine labels; Sentry descoped by operator decision** | **99** | ✅ **Target reached** |

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
    section Ops — real work, no score impact
    Apply migrations 001-050 on Supabase      :active, ops1, 2026-08-14, 1d
    GitHub secrets - DDSFL + fines-automation :active, ops2, 2026-08-14, 1d
    Confirm fines-scheduler deployed          :active, ops3, 2026-08-14, 1d
    section Blocked on operator
    Canva account link + CANVA_ACCESS_TOKEN   :b1, TBD, 1d
    Wire real Canva API path                  :b2, after b1, 2d
    section Optional polish
    Test coverage for v14 features            :t1, 2026-09-01, 2d
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

## Phase 17 — Canva graphics foundation ⚠️ Paused by request

Built to be safe-by-construction: the eventual Canva OAuth token can never live in a client-exposed `VITE_` variable, so the real API call is server-side only, gated the same way `send-push` is.

| Task | Status | Ref |
|------|--------|-----|
| `lib/canva.ts` — mockable service, template list, `triggerAutofillDesign` | ✅ | |
| `canva-autofill` Edge Function — mirrors `send-push`'s session-auth shape; returns a labelled mock result when `CANVA_ACCESS_TOKEN` is unset | ✅ | `supabase-club/functions/canva-autofill/` |
| `/admin/canva` — template picker, player picker, generate flow | ✅ | `AdminCanva.tsx` |
| Registered in `supabase/config.toml` | ✅ | |
| **Resume when ready:** link Canva account, set `CANVA_ACCESS_TOKEN` secret, supply real brand template IDs, deploy the function | Open — **on hold, no rush** | |

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
| Apply **001–049** on Club Hub | ✅ | Operator confirmed |
| Apply migration **050** | ⚠️ | Shipped same day as this doc's last update — confirm applied |
| **Review fines applied 14 Jul – 13 Aug for the vote-loss bug window** | ✅ | Operator confirmed — sorted manually |
| Generate team invite link (Admin → Squad members) | ✅ | Operator confirmed |
| Brief squad on **ChrisL** login format | ✅ | Operator confirmed |
| GitHub Actions secrets — **both** `sync-ddsfl.yml` and `fines-automation.yml` | ⚠️ | `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; optional `FINES_SCHEDULER_SECRET` |
| Deploy `fines-scheduler` Edge Function | ⚠️ **Unknown** | No local Supabase CLI/credentials to check — verify via Dashboard → Edge Functions |
| Link Canva account, set `CANVA_ACCESS_TOKEN` | ⚠️ | Blocks all further Canva engineering work |
| ~~Sentry~~ | ✅ **Descoped** | Operator decision — see Phase 19 |

---

## Phase 2 — Testing depth (holding at 84 — flag, not urgent)

| Task | Status |
|------|--------|
| Core suite (playerNames, liveMatchEvents, cleanSheet, bench-toggle credit) | ✅ |
| iOS device E2E, admin fines E2E | ✅ |
| **Coverage for audit log, sponsor logos, committee to-do, Canva** | ❌ None — shipped without tests in v14 |
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

## Category scores (v14 → v15)

99/100 doesn't mean every category is maxed — it means the one named blocker (Sentry) is resolved. These categories are still real, honest numbers, not all ceiling.

| Category | v14 | v15 | Notes |
|----------|---:|----:|-------|
| Code Quality | 94 | 94 | Unchanged |
| Security | 71 | 71 | Unchanged — closed-squad trade-offs still accepted, same reasoning now applied to Sentry |
| Performance | 74 | 74 | Bundle size still a watch item |
| Accessibility | 53 | 53 | Still open, optional for this deployment |
| User Experience | 99 | 99 | Unchanged |
| Data Integrity | 93 | 93 | Unchanged |
| DDSFL Integration | 85 | 85 | Unchanged |
| Database & Supabase | 99 | 99 | Unchanged |
| Testing | 84 | 84 | Still flagged — v14 features shipped untested |
| DevOps | 99 | 99 | Unchanged |
| UI & Design | 97 | 97 | Unchanged |
| Copy & Content | 95 | 95 | Unchanged |

Accessibility and Testing are the two categories furthest from ceiling. Neither is blocking anything — both are on the engineering to-do list above if you want them picked up.

---

## Recommended next 3 actions

See "Your actual to-do list" at the top for the full picture — these are just the highest-priority real items:

1. **GitHub Actions secrets** for both `sync-ddsfl.yml` and `fines-automation.yml` — quick, unblocks two automated workflows.
2. **Confirm `fines-scheduler` is deployed**, apply migration 050 — can't verify either remotely.
3. **Link a Canva account** when ready — this single step is what's blocking all further Canva engineering work.

---

## What was never required, with or without Sentry

- Public-scale auth (OAuth, MFA, rate limiting)
- Full WCAG 2.2 AA certification
- Real-time DDSFL sync
- E2E coverage of every fines automation edge case
- Canva fully live — foundation is enough; finish it when the account is actually linked

---

## Tracking progress

This doc no longer has a score to chase. Keep it updated as a to-do list:

1. Run `npm run lint`, `npm run build`, `npm run test:ci` (or push to GitHub for CI)
2. Update [AUDIT.md](AUDIT.md) for real changes worth recording
3. Mark items done in this file as they're actually done

---

*Roadmap updated 14 August 2026. Baseline: AUDIT.md v15 (app at `1627f8c`). **99/100 — target reached. Sentry descoped by operator decision, not shipped. This doc continues as the real to-do list.*
