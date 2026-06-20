# BMFC Club Hub — Roadmap to 99 / 100

**Baseline:** [AUDIT.md](AUDIT.md) v11 — **98 / 100** (20 June 2026)  
**Target:** **99 / 100** — polished private squad app with ops closure and observability  
**Status:** **98 reached** — E2E in CI, team invite link, login/display split; migrations **001–028** applied; squad + team link remain

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
| **v11 — E2E in CI, team invite link, login/display split** | **98** | ✅ |
| Apply migrations 001–028 on Club Hub | — | ✅ |
| Ops closure (squad + team link + DDSFL sync) | ~98 | In progress |
| Audit log + Sentry | ~99 | Open |

Remaining lift to **99**:

| Priority | Area | Notes |
|----------|------|-------|
| 1 | **Ops** | Generate team link, populate squad, DDSFL sync |
| 2 | **Observability** | Sentry, admin audit log |
| 3 | **Testing** | E2E for team join link; finance unit tests |
| 4 | **A11y** | Fieldset, focus trap, contrast (optional for closed squad) |

---

## Score projection

| Milestone | Overall | Status |
|-----------|--------:|--------|
| v8 — finance admin (79c9688 / 022) | 94 | ✅ |
| v9 — migrations 001–022 applied | 95 | ✅ |
| v10 — GK fix + calendar + PWA prompt (`ed6bde1`) | 96 | ✅ |
| **v11 — E2E CI + team invite + login split (`7265a28`)** | **98** | ✅ |
| Apply migrations 001–028 on Club Hub | — | ✅ |
| Ops: squad + team link + DDSFL sync | ~98 | ⚠️ Operator |
| Audit log + Sentry | ~99 | Open |

---

## Timeline

```mermaid
gantt
    title Roadmap to 99 (revised 20 Jun 2026 PM)
    dateFormat  YYYY-MM-DD
    section v6–v11 DONE
    Onboarding + passcode (019)           :done, v6, 2026-06-20, 1d
    Finance admin (022)                   :done, v8, 2026-06-20, 1d
    GK clean-sheet fix (ed6bde1)          :done, v10c, 2026-06-20, 1d
    Login/display split (025)             :done, v11a, 2026-06-20, 1d
    Team invite link (028)                :done, v11b, 2026-06-20, 1d
    Playwright E2E in CI (7265a28)        :done, v11c, 2026-06-20, 1d
    section Ops — to 98
    Apply migrations 001–028 Supabase     :done, ops0, 2026-06-20, 1d
    Generate team invite link (Admin)     :active, ops1, 2026-06-20, 1d
    Populate squad table (Admin)          :active, ops2, 2026-06-20, 1d
    Brief squad on ChrisL login           :ops3, 2026-06-20, 1d
    npm run sync:ddsfl                      :ops4, 2026-06-21, 1d
    section Ops maturity — to 99
    Admin audit log                       :o1, 2026-07-10, 2d
    Sentry                                :o2, 2026-07-12, 1d
    section Optional polish
    E2E team join link flow               :t1, 2026-07-05, 1d
    Passcode fieldset + focus trap        :a1, 2026-07-05, 1d
```

---

## Phase 6 — Onboarding & auth ✅

| Task | Status | Ref |
|------|--------|-----|
| Admin creates invite without pre-entered name | ✅ | 019 |
| Player enters first + last name on invite | ✅ | 019 |
| Login name **ChrisL** vs display **Chris L** | ✅ | `ff2e53d`, 025 |
| Username **clee** + collision suffix | ✅ | 019 |
| Admin edit names; player change passcode | ✅ | 019 |
| Reusable team invite link `/join/:token` | ✅ | `eb5d4ba`, 028 |
| Single-page invite form | ✅ | `3d73b20` |
| Mock-mode parity | ✅ | |
| Apply 019–028 on production | ✅ | Operator |

---

## Phase 6b — Production hotfixes ✅

| Task | Status | Ref |
|------|--------|-----|
| Dashboard/calendar 400 — dual FK on `match_events` | ✅ | `7189fcc` |
| Stats 400 — `photo_url` column not granted | ✅ | `f91371c`, 021 |
| AdminLineup “Invalid Date” | ✅ | `7265a28` |
| Apply migration 021 on production | ✅ | Operator |

---

## Phase 6c — Finance admin ✅

| Task | Status | Ref |
|------|--------|-----|
| Sponsorship CRUD (categories, paid toggle, ledger) | ✅ | `79c9688`, 022 |
| Expense CRUD (categories, ledger) | ✅ | 022 |
| Overview dashboard (paid/pending, net, breakdown charts) | ✅ | `AdminFinance.tsx` |
| Admin + committee access (not admin-only) | ✅ | `assert_finance_user` |
| Server-side `logged_by` / `edited_by` | ✅ | 022 RPCs |
| Mock-mode parity | ✅ | `mockFinance.ts` |
| Apply migration 022 on production | ✅ | Operator |

---

## Phase 6d — Calendar & PWA polish ✅

| Task | Status | Ref |
|------|--------|-----|
| Archive vs delete for events and fundraisers | ✅ | `6ea2216`, 023 |
| Match result colour coding on calendar | ✅ | `6ea2216` |
| PWA “Add to home screen” dismissible prompt | ✅ | `207145f`, `129624c` |
| Push requires install messaging (iOS) | ✅ | `7265a28` |
| Landing canvas pause off-screen | ✅ | `7265a28` |
| Apply migration 023 on production | ✅ | Operator |

---

## Phase 6e — GK clean sheets ✅

