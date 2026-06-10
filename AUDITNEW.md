# BMFC World Cup Predictor — Pre-Launch Audit

> **Current audit (v4)** — supersedes `AUDIT.md` v3.  
> **Last updated:** 5 June 2026 · **Commit:** `172c452` on `main`

**Scope:** Full codebase (read-only) + live verification  
**Operator context:** Closed BMFC team app — not a public internet product; ~10–30 trusted users, private sign-up link  
**Build verified:** `npm run build` succeeds — 648.14 kB JS (192.45 kB gzip), 43.25 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**  
**Tests verified:** `npm run test:ci` — **28 tests** across 3 files (scoring, recap tier, recap storage)

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 4 Jun 2026 | 54/100 | Initial audit — public-launch framing |
| v2 | 4 Jun 2026 | 59/100 | Post P1 fixes (RLS, cron, copy) |
| v3 | 5 Jun 2026 | 68/100 | Team launch framing; migrations/env/README/cron confirmed |
| **v4 (this doc)** | **5 Jun 2026** | **71/100** | Vitest suite, GitHub Actions CI, dead-code cleanup, partial a11y |

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–011 | ✅ Applied |
| Vercel production domain | ✅ Working |
| Vercel env vars (`VITE_*`, service role, API-Football) | ✅ Assumed complete (site functional) |
| `CRON_SECRET` | ✅ Likely set previously |
| **Cron vs API quota** | ✅ **Fixed** — see [Resolved: cron quota](#resolved-cron-vs-api-quota) |
| README (migrations, env vars, lock rules, test scripts) | ✅ Updated |
| ESLint errors + warnings | ✅ Fixed (0 / 0) |
| GitHub Actions CI | ✅ Added (`.github/workflows/ci.yml`) |
| Unit tests (Vitest) | ✅ 28 tests on core business logic |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-team deployment — not treated as launch blockers below.

---

## Changes since audit v3

| Item | Status |
|------|--------|
| Dead code removal | ✅ Scaffold files, `PicksProgressBar.tsx`, `isFixtureLocked()`, `GameDayPanel` dead countdown branch |
| Auth refactor | ✅ Split into `AuthProvider.tsx`, `authContext.ts`, `useAuth.ts`; `adminPayments.ts` extracted |
| Accessibility (partial) | ✅ `htmlFor` on login/signup fields; `PinInput` / `ScoreInput` `aria-label` support |
| Vitest test suite | ✅ `src/lib/__tests__/` — scoring, cutoffs, recap tier, recap storage |
| GitHub Actions CI | ✅ Lint → build → `test:ci` on push/PR to `main` |
| `CutoffCountdown.tsx` | ⚠️ **Orphaned** — no imports remain; countdown lives in `DashboardStatusBanner` |

---

## Resolved: cron vs API quota

**This is not an open issue.** Unchanged from v3.

| | Before (v1 problem) | Now (fixed) |
|---|---------------------|-------------|
| Sync schedule | `*/15` → up to **96 cron runs/day** | `*/20` → **72 cron runs/day** (`vercel.json:4`) |
| What counts toward 80 | Looked like every cron run might call API-Football | Only **actual HTTP requests** increment `api_request_log` |
| Quiet days | — | **Idle skip** — no active fixtures → **0 API calls** |
| Hard stop | Could exceed provider limit in theory | App stops at **80/day** internally; provider limit **100/day** |

**Operator decision:** No further cron or cap changes needed for BMFC scale.

---

## 1. Code Quality & Architecture

**Score: 71 / 100**  
**Rating: Good**  
*(was 65)*

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/`, `api/` with typed Supabase RPC boundaries.
- TypeScript strict mode; business logic centralised in SQL RPCs + `src/lib/scoring.ts`.
- Auth cleanly split — `AuthProvider` / `authContext` / `useAuth` resolves prior ESLint fast-refresh warnings.
- Silent prediction reload preserves scroll (`usePredictions.ts`); matchday recap and admin patterns consistent.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `CutoffCountdown.tsx` | Orphaned component — duplicate countdown logic; `DashboardStatusBanner` owns the live UI. Safe to delete. |
| Low | `App.tsx` | No route code splitting — 648 kB single chunk. |
| Positive | `9e34f50` cleanup | Removed scaffold leftovers, unused progress bar, dead `GameDayPanel` branch. |
| Positive | `src/lib/__tests__/` | Core lib logic now has automated regression coverage. |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-team use**  
*(unchanged — re-scored for operator context; would be ~45 for a public launch)*

### Strengths
- Predictions privacy fixed (`008`) — direct SELECT blocked; `get_user_predictions` RPC with session check.
- Server secrets not exposed via `VITE_`; prod build fails without Supabase env.
- Admin RPCs verify `is_admin` + session token.
- Cron routes protected by `CRON_SECRET` on production.
- Service role confined to `api/` server code.

### Findings (informational — accepted for BMFC)

| Severity | Location | Issue | Operator stance |
|----------|----------|-------|-----------------|
| Info | `001_schema.sql` | 4-digit passcode | OK — trusted team |
| Info | `login_user` RPC | No rate limiting | OK — closed group |
| Info | `useAuth.ts` / localStorage | Sessions in localStorage, no server logout | OK — low threat |
| Info | `reset_user_passcode` | Does not clear `session_token` | OK — admin-only, small group |
| Low | `api/sync-results.ts` | Dev bypass without secret in development | Safe on Vercel prod |

### For a public launch (not required now)
Rate limiting, longer passcodes, server-side session invalidation, and formal penetration review would be needed.

---

## 3. Performance

**Score: 54 / 100**  
**Rating: Adequate for team scale**  
*(unchanged)*

### Build output
```
dist/assets/index-DVvOypA2.js   648.14 kB │ gzip: 192.45 kB
dist/assets/index-uqH0dIXh.css   43.25 kB │ gzip:   8.53 kB
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No lazy routes — large initial bundle; fine for ~20 users on mobile. |
| Low | `Landing.tsx` | Canvas animation CPU on landing visit. |
| Positive | `usePredictions.ts` | No skeleton flash / scroll jump on save. |
| Positive | `MatchScoreLine.tsx` | `focus({ preventScroll: true })` on score advance. |

---

## 4. Accessibility

**Score: 50 / 100**  
**Rating: Requires Improvement**  
*(was 42)*

### Improvements since v3
- Login / signup username and display-name fields use `htmlFor` + matching `id`.
- `PinInput` exposes `groupLabel` and per-digit `aria-label`.
- `ScoreInput` requires an `ariaLabel` prop (used from `MatchScoreLine`).

### Remaining gaps

| Severity | Issue |
|----------|-------|
| Medium | No skip-to-content link |
| Medium | Matchday recap modal has dialog semantics but no focus trap / initial focus management |
| Low | Passcode label on login uses `id` but is not wired to PinInput via `aria-labelledby` |
| Positive | Status banner `aria-live`; payment indicator `aria-label`; recap modal `role="dialog"` |

Touch targets meet 44px guideline throughout.

---

## 5. User Experience

**Score: 74 / 100**  
**Rating: Good**  
*(unchanged)*

### Strengths
- Clear flow: Landing → Signup → Dashboard → Submit → Leaderboard.
- Matchday recap modal (points, rank, tiered celebration, haptics).
- Payment reminder with urgency tiers.
- Correct cutoff copy on Dashboard and Landing.
- Scroll preserved during prediction entry.
- Logout returns to landing.

### Findings

| Severity | Issue |
|----------|-------|
| Low | Duplicate empty state when no matchday open (banner + card). |
| Low | No onboarding for predict-then-submit flow. |
| Low | Recap only triggers from Dashboard, not History. |

---

## 6. Data Integrity & Business Logic

**Score: 72 / 100**  
**Rating: Good**  
*(unchanged)*

Scoring (10 / 5 / 0) correct in SQL and client — **now covered by 15 automated tests** in `scoring.test.ts`. Matchday cutoff enforced server-side in `submit_prediction`.

| Severity | Issue |
|----------|-------|
| Medium | Manual `complete_game_day` does not enqueue progression — auto-complete path does. |
| Low | Knockout penalty score source (FT vs PEN) undocumented for users. |
| Positive | Auto-progression checks all fixtures complete before advancing. |
| Positive | Vitest validates exact score, correct result, draw, and cutoff lock timing. |

---

## 7. API Integration & Cron

**Score: 78 / 100**  
**Rating: Good — quota issue resolved**  
*(unchanged)*

Cron schedule and API daily cap are aligned. No action required.

| Setting | Value | Notes |
|---------|-------|-------|
| Sync cron | `*/20` → **72 Vercel invocations/day** | `vercel.json:4` |
| Progression cron | `*/5` | Only calls API when knockout jobs queued |
| Internal daily cap | **80 API-Football requests** | `syncResults.ts`, `processProgression.ts` |
| Provider limit | **100/day** | 20 headroom below provider cap |
| Idle skip | Yes | Sync skips API call when no fixtures in active window |

### Other findings (minor)

| Severity | Issue |
|----------|-------|
| Low | No HTTP retry on API-Football fetch failure — next cron run (≤20 min) retries. Acceptable. |
| Low | Team alias map has 6 entries — edge-case name mismatches possible. |
| Positive | Persistent `fixture_api_mapping`; idle skip saves quota on quiet days. |

---

## 8. Database & Supabase

**Score: 82 / 100**  
**Rating: Good**  
*(unchanged)*

| Table | Public read | Notes |
|-------|-------------|-------|
| `predictions` | ❌ | Fixed via `008` |
| `fixtures`, `game_days` | ✅ | Intended |
| `users` | ❌ | Correct |

### Migrations (all applied)
`001` → `002` → `003` → `005`–`011` (no `004` — normal gap)

| Migration | Purpose |
|-----------|---------|
| `008` | Predictions privacy |
| `009` | Admin delete user |
| `010` | `has_paid` in session |
| `011` | Matchday recap RPC |

---

## 9. Testing & Reliability

**Score: 58 / 100**  
**Rating: Adequate for team scale**  
*(was 14)*

### What exists

| Area | Coverage |
|------|----------|
| Scoring rules (10 / 5 / 0) | ✅ 4 dedicated + direction tests |
| Matchday cutoff / lock timing | ✅ 7 tests with fake timers |
| Recap tier classification | ✅ 6 tier + ordinal + headline tests |
| Recap localStorage dismiss | ✅ 4 tests |
| CI pipeline | ✅ Lint, build, `test:ci` on every push/PR |

### Gaps

| Severity | Issue |
|----------|-------|
| Medium | No component / E2E tests (auth flow, prediction submit, admin). |
| Medium | No integration tests against Supabase RPCs. |
| Low | Vitest can flake on **Windows** when project path contains spaces (thread worker timeout); `vite.config.ts` uses `pool: 'threads', maxWorkers: 1` as mitigation. **GitHub Actions (Linux) should run cleanly.** |
| Positive | `npm run build` passes; `npm run lint` clean; `test:ci` exits (no watch-mode hang). |

---

## 10. DevOps & Deployment

**Score: 86 / 100**  
**Rating: Good**  
*(was 72)*

| Item | Status |
|------|--------|
| Vercel SPA + API routes | ✅ |
| Cron jobs configured | ✅ |
| README migration + env docs | ✅ |
| `.env.example` complete | ✅ |
| **GitHub Actions CI** | ✅ `.github/workflows/ci.yml` — lint, build, test |
| Error monitoring (Sentry) | ❌ Not configured — low priority for team app |

### CI pipeline (added in `172c452`)

```yaml
# Runs on push/PR to main|master
npm ci → npm run lint → npm run build → npm run test:ci
```

Uses `test:ci` (`vitest run`) so the job exits immediately — watch mode (`npm test`) is for local dev only.

---

## 11. UI & Design Consistency

**Score: 78 / 100**  
**Rating: Good**  
*(unchanged)*

Cohesive brand, glass cards, recap tier animations, payment urgency tiers, responsive mobile nav. Strongest category.

---

## 12. Copy & Content

**Score: 82 / 100**  
**Rating: Good**  
*(unchanged)*

Dashboard, Landing, and README describe matchday cutoff correctly. Minor: "Login" vs "Log in", `COPY.md` may be stale.

---

## Overall Assessment

| Metric | Value |
|--------|-------|
| **Overall score** | **71 / 100** |
| **Overall rating** | **Good — ready for BMFC team launch** |
| **Previous score** | 68 / 100 (audit v3) |
| **Public-launch equivalent** | ~61 / 100 (security/testing gaps would matter more) |

### Category summary

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | Code Quality & Architecture | 71 | +6 | Good |
| 2 | Security | 68 | — | Adequate (closed team) |
| 3 | Performance | 54 | — | Adequate |
| 4 | Accessibility | 50 | +8 | Requires Improvement |
| 5 | User Experience | 74 | — | Good |
| 6 | Data Integrity & Business Logic | 72 | — | Good |
| 7 | API Integration & Cron | 78 | — | Good |
| 8 | Database & Supabase | 82 | — | Good |
| 9 | Testing & Reliability | 58 | +44 | Adequate |
| 10 | DevOps & Deployment | 86 | +14 | Good |
| 11 | UI & Design Consistency | 78 | — | Good |
| 12 | Copy & Content | 82 | — | Good |

---

## Prioritised Action List

### P1 — Do before wider sharing (if any)

*All previous P1 infra items complete — including cron/API quota, CI, and core unit tests. Nothing blocking BMFC team use.*

*(No open P1 items.)*

### P2 — When you have time

1. Delete orphaned `CutoffCountdown.tsx` (countdown already in `DashboardStatusBanner`).
2. Deduplicate dashboard empty state (banner OR card).
3. Finish accessibility pass — skip link, recap focus trap, passcode `aria-labelledby`.
4. Wire manual `complete_game_day` to progression queue (or document admin workflow).

### P3 — Nice to have

1. Route code splitting (Admin, Landing).
2. Component or E2E tests for auth + prediction submit flow.
3. Re-sync `COPY.md` with current UI strings.
4. Onboarding tooltip for predict-then-submit flow.
5. Error monitoring if the app grows beyond the core team.

### Completed since v3 (no longer on action list)

- ~~Remove dead code — scaffold, `PicksProgressBar`, `isFixtureLocked()`, `GameDayPanel` dead branch~~
- ~~Add CI — lint + build + test on push~~
- ~~Unit tests for scoring + cutoff logic~~
- ~~Partial a11y — form labels, score/pin input names~~

### Explicitly not required (operator decision)

- Login rate limiting / longer passcodes
- Server-side session invalidation on logout / passcode reset
- Cron schedule changes, raising API cap, or smoke-testing cron
- Faster sync interval (20 min is fine for team scale)

---

## Summary

For a **closed BMFC team deployment**, the app is in **strong shape to run the tournament**. Since v3, the biggest gains are **automated testing** (28 Vitest cases on scoring, cutoffs, and recap logic) and **GitHub Actions CI** so every push verifies lint, build, and tests.

Infrastructure remains solid: migrations applied, production live, cron reconciled with API quota, predictions privacy fixed, README accurate, lint clean. The UI is polished (recap modal, payment indicator, scroll-preserving saves). Remaining weak spots — full accessibility, E2E coverage, and bundle size — are **proportionate to a private ~20-user app**, not launch blockers.

If you ever opened this to the public internet, revisit security (passcode strength, rate limiting, session invalidation) and expand test coverage first.

---

*End of audit v4. Reflects `main` at `172c452` (Vitest suite, GitHub Actions CI, audit clean-up, partial a11y).*
