# BMFC Club Hub — Pre-Launch Audit

> **Current audit (v14)** — see [ROADMAP-99.md](ROADMAP-99.md) for path to 99/100.  
> **Last updated:** 14 August 2026 · **Commit:** `062ed1c` on `main` (this doc ships in the commit immediately after)

**Scope:** Full codebase + local build verification  
**Operator context:** Closed BMFC squad app — not a public internet product; ~20–25 players, invite-only sign-up  
**Build verified:** `npm run build` succeeds — ~691 kB JS (~192 kB gzip main chunk), admin routes lazy-loaded  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** **38** unit tests (Vitest, 8 files) + **26** E2E tests (Playwright, 6 spec files across chromium + 2 iOS device projects) — **unchanged since v13**, see Testing section for why that's a flagged gap this cycle

**Supabase:** Club Hub project confirmed (`kqxsbb…` — EvidInsight); separate from WC predictor (`owkql…`). **Operator confirmed this cycle: all migrations through 049 applied.**

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
| **v14 (this doc)** | **14 Aug 2026** | **98/100** | Admin audit log routed (closes that named blocker); player-managed sponsor logos; committee to-do list; Canva graphics foundation (paused — mock only); all docs brought current through migration 049 |

**Scoring key:** 90+ excellent · 75–89 strong · 60–74 acceptable · 40–59 significant gaps · below 40 critical

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations **001–049** | ✅ **All applied on Club Hub** — operator confirmed this cycle |
| Vercel production (`bmfcapp`) | ✅ Working |
| Vercel env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLUB_DATA_SOURCE`) | ✅ Set by operator |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ✅ Set by operator |
| `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secret | ⚠️ Needed by **two** workflows: `sync-ddsfl.yml` (daily) and `fines-automation.yml` (every 5 min) — confirm both have secrets set |
| Admin fines (log + payments) | ✅ Shipped — `/admin/fines`, migrations **032+** |
| Player fines page (`/fines`) | ✅ Live — dashboard alert banner, auto push on new fines, bank details for paying |
| **Admin audit log** | ✅ **Routed this cycle** — `/admin/audit`, admin-only (matches the RPC's own gate), linked from Admin hub |
| **Player-managed sponsor logos** | ✅ New this cycle — self-service upload on own player profile (migration 048); admin sees + downloads from Admin → Squad list (no new migration needed, reused the existing public grant) |
| **Committee to-do list** | ✅ New this cycle — `/admin/todo`, migration 049, RLS-gated, atomic `completed_by`/`completed_at` |
| **Canva graphics foundation** | ⚠️ **Deliberately paused** — `lib/canva.ts` + `canva-autofill` Edge Function scaffolded and working end-to-end in mock mode; real API path written but untested (no Canva account linked yet, `CANVA_ACCESS_TOKEN` unset). Operator asked to leave this as-is for now. |
| README + `docs/SUPABASE-SETUP.md` | ✅ **Fixed this cycle** — migration table now runs through 049, roles table includes Fines Helper, both edge functions and new admin tools documented |
| ESLint | ✅ 0 / 0 |
| GitHub Actions CI | ✅ Lint, build, Vitest, Playwright E2E (chromium + 2 iOS device projects) |
| Push notifications | ✅ Edge fn + Vercel VAPID key; fires on new fines |
| `send-push` edge function | ✅ Deployed to Club Hub |
| `fines-scheduler` edge function | ⚠️ Confirm deployed (`supabase functions deploy fines-scheduler`) |
| `canva-autofill` edge function | ⚠️ Registered in `supabase/config.toml`; deploy only when Canva is actually linked — no rush while `CANVA_ACCESS_TOKEN` is unset |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-squad deployment. New this cycle: sponsor-logo self-service RPCs authenticate as the **player themselves** (`assert_approved_player`), not an admin acting on their behalf — a player can only ever touch their own sponsor data. The `canva-autofill` Edge Function was deliberately designed so a future Canva OAuth token stays server-side-only (Supabase secret), never a client-exposed `VITE_` variable that would leak to every browser.

**Onboarding note:** Unchanged since v13 — login name (`ChrisL`) vs display name (`Chris L`), one-time and team invite links, quick admin add (migration 045).

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

## Executive summary

| | |
|---|---|
| **Overall score** | **98 / 100** *(unchanged — see below)* |
| **Overall rating** | **Excellent — ready for player onboarding** |
| **Previous score** | 98 / 100 (audit v13, 13 Aug 2026) |
| **Public-launch equivalent** | ~78 / 100 |
| **99 target** | See [ROADMAP-99.md](ROADMAP-99.md) — **Sentry is now the only named blocker** |

Why the overall number still holds flat: v13 named two items as the last mile to 99 — a reachable admin audit log, and Sentry. The audit log is done this cycle. That leaves exactly **one** named blocker standing, for the first time across fourteen audits. It's not closed yet, so the score doesn't move — but this is the closest the project has been to 99. Everything else shipped this cycle (sponsor logos, committee to-do, Canva foundation) was net-new scope outside the original roadmap, delivered cleanly but explicitly not covered by any test suite yet, which keeps Testing flat rather than climbing further.

---

## Scorecard

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | [Code Quality & Architecture](#1-code-quality--architecture) | 94 | +1 | Excellent |
| 2 | [Security](#2-security) | 71 | +1 | Adequate (closed squad) |
| 3 | [Performance](#3-performance) | 74 | — | Good |
| 4 | [Accessibility](#4-accessibility) | 53 | — | Requires Improvement |
| 5 | [User Experience](#5-user-experience) | 99 | — | Excellent |
| 6 | [Data Integrity & Business Logic](#6-data-integrity--business-logic) | 93 | +1 | Excellent |
| 7 | [DDSFL Integration & Data Sync](#7-ddsfl-integration--data-sync) | 85 | — | Excellent |
| 8 | [Database & Supabase](#8-database--supabase) | 99 | — | Excellent |
| 9 | [Testing & Reliability](#9-testing--reliability) | 84 | — | Excellent |
| 10 | [DevOps & Deployment](#10-devops--deployment) | 99 | — | Excellent |
| 11 | [UI & Design Consistency](#11-ui--design-consistency) | 97 | +1 | Excellent |
| 12 | [Copy & Content](#12-copy--content) | 95 | — | Excellent |

---

## 1. Code Quality & Architecture

**Score: 94 / 100** · **Excellent**

### Strengths
- Sponsor logo admin visibility needed **zero new migration** — the columns were already publicly SELECT-granted in 048 for the self-service flow, so `fetchSquad()` just extended its existing join. Reuse over re-invention.
- `committee_todo`'s `CHECK` constraint (`committee_todo_done_fields`) enforces `completed_at`/`completed_by` are set if and only if `status = 'done'` at the database level, not just in application code.
- `canva-autofill` mirrors `send-push`'s exact session-verification shape (profile lookup + session-token match + role check) rather than inventing a new auth pattern for the third Edge Function.
- Docs debt (README, SUPABASE-SETUP.md stale at migration 030 since v11) finally paid down — three consecutive audits had flagged this without it being fixed.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Positive | `048`, `049` | Sponsor logos + committee to-do — both follow established RLS/RPC/grant conventions exactly. |
| Positive | `AdminSquad.tsx` | Real one-click logo download (fetch → blob → forced save), not a same-tab link that just opens the image. |
| Positive | `canva-autofill/index.ts` | Returns a clearly-labelled mock result when `CANVA_ACCESS_TOKEN` is unset rather than failing — the client flow is fully testable before the real account exists. |
| Low | Bundle | Main chunk unchanged this cycle at ~691 kB / ~192 kB gzip — same "chunk >500 kB" warning, still unaddressed, now three cycles running. |
| Low | Testing | Zero unit/E2E coverage for audit log routing, sponsor logos, committee to-do, or Canva — first cycle where shipped features got no dedicated tests (contrast with v13's substitute-credit work, which did). |
| Low | Fines | Still no unit tests for `fineAlerts` / payment grouping (carried over from v11 through v14). |

---

## 2. Security

**Score: 71 / 100** · **Adequate for closed-squad use** *(~48 public-launch equivalent)*

Sponsor logo RPCs are the first self-service (non-admin-initiated) Storage upload path in the app — worth calling out because it's a new attack surface shape. `prepare_sponsor_logo_upload` / `confirm_sponsor_logo_upload` authenticate via `assert_approved_player(p_user_id, p_session_token)`, which only ever resolves to the calling player's own row — there is no player-id parameter a client could tamper with to write another player's sponsor data. Time-limited grant table (10 min expiry) matches the player-photos pattern exactly. `committee_todo` RLS blocks all direct table access; every mutation is RPC-gated with `assert_committee_user` (admin or committee only).

---

## 3. Performance

**Score: 74 / 100** · **Good for team scale**

No change this cycle — three new admin pages are lazy-loaded, so the main chunk didn't grow. Same bundle-size watch item as v13.

---

## 4. Accessibility

**Score: 53 / 100** · **Requires Improvement**

No accessibility-focused work this cycle — unchanged since v10.

---

## 5. User Experience

**Score: 99 / 100** · **Excellent**

Admin can finally see who did what (`/admin/audit`) after three audit cycles of it being built-but-unreachable. Players get a genuinely new self-service surface (sponsor logo/name) in the natural place for it — their own profile, not buried on the dashboard, after a placement correction mid-cycle. Committee gets a shared task list. All three read as native extensions of the existing glass-card admin design rather than bolted-on features.

| Severity | Issue |
|----------|-------|
| Low | Canva template list is placeholder IDs (`TEMPLATE_ID_MATCHDAY_LINEUP` etc.) until real brand template IDs are supplied — expected, paused by request. |
| Low | No admin-side way to bulk-review which players have/haven't set a sponsor — only visible per-row on the Squad list. |

---

## 6. Data Integrity & Business Logic

**Score: 93 / 100** · **Excellent**

`committee_todo`'s done/undo cycle is fully server-authoritative: `admin_set_todo_status` sets or clears `completed_by`/`completed_at` atomically in the same statement as the status flip, so there's no window where a task reads as "done" without a completer, or vice versa — reinforced by the table's own `CHECK` constraint as a second line of defence. Sponsor logo uploads follow the same "grant, then confirm, then expire" integrity pattern that's protected player photos since migration 016, now proven out for a second, player-initiated use case.

---

## 7. DDSFL Integration & Data Sync

**Score: 85 / 100** · **Excellent**

Unchanged this cycle — no DDSFL-related work.

---

## 8. Database & Supabase

**Score: 99 / 100** · **Excellent**

| Item | Status |
|------|--------|
| Migrations **001–049** | ✅ **All confirmed applied on Club Hub this cycle** — first time the deployment table has had zero outstanding "confirm applied" flags |
| **Sponsor logos (048)** | ✅ Applied |
| **Committee to-do (049)** | ✅ Applied |
| `fines-scheduler` edge function | ⚠️ Confirm deployed |
| `canva-autofill` edge function | ⚠️ Registered in config; deploy only once Canva is linked |
| `send-push` | ✅ Deployed |
| Admin audit log schema + RPCs (029) | ✅ Shipped and now reachable (see UX) |

---

## 9. Testing & Reliability

**Score: 84 / 100** · **Excellent**

**Unit tests: 38, E2E tests: 26 — both unchanged since v13.** This is a genuine flag, not a non-event: four features shipped this cycle (audit log routing, sponsor logos, committee to-do, Canva foundation) and none of them have a single automated test. Verification this cycle was manual/visual (Playwright scripts run ad hoc against the dev server, screenshotted, then deleted) rather than added to the permanent suite. That's an acceptable one-cycle trade-off for a closed-squad tool, but if it repeats next cycle it should be treated as accumulating debt rather than a one-off.

CI unchanged in shape: lint → build → Vitest (verify job) + Playwright E2E (separate job).

---

## 10. DevOps & Deployment

**Score: 99 / 100** · **Excellent**

`canva-autofill` registered in `supabase/config.toml` alongside `send-push` and `fines-scheduler`, ready to deploy the moment it's needed — no rush while it's paused. No Sentry yet.

---

## 11. UI & Design Consistency

**Score: 97 / 100** · **Excellent**

All four new surfaces (audit log filter/list, sponsor upload card, Canva template picker, to-do add/list) visually verified against the live dev build this cycle — same glass-card, same button/pill conventions, same toast patterns as every existing admin page. Nothing reads as a bolted-on feature.

---

## 12. Copy & Content

**Score: 95 / 100** · **Excellent**

No copy changes of note this cycle beyond two Canva template label tweaks (cosmetic, requested directly).

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

---

## Feature matrix (mock vs live)

| Feature | Mock | Live Supabase |
|---------|------|---------------|
| Login (login name + passcode) | Dev bypass / ✅ | ✅ |
| One-time invite / team invite link / quick admin add | ✅ | ✅ |
| Player fines (`/fines`), admin fines, fines-only role | ✅ | ✅ |
| Weekly late-fee automation, no-vote automation, player pause | — | ✅ |
| Substitutes bench → appearance credit | ✅ | ✅ |
| **Admin audit log** (`/admin/audit`) | ✅ | ✅ **Now reachable** |
| **Player-managed sponsor logo + name** (own profile) | ✅ | ✅ |
| **Admin sponsor visibility + download** (Squad list) | ✅ | ✅ |
| **Committee to-do** (`/admin/todo`) | ✅ | ✅ |
| **Canva template graphics** (`/admin/canva`) | ✅ mock result | ⚠️ Mock result until `CANVA_ACCESS_TOKEN` is set |
| Push notifications (incl. new-fine push) | ✅ | ✅ |
| PWA install prompt | ✅ | ✅ |

---

## Prioritised action list

### P0 — Before onboarding players

| # | Task | Status |
|---|------|--------|
| 1 | Apply migrations **001–049** on Club Hub | ✅ Operator confirmed |
| 2 | Review fines applied 14 Jul – 13 Aug for wrongful `no_vote` charges (Bug #18) | ✅ Operator confirmed — sorted manually |
| 3 | Generate team invite link (Admin → Squad members) | ⚠️ Operator |
| 4 | Brief squad: sign in as **ChrisL**-style login name | ⚠️ Operator |
| 5 | GitHub Actions secrets for **both** DDSFL and fines-automation workflows | ⚠️ Operator |
| 6 | Link a Canva account + set `CANVA_ACCESS_TOKEN` (blocks further Canva work) | ⚠️ Operator |

### P1 — Path to 99

See [ROADMAP-99.md](ROADMAP-99.md).

| # | Task | Status |
|---|------|--------|
| 1–12 | Everything through v13's list | ✅ Closed |
| 13 | **Route the admin audit log** | ✅ Closed this cycle |
| 14 | DDSFL sync secrets + fines-automation secrets | ⚠️ Operator |
| 15 | **Sentry** | Open — **only remaining named blocker to 99** |

---

## Summary

**98 / 100** — Admin audit log finally routed, closing a gap that had sat open (built, unreachable) across three audit cycles. Three new features shipped outside the original roadmap: player-managed sponsor logos (self-service, with admin-side visibility and one-click download), a committee to-do list, and a Canva graphics foundation deliberately paused pending account access. Docs debt paid down — README and SUPABASE-SETUP.md now cover all 49 migrations instead of stalling at 30. Two small bugs caught and fixed within the same session they were introduced.

**Operator:** GitHub Actions secrets for both workflows, generate the team join link, brief players on **ChrisL** login, link a Canva account when ready. Migrations are done — you confirmed 001–049 applied this cycle. Fines review from the vote-loss bug window is done too — confirmed sorted manually.

**Path to 99 (score checklist specifically):** one item. Sentry. Note this is narrower than the full to-do list — see [ROADMAP-99.md](ROADMAP-99.md#your-actual-to-do-list) for Canva completion, ops tasks, and test coverage that don't move the score but are still real open work.

---

*End of Club Hub audit v14. App baseline `062ed1c`; docs updated 14 August 2026.*