| Task | Status | Ref |
|------|--------|-----|
| Layered GK resolution: live log → lineup → manual override | ✅ | `ed6bde1`, `cleanSheet.ts` |
| Admin → Results optional goalkeeper field | ✅ | `ResultEntryForm.tsx` |
| Unit tests: live, lineup, manual, no-data | ✅ | `cleanSheet.test.ts` |
| Apply migration 024 on production | ✅ | Operator |

---

## Phase 6f — Team invite & data hygiene ✅

| Task | Status | Ref |
|------|--------|-----|
| Reusable team invite link (generate/regenerate/enable/disable) | ✅ | `eb5d4ba`, 028 |
| `complete_team_invite` with approval gate | ✅ | 028 |
| Fixture purge before cutoff (026) | ✅ | 026 |
| Em-dash RPC copy cleanup (027) | ✅ | 027 |
| Apply migrations 026–028 on production | ✅ | Operator |

---

## Phase 1–5 — Previously complete

Migrations 001–018, lazy routes, live matchday, photos, events, fundraisers, copy audit, weekly DDSFL sync, official crest PWA.

---

## Phase 7 — Ops closure (98 → 98+)

| Task | Status | Notes |
|------|--------|-------|
| Apply **001–028** on Club Hub | ✅ | Full chain applied |
| Generate team invite link (Admin → Squad members) | ⚠️ | Share in squad WhatsApp |
| Add squad members (Admin → Squad) | ⚠️ | Required for stats + player profiles |
| Brief squad on **ChrisL** login format | ⚠️ | Display name shown as **Chris L** in app |
| Push smoke test (Admin → Notifications) | ⚠️ | Optional |
| `npm run sync:ddsfl` | ⚠️ | When fixtures publish |

---

## Phase 2 — Testing depth ✅ (core)

**Target:** Testing **64 → 78** — achieved

| Task | Status |
|------|--------|
| `playerNames.ts` unit tests (login + display format) | ✅ |
| `liveMatchEvents` unit tests | ✅ |
| `cleanSheet.ts` unit tests (GK attribution) | ✅ |
| Playwright E2E: landing + login + dashboard nav | ✅ |
| Playwright E2E: stats, profile, calendar, availability | ✅ |
| Playwright E2E: invite → pending → approve → login | ✅ |
| Playwright E2E: admin hub, finance, route guard | ✅ |
| E2E in CI (mock build + `VITE_E2E=true`) | ✅ |
| Playwright E2E: team join link (`/join/:token`) | Open |
| Unit tests: `lineupFormations.ts` | Open |
| Unit tests: `getAuthErrorMessage` | Open |
| Unit tests: finance overview calculations | Open |

---

## Phase 3 — Performance polish ✅ (core)

| Task | Status |
|------|--------|
| Lazy admin routes (~185 kB gzip) | ✅ |
| Pause landing canvas off-screen | ✅ |

---

## Phase 8 — Data integrity ✅

| Task | Status |
|------|--------|
| Unique `(first_name, last_name)` | ✅ 019 |
| Login/display collision suffixes | ✅ 025 |
| Finance ledger audit trail | ✅ 022 |
| GK clean-sheet attribution | ✅ `ed6bde1`, 024 |
| Team invite duplicate-name handling | ✅ 028 |

---

## Phase 9 — Accessibility (98)

Optional for ~25-player closed squad.

| Task | Status |
|------|--------|
| Skip-to-content, labelled forms | ✅ |
| Passcode fieldset + modal focus trap | Open |
| Colour contrast spot-check | Open |

---

## Phase 10 — Ops maturity (98 → 99)

| Task | Status |
|------|--------|
| Weekly DDSFL sync Action | ✅ |
| E2E in CI | ✅ |
| Admin audit log | Open |
| Sentry | Open |

---

## Category score targets (v10 → 99)

| Category | v10 | v11 | @99 | Phase |
|----------|---:|----:|----:|-------|
| Code Quality | 90 | 91 | 92 | 2, 10 |
| Security | 69 | 69 | 70 | N/A |
| Performance | 72 | 74 | 75 | ✅ |
| Accessibility | 53 | 53 | 65 | 9 |
| User Experience | 98 | 99 | 99 | 7 |
| Data Integrity | 85 | 86 | 87 | ✅ |
| DDSFL Integration | 80 | 80 | 85 | 7 |
| Database & Supabase | 98 | 98 | 98 | ✅ |
| Testing | 64 | 78 | 85 | 2 |
| DevOps | 98 | 99 | 99 | 10 |
| UI & Design | 93 | 94 | 95 | 9 |
| Copy & Content | 91 | 93 | 93 | ✅ |

---

## Recommended next 5 actions

1. **Generate the team invite link** in Admin → Squad members and share with the squad.
2. **Add squad members** via Admin → Squad (stats and profiles require a squad row).
3. **Brief the squad** on **ChrisL**-style login name (displayed elsewhere as **Chris L**).
4. **Run `npm run sync:ddsfl`** when 2026/27 fixtures publish.
5. **Sentry + admin audit log** — final lift to 99; optional push smoke test.

---

## What you do NOT need for 99

- Public-scale auth (OAuth, MFA, rate limiting)
- Full WCAG 2.2 AA certification
- Real-time DDSFL sync

---

## Tracking progress

1. Run `npm run lint`, `npm run build`, `npm run test:ci` (or push to GitHub for CI)
2. Update [AUDIT.md](AUDIT.md) — bump version and scores
3. Mark items done in this file

---

*Roadmap updated 20 June 2026 (PM). Baseline: AUDIT.md v11 (app at `7265a28`). **98/100 reached; target 99.*
