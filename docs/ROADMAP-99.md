# BMFC Club Hub — Roadmap to 99 / 100

**Baseline:** [AUDIT.md](AUDIT.md) v14 — **98 / 100** (14 August 2026)  
**Target:** **99 / 100** — polished private squad app with ops closure and observability  
**Status:** **One item left on the 99-score checklist.** Admin audit log routed this cycle. Sentry is the only named blocker remaining across fourteen audits. **That checklist is not the same as the full to-do list below** — Canva, ops tasks, and test coverage are real open work that don't move the score but do need doing.

---

## Your actual to-do list

Two different lists get conflated in this doc — the narrow "99-score" checklist (just Sentry) and everything actually left to do. This is the second one.

### Operator — only you can do these

| # | Task | Notes |
|---|------|-------|
| 1 | GitHub Actions secrets — `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Gates **two** workflows: `sync-ddsfl.yml` (daily) and `fines-automation.yml` (every 5 min). Repo → Settings → Secrets and variables → Actions. |
| 2 | Generate the team invite link | Admin → Squad members → team invite link. Share in squad WhatsApp. |
| 3 | Brief the squad on **ChrisL**-style login | Login name has no space; display name (`Chris L`) is what shows elsewhere in the app. |
| 4 | Deploy `fines-scheduler` Edge Function, if not already live | `supabase functions deploy fines-scheduler` |
| 5 | Link a Canva account when ready | Get a Canva Connect API OAuth token, set it as the `CANVA_ACCESS_TOKEN` secret on the Supabase project, supply real brand template IDs to swap into `lib/canva.ts`. Nothing on the engineering side can happen without this — the whole feature is blocked on you doing this step. |
| ~~6~~ | ~~Review fines applied 14 Jul – 13 Aug for the vote-loss bug~~ | ✅ **Done — confirmed sorted manually.** |

### Engineering — ask when you want these picked up

| # | Task | Notes |
|---|------|-------|
| 1 | **Sentry** | The only item on the formal 99-score checklist. Five audit cycles with zero progress. |
| 2 | **Wire up the real Canva API path** | Code is written (`canva-autofill` Edge Function) but has never run against a real account — blocked on operator task #5 above. Once unblocked: test the asset-upload step (image fields aren't wired yet, only text), verify job polling, confirm real template field names match what's sent. |
| 3 | **Test coverage for what shipped this cycle** | Zero unit/E2E tests for admin audit log, sponsor logos, committee to-do, or Canva. Verification so far has been manual Playwright scripts run once and discarded — nothing regression-proof. |
| 4 | Playwright E2E: team join link (`/join/:token`) | Never got E2E coverage even before this cycle. |
| 5 | Playwright E2E: fines automation (no-vote, late fees, reminders) | Only SQL-side idempotency tables guard this currently. |
| 6 | Unit tests: `fineAlerts`, `lineupFormations.ts`, `getAuthErrorMessage` | Carried over from several audits back. |
| 7 | Accessibility — passcode fieldset, modal focus trap, contrast pass | Optional for a closed 25-player squad, but open since v10. |
| 8 | Bundle size — main chunk sitting at ~691 kB / ~192 kB gzip | Not urgent, flagged three cycles running. Worth a `manualChunks` pass if it keeps growing. |

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
| **v14 — admin audit log routed, sponsor logos, committee to-do, Canva foundation** | **98** | ✅ |
| Apply migrations 001–049 on Club Hub | — | ✅ **Operator confirmed** |
| Sentry | ~99 | Open — **last item** |

Remaining lift to **99**:

| Priority | Area | Notes |
|----------|------|-------|
| 1 | **Observability** | Sentry — zero progress across five audit cycles. The only thing standing between this project and 99/100 specifically. |
| 2 | **Ops** | GitHub Actions secrets gate two workflows (DDSFL sync + fines-automation) — confirm both. |
| 3 | **Testing** | Zero test coverage for four things shipped this cycle: audit log routing, sponsor logos, committee to-do, Canva foundation. Not urgent for a closed-squad tool, but flagged — don't let it compound next cycle. |
| 4 | **A11y** | Fieldset, focus trap, contrast — unchanged since v10, optional for closed squad. |
| 5 | **Canva** | Foundation built and paused by request. Blocked on the operator linking a real account — see "Your actual to-do list" above. Real API path (image asset upload, job polling) still needs verifying once unblocked. |

---

## Score projection

| Milestone | Overall | Status |
|-----------|--------:|--------|
| v12 — admin fines + late-fee automation | 98 | ✅ |
| v13 — player fines live + fines rework + DDSFL fix + sub credit UX | 98 | ✅ |
| **v14 — audit log routed + sponsor logos + committee to-do + Canva foundation** | **98** | ✅ |
| Sentry | **99** | Open — final lift |

---

## Timeline

```mermaid
gantt
    title Roadmap to 99 (revised 14 Aug 2026)
    dateFormat  YYYY-MM-DD
    section v11–v13 DONE
    Admin fines + late fees (032–035)        :done, v12a, 2026-06-21, 1d
    Squad auto-populate on approval (036)    :done, v13a, 2026-07-01, 1d
    Fines rework (037-041)                   :done, v13c, 2026-07-20, 3d
    Player fines page released               :done, v13f, 2026-08-01, 1d
    Substitutes + credit (046–047)           :done, v13g, 2026-08-13, 1d
    DDSFL vote-loss bug found + fixed        :done, v13h, 2026-08-13, 1d
    section v14 DONE
    Admin audit log routed                   :done, v14a, 2026-08-14, 1d
    Sponsor logos (048)                      :done, v14b, 2026-08-14, 1d
    Committee to-do (049)                    :done, v14c, 2026-08-14, 1d
    Canva foundation (paused)                :done, v14d, 2026-08-14, 1d
    Docs brought current (README, SUPABASE-SETUP)   :done, v14e, 2026-08-14, 1d
    section Ops — confirm
    Apply migrations 001–049 on Supabase     :done, ops1, 2026-08-14, 1d
    Review fines during vote-loss bug window :done, ops3, 2026-08-14, 1d
    GitHub secrets — DDSFL + fines-automation:active, ops2, 2026-08-14, 1d
    section Final lift — to 99
    Sentry                                   :crit, o1, 2026-08-20, 2d
    section Blocked on operator
    Canva account link + CANVA_ACCESS_TOKEN  :b1, TBD, 1d
    Wire real Canva API path                 :b2, after b1, 2d
    section Optional polish
    Test coverage for v14 features           :t1, 2026-09-01, 2d
    Passcode fieldset + focus trap           :a1, 2026-09-01, 1d
