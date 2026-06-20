# BMFC Club Hub — Roadmap to 99 / 100

**Baseline:** [AUDITNEW.md](../AUDITNEW.md) v8 — **94 / 100** (20 June 2026)  
**Target:** **99 / 100** — polished private squad app with strong test coverage and ops closure  
**Status:** **94 reached** — finance admin shipped; ops + testing remain

---

## Overview

| Milestone | Score | Status |
|-----------|------:|--------|
| v5 — lazy routes, live matchday, photos | 90 | ✅ |
| v6 — invite onboarding, passcode self-service | 92 | ✅ |
| v7 — prod fixes, ChrisL, photo grant | 93 | ✅ |
| **v8 — finance admin (sponsorships + expenses)** | **94** | ✅ |
| Ops closure (019–022 + squad + VAPID) | ~95 | In progress |
| E2E + unit tests | ~96 | Open |
| Polish (GK, canvas, a11y) | ~97 | Optional |
| Audit log + Sentry | ~99 | Optional |

Remaining lift to **99**:

| Priority | Area | Notes |
|----------|------|-------|
| 1 | **Ops** | Migrations 019–022, populate squad, VAPID, DDSFL sync |
| 2 | **Testing** | Playwright E2E (62 → 85 category score) |
| 3 | **Polish** | Landing canvas pause, GK fix when relevant |
| 4 | **A11y** | Fieldset, focus trap, contrast (optional for closed squad) |
| 5 | **Observability** | Sentry, admin audit log |

---

## Score projection

| Milestone | Overall | Status |
|-----------|--------:|--------|
| v7 — hotfixes (7189fcc–f91371c) | 93 | ✅ |
| **v8 — finance admin (79c9688 / 022)** | **94** | ✅ |
| Ops: 019–022 + squad populated | ~95 | ⚠️ Operator |
| E2E smoke tests | ~96 | Open |
| GK fix + canvas pause | ~97 | Parked / optional |
| Partial a11y | ~98 | Optional |
| Audit log + Sentry | ~99 | Optional |

---

## Timeline

```mermaid
gantt
    title Roadmap to 99 (revised 20 Jun 2026 PM)
    dateFormat  YYYY-MM-DD
    section v6–v8 DONE
    Onboarding + passcode (019)           :done, v6, 2026-06-20, 1d
    match_events FK fix (7189fcc)         :done, v7a, 2026-06-20, 1d
    ChrisL display name (020)             :done, v7b, 2026-06-20, 1d
    photo_url grant (021)                 :done, v7c, 2026-06-20, 1d
    Finance admin (022)                   :done, v8, 2026-06-20, 1d
    section Ops — to 95
    Apply migrations 019–022 Supabase     :active, ops1, 2026-06-20, 1d
    Populate squad table (Admin)          :ops2, 2026-06-20, 1d
    VITE_VAPID_PUBLIC_KEY on Vercel       :ops3, 2026-06-21, 1d
    npm run sync:ddsfl                      :ops4, 2026-06-21, 1d
    section Testing — to 96
    Playwright E2E login + availability   :t1, 2026-06-23, 2d
    Playwright E2E invite + admin result  :t2, 2026-06-25, 2d
    Unit tests formations + auth errors   :t3, 2026-06-26, 1d
    section Polish — to 97
    GK clean-sheet fix                    :p1, 2026-08-01, 1d
    Pause landing canvas                  :p2, 2026-06-30, 1d
    section A11y — to 98
    Passcode fieldset + focus trap        :a1, 2026-07-05, 1d
    section Ops maturity — to 99
    Admin audit log                       :o1, 2026-07-10, 2d
    Sentry                                :o2, 2026-07-12, 1d
```

---

## Phase 6 — Onboarding & auth ✅

| Task | Status | Ref |
|------|--------|-----|
| Admin creates invite without pre-entered name | ✅ | `538e006`, 019 |
| Player enters first + last name on invite | ✅ | 019 |
| Display name **ChrisL** (no space) | ✅ | `8d092a8`, 020 |
| Username **clee** + collision suffix | ✅ | 019 |
| Admin edit names; player change passcode | ✅ | 019 |
| Mock-mode parity | ✅ | |
| Apply 019–020 on production | ⚠️ | Operator |

---

## Phase 6b — Production hotfixes ✅

| Task | Status | Ref |
|------|--------|-----|
| Dashboard/calendar 400 — dual FK on `match_events` | ✅ | `7189fcc` |
| Stats 400 — `photo_url` column not granted | ✅ | `f91371c`, 021 |
| Calendar fundraisers skip admin RPC for players | ✅ | `7189fcc` |
| Apply migration 021 on production | ⚠️ | Operator |

---

## Phase 6c — Finance admin ✅