```

---

## Phase 14 — Admin audit log routed ✅

The single longest-open item on this roadmap. Backend existed since before v11; three consecutive audits flagged it as "built but unreachable."

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
| `docs/SUPABASE-SETUP.md` migration table — stalled at 030 for three audit cycles | ✅ | Now covers 031–049 |
| `docs/SUPABASE-SETUP.md` — `fines-scheduler` and `canva-autofill` Edge Functions undocumented | ✅ | New "Other Edge Functions" section |
| `docs/SUPABASE-SETUP.md` role permissions table — missing Fines Helper row | ✅ | Added |

---

## Phase 11 — Fines system rework, 26/27 season ✅

Unchanged since v13/v14 — full detail in AUDIT.md v13 history. All migrations (037–044) confirmed applied.

---

## Phase 12 — Data integrity: DDSFL vote-loss bug ✅

Fix unchanged since v13. **Operator confirmed the fines review is done** — charges from the 14 Jul – 13 Aug window were checked and sorted manually. Fully closed.

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
| Apply **001–049** on Club Hub | ✅ | **Operator confirmed this cycle — first time zero outstanding migration flags** |
| **Review fines applied 14 Jul – 13 Aug for the vote-loss bug window** | ✅ | **Operator confirmed — sorted manually** |
| Generate team invite link (Admin → Squad members) | ⚠️ | Share in squad WhatsApp |
| Brief squad on **ChrisL** login format | ⚠️ | Display name shown as **Chris L** in app |
| GitHub Actions secrets — **both** `sync-ddsfl.yml` and `fines-automation.yml` | ⚠️ | `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; optional `FINES_SCHEDULER_SECRET` |
| Deploy `fines-scheduler` Edge Function | ⚠️ | `supabase functions deploy fines-scheduler` |
| Link Canva account, set `CANVA_ACCESS_TOKEN` | ⚠️ | Blocks all further Canva engineering work |

---

## Phase 2 — Testing depth (holding at 84 — flag, not urgent)

| Task | Status |
|------|--------|
| Core suite (playerNames, liveMatchEvents, cleanSheet, bench-toggle credit) | ✅ |
| iOS device E2E, admin fines E2E | ✅ |
| **Coverage for audit log, sponsor logos, committee to-do, Canva** | ❌ None — shipped without tests this cycle |
| Playwright E2E: team join link (`/join/:token`) | Open |
| Playwright E2E: fines automation (no-vote, late fees, reminders) | Open |
| Unit tests: `lineupFormations.ts`, `getAuthErrorMessage`, `fineAlerts` | Open |

---

## Phase 9 — Accessibility (98)

Optional for ~25-player closed squad. Unchanged since v10.

| Task | Status |
|------|--------|
| Skip-to-content, labelled forms | ✅ |
| Passcode fieldset + modal focus trap | Open |
| Colour contrast spot-check | Open |

---

## Category score targets (v13 → 99)

| Category | v13 | v14 | @99 | Phase |
|----------|---:|----:|----:|-------|
| Code Quality | 93 | 94 | 94 | ✅ |
| Security | 70 | 71 | 71 | ✅ |
| Performance | 74 | 74 | 76 | 3 (watch bundle) |
| Accessibility | 53 | 53 | 65 | 9 |
| User Experience | 99 | 99 | 99 | ✅ |
| Data Integrity | 92 | 93 | 93 | ✅ |
| DDSFL Integration | 85 | 85 | 88 | — |
| Database & Supabase | 99 | 99 | 99 | ✅ |
| Testing | 84 | 84 | 88 | 2 |
| DevOps | 99 | 99 | 99 | ✅ |
| UI & Design | 96 | 97 | 97 | ✅ |
| Copy & Content | 95 | 95 | 95 | ✅ |

---

## Recommended next 3 actions

See "Your actual to-do list" at the top for the full picture — these three are just the highest-priority items across both lists:

1. **GitHub Actions secrets** for both `sync-ddsfl.yml` and `fines-automation.yml` — quick, unblocks two automated workflows.
2. **Sentry.** The only named blocker to the 99 score, five audit cycles running.
3. **Link a Canva account** when ready — this single step is what's blocking all further Canva engineering work.

---

## What you do NOT need for 99

- Public-scale auth (OAuth, MFA, rate limiting)
- Full WCAG 2.2 AA certification
- Real-time DDSFL sync
- E2E coverage of every fines automation edge case
- Canva fully live — foundation is enough; finish it when the account is actually linked

---

## Tracking progress

1. Run `npm run lint`, `npm run build`, `npm run test:ci` (or push to GitHub for CI)
2. Update [AUDIT.md](AUDIT.md) — bump version and scores
3. Mark items done in this file

---

*Roadmap updated 14 August 2026. Baseline: AUDIT.md v14 (app at `0304556`). **98/100 held on the score checklist (Sentry only); see "Your actual to-do list" for what's really outstanding — Canva completion, ops secrets, test coverage.*