| Task | Status | Ref |
|------|--------|-----|
| Sponsorship CRUD (categories, paid toggle, ledger) | ✅ | `79c9688`, 022 |
| Expense CRUD (categories, ledger) | ✅ | 022 |
| Overview dashboard (paid/pending, net, breakdown charts) | ✅ | `AdminFinance.tsx` |
| Admin + committee access (not admin-only) | ✅ | `assert_finance_user` |
| Server-side `logged_by` / `edited_by` (never client-supplied) | ✅ | 022 RPCs |
| Mock-mode parity | ✅ | `mockFinance.ts` |
| Apply migration 022 on production | ⚠️ | Operator |

---

## Phase 1–5 — Previously complete

Migrations 001–018, lazy routes, live matchday, photos, events, fundraisers, copy audit, weekly DDSFL sync, official crest PWA.

---

## Phase 7 — Ops closure (94 → 95)

| Task | Status | Notes |
|------|--------|-------|
| Apply **019** on Club Hub | ⚠️ | 3-arg DROP + explicit GRANTs |
| Apply **020** on Club Hub | ⚠️ | ChrisL format + backfill |
| Apply **021** on Club Hub | ⚠️ | `GRANT SELECT (photo_url)` |
| Apply **022** on Club Hub | ⚠️ | Finance tables + RPCs |
| Add squad members (Admin → Squad) | ⚠️ | Required for stats + player profiles |
| Brief squad on **ChrisL** login format | ⚠️ | After 020 |
| `VITE_VAPID_PUBLIC_KEY` on Vercel | ⚠️ | |
| `npm run sync:ddsfl` | ⚠️ | When fixtures publish |

---

## Phase 2 — Testing depth (95 → 96)

**Target:** Testing **62 → 85**

| Task | Status |
|------|--------|
| `playerNames.ts` unit tests (ChrisL format) | ✅ |
| `liveMatchEvents` unit tests | ✅ |
| Playwright E2E: login → dashboard | Open |
| Playwright E2E: availability | Open |
| Playwright E2E: invite → name → passcode | Open |
| Playwright E2E: admin result entry | Open |
| Unit tests: `lineupFormations.ts` | Open |
| Unit tests: `getAuthErrorMessage` | Open |
| Unit tests: finance overview calculations | Open |

---

## Phase 3 — Performance polish (96 → 97)

| Task | Status |
|------|--------|
| Lazy admin routes (~180 kB gzip) | ✅ |
| `AdminFinance` lazy chunk (~3.5 kB gzip) | ✅ |
| Pause landing canvas off-screen | Open |

---

## Phase 8 — Data integrity (97)

| Task | Status |
|------|--------|
| Unique `(first_name, last_name)` | ✅ 019 |
| Display collision `ChrisL2`, `ChrisL3` | ✅ 020 |
| Finance ledger audit trail | ✅ 022 |
| GK clean-sheet over-count | ⏸️ Parked |

---

## Phase 9 — Accessibility (97 → 98)

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
| Admin audit log | Open |
| Sentry | Open |
| E2E in CI | Open |

---

## Category score targets (v8 → 99)

| Category | v7 | v8 | @99 | Phase |
|----------|---:|---:|----:|-------|
| Code Quality | 89 | 90 | 91 | 2, 10 |
| Security | 69 | 69 | 70 | N/A |
| Performance | 72 | 72 | 75 | 3 |
| Accessibility | 53 | 53 | 65 | 9 |
| User Experience | 97 | 98 | 99 | 7 |
| Data Integrity | 80 | 81 | 83 | 8 |
| DDSFL Integration | 80 | 80 | 85 | 7 |
| Database & Supabase | 96 | 97 | 97 | 7 |
| Testing | 62 | 62 | 85 | 2 |
| DevOps | 96 | 96 | 99 | 7, 10 |
| UI & Design | 92 | 93 | 95 | 9 |
| Copy & Content | 91 | 91 | 93 | ✅ |

---

## Recommended next 5 actions

1. **Apply migrations 019, 020, 021, 022** on Club Hub Supabase (in order).
2. **Add squad members** via Admin → Squad (stats and profiles require a squad row).
3. **Hard-refresh** production after Vercel deploy (`79c9688`) — Finance available at Admin → Finance after 022.
4. **Add `VITE_VAPID_PUBLIC_KEY` on Vercel** and redeploy.
5. **Playwright E2E** — biggest score lift toward 96+.

---

## What you do NOT need for 99

- Public-scale auth (OAuth, MFA, rate limiting)
- Full WCAG 2.2 AA certification
- Real-time DDSFL sync

---

## Tracking progress

1. Run `npm run lint`, `npm run build`, `npm run test:ci`
2. Update [AUDITNEW.md](../AUDITNEW.md) — bump version and scores
3. Mark items done in this file

---

*Roadmap updated 20 June 2026 (PM). Baseline: AUDITNEW.md v8 (app at `79c9688`). **94/100 reached; target 99.*
