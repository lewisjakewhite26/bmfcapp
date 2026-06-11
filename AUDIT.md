# BMFC World Cup Predictor — Pre-Launch Audit

> **ARCHIVED** — This app has been replaced by **BMFC Club Hub**.  
> **Current audit:** see [`AUDITNEW.md`](AUDITNEW.md) (Club Hub v1, 11 Jun 2026).  
> Detailed category breakdown also in [`docs/PROJECT-AUDIT.md`](docs/PROJECT-AUDIT.md) (superseded by AUDITNEW.md).

> **Historical audit (v3)** — World Cup predictor only.  
> **Last updated:** 5 June 2026 · **Commit:** `bc95b62` on `main`

**Scope:** Full codebase (read-only)  
**Operator context:** Closed BMFC team app — not a public internet product; ~10–30 trusted users, private sign-up link  
**Build verified:** `npm run build` succeeds — 650.24 kB JS (192.79 kB gzip), 43.85 kB CSS  
**Lint verified:** `npm run lint` — **0 errors, 0 warnings**

### Audit history

| Version | Date | Overall | Notes |
|---------|------|--------:|-------|
| v1 | 4 Jun 2026 | 54/100 | Initial audit — public-launch framing |
| v2 | 4 Jun 2026 | 59/100 | Post P1 fixes (RLS, cron, copy) |
| **v3 (this doc)** | **5 Jun 2026** | **68/100** | Team launch framing; migrations/env/README/cron confirmed |

---

## Deployment status (operator confirmed)

| Item | Status |
|------|--------|
| Supabase migrations 001–011 | ✅ Applied |
| Vercel production domain | ✅ Working |
| Vercel env vars (`VITE_*`, service role, API-Football) | ✅ Assumed complete (site functional) |
| `CRON_SECRET` | ✅ Likely set previously |
| **Cron vs API quota** | ✅ **Fixed** — see [Resolved: cron quota](#resolved-cron-vs-api-quota) |
| README (migrations, env vars, lock rules) | ✅ Updated |
| ESLint errors + warnings | ✅ Fixed (0 / 0) |

**Security posture note:** 4-digit passcode, no login rate limiting, and no server-side session invalidation are **accepted** for this closed-team deployment — not treated as launch blockers below.

---

## Changes since audit #2

| Item | Status |
|------|--------|
| README | Full migration list, env var table, correct matchday cutoff rules |
| ESLint errors | Fixed — `PageBackground.tsx` hook, `CountryFlag.tsx` unused prop, `devBypass.ts` prefer-const |
| Cron / API quota | ✅ Fixed in `vercel.json` (`*/20`) + idle skip + 80 request cap |

---

## Resolved: cron vs API quota

**This is not an open issue.** It was flagged in audit v1 and fixed before v3.

| | Before (v1 problem) | Now (fixed) |
|---|---------------------|-------------|
| Sync schedule | `*/15` → up to **96 cron runs/day** | `*/20` → **72 cron runs/day** (`vercel.json:4`) |
| What counts toward 80 | Looked like every cron run might call API-Football | Only **actual HTTP requests** increment `api_request_log` |
| Quiet days | — | **Idle skip** — no active fixtures → **0 API calls** (cron still runs, no charge) |
| Hard stop | Could exceed provider limit in theory | App stops at **80/day** internally; your provider limit is **100/day** |

The admin sync panel **requests today: X / 80** is API-Football usage, not Vercel cron invocations. A low X on a day with 72 cron log entries is correct.

**Operator decision:** No further cron or cap changes needed for BMFC scale.

---

## 1. Code Quality & Architecture

**Score: 65 / 100**  
**Rating: Requires Improvement**  
*(was 62)*

### Strengths
- Clear separation: `pages/`, `components/`, `hooks/`, `lib/`, `api/` with typed Supabase RPC boundaries.
- TypeScript strict mode; business logic centralised in SQL RPCs + `src/lib/scoring.ts`.
- Silent prediction reload preserves scroll (`usePredictions.ts`) — polished UX detail.
- Matchday recap, payment indicator, admin user management follow existing patterns.

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Medium | `GameDayPanel.tsx:89–92` | Dead branch — `CutoffCountdown` never renders on current matchday (countdown lives in `DashboardStatusBanner` instead). |
| Low | `main.ts`, `counter.ts`, `style.css` | Vite scaffold leftovers — unused. |
| Low | `PicksProgressBar.tsx`, `scoring.ts:isFixtureLocked()` | Unused code. |
| Low | `App.tsx:4–10` | No route code splitting — 650 kB single chunk. |
| Positive | `usePredictions.ts:15–103` | Optimistic updates + silent reload on save. |

---

## 2. Security

**Score: 68 / 100**  
**Rating: Adequate for closed-team use**  
*(was 52 — re-scored for operator context; would be ~45 for a public launch)*

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
| Info | `useAuth.tsx` | localStorage sessions, no server logout | OK — low threat |
| Info | `reset_user_passcode` | Does not clear `session_token` | OK — admin-only, small group |
| Low | `api/sync-results.ts:35–38` | Dev bypass without secret in development | Safe on Vercel prod |

### For a public launch (not required now)
Rate limiting, longer passcodes, server-side session invalidation, and formal penetration review would be needed.

---

## 3. Performance

**Score: 54 / 100**  
**Rating: Adequate for team scale**  
*(unchanged — not a bottleneck at BMFC size)*

### Build output
```
dist/assets/index-DlvjnpYx.js   650.24 kB │ gzip: 192.79 kB
dist/assets/index-BXmSGmCm.css   43.85 kB │ gzip:   8.61 kB
```

### Findings

| Severity | Location | Issue |
|----------|----------|-------|
| Low | `App.tsx` | No lazy routes — large initial bundle; fine for ~20 users on mobile. |
| Low | `Landing.tsx` | Canvas animation CPU on landing visit. |
| Positive | `usePredictions.ts` | No skeleton flash / scroll jump on save. |
| Positive | `MatchScoreLine.tsx:54` | `focus({ preventScroll: true })` on score advance. |

---

## 4. Accessibility

**Score: 42 / 100**  
**Rating: Inadequate**  
*(unchanged — team app, but still worth improving over time)*

| Severity | Issue |
|----------|-------|
| High | No skip link; auth labels lack `htmlFor`; PinInput / ScoreInput unnamed |
| Medium | Matchday recap modal has dialog semantics but no focus trap |
| Positive | Status banner `aria-live`; payment indicator `aria-label`; recap modal `role="dialog"` |

Touch targets meet 44px guideline throughout.

---

## 5. User Experience

**Score: 74 / 100**  
**Rating: Good**  
*(was 72)*

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

Scoring (10 / 5 / 0) correct in SQL and client. Matchday cutoff enforced server-side in `submit_prediction`.

| Severity | Issue |
|----------|-------|
| Medium | Manual `complete_game_day` does not enqueue progression — auto-complete path does. |
| Low | Knockout penalty score source (FT vs PEN) undocumented for users. |
| Positive | Auto-progression checks all fixtures complete before advancing. |

---

## 7. API Integration & Cron

**Score: 78 / 100**  
**Rating: Good — quota issue resolved**

### Status: ✅ Fixed (not open)

Cron schedule and API daily cap are aligned. No action required.

### How it works

| Setting | Value | Notes |
|---------|-------|-------|
| Sync cron | `*/20` → **72 Vercel invocations/day** | `vercel.json:4` |
| Progression cron | `*/5` | Only calls API when knockout jobs queued |
| Internal daily cap | **80 API-Football requests** | `syncResults.ts:5`, `processProgression.ts:3` |
| Provider limit | **100/day** (operator account) | 20 headroom below provider cap |
| Idle skip | Yes | Sync skips API call when no fixtures in active window — most off-day cron runs cost **0** requests |

**Important distinction:** Admin sync panel shows **API requests consumed**, not cron invocations. Seeing 72 cron runs in Vercel logs with a low request count is correct behaviour.

### Match-day usage (typical, not a problem)

On a busy day, sync may call API-Football several times while matches are live — well under the **80** internal cap and your **100** provider limit. Progression adds occasional extra calls during knockouts only when placeholder teams need resolving.

**Not an issue:** The old audit warning about 96 runs/day exceeding 80 applied before the schedule was changed to `*/20` and before idle-skip logic was documented.

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
*(was 72 — migrations applied on production)*

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

**Score: 14 / 100**  
**Rating: Inadequate**  
*(was 12 — lint now clean)*

| Severity | Issue |
|----------|-------|
| Medium | Zero automated tests — acceptable for v1 team launch, risky for refactors. |
| Medium | No CI workflow. |
| Positive | `npm run build` passes; `npm run lint` clean (0 errors, 0 warnings). |

### ESLint (current)

No open lint issues as of this audit.

---

## 10. DevOps & Deployment

**Score: 72 / 100**  
**Rating: Good**  
*(was 50 — README fixed, production live)*

| Item | Status |
|------|--------|
| Vercel SPA + API routes | ✅ |
| Cron jobs configured | ✅ |
| README migration + env docs | ✅ |
| `.env.example` complete | ✅ |
| Error monitoring (Sentry) | ❌ Not configured — low priority for team app |
| CI pipeline | ❌ Not configured |

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
*(was 78 — README aligned with app)*

Dashboard, Landing, and README describe matchday cutoff correctly. Minor: "Login" vs "Log in", `COPY.md` may be stale.

---

## Overall Assessment

| Metric | Value |
|--------|-------|
| **Overall score** | **68 / 100** |
| **Overall rating** | **Good — ready for BMFC team launch** |
| **Previous score** | 59 / 100 (audit #2) |
| **Public-launch equivalent** | ~58 / 100 (security/testing gaps would matter more) |

### Category summary

| # | Category | Score | Δ | Rating |
|---|----------|------:|---|--------|
| 1 | Code Quality & Architecture | 65 | +3 | Requires Improvement |
| 2 | Security | 68 | +16 | Adequate (closed team) |
| 3 | Performance | 54 | — | Adequate |
| 4 | Accessibility | 42 | — | Inadequate |
| 5 | User Experience | 74 | +2 | Good |
| 6 | Data Integrity & Business Logic | 72 | — | Good |
| 7 | API Integration & Cron | 78 | +16 | Good |
| 8 | Database & Supabase | 82 | +10 | Good |
| 9 | Testing & Reliability | 14 | +2 | Inadequate |
| 10 | DevOps & Deployment | 72 | +22 | Good |
| 11 | UI & Design Consistency | 78 | — | Good |
| 12 | Copy & Content | 82 | +4 | Good |

---

## Prioritised Action List

### P1 — Do before wider sharing (if any)

*All previous P1 infra items complete — including cron/API quota. Nothing blocking BMFC team use.*

*(No open P1 items.)*

### P2 — When you have time

1. Remove dead code — `main.ts`, `counter.ts`, `style.css`, `PicksProgressBar.tsx`, `isFixtureLocked()`.
2. Fix `GameDayPanel.tsx:89–92` dead countdown branch (or remove it).
3. Deduplicate dashboard empty state (banner OR card).
4. Accessibility pass — form labels, score input names, skip link.
5. Add CI — `npm run lint` + `npm run build` on push.
6. Wire manual `complete_game_day` to progression queue (or document admin workflow).

### P3 — Nice to have

1. Route code splitting (Admin, Landing).
2. Unit tests for scoring + cutoff RPCs.
3. Re-sync `COPY.md` with current UI strings.
4. Onboarding tooltip for predict-then-submit flow.
5. Error monitoring if the app grows beyond the core team.

### Explicitly not required (operator decision)

- Login rate limiting / longer passcodes
- Server-side session invalidation on logout / passcode reset
- **Cron schedule changes, raising API cap, or smoke-testing cron** — already fixed and adequate
- Faster sync interval (20 min is fine for team scale)

---

## Summary

For a **closed BMFC team deployment**, the app is in **good shape to run the tournament**. Infrastructure is in place: migrations applied, production live, cron schedule reconciled with API quota (72 sync runs/day, 80 request cap, 100 provider limit), predictions privacy fixed, README accurate, lint clean.

The UI is polished and actively refined (recap modal, payment indicator, scroll-preserving saves). Weak spots — automated testing, accessibility, and bundle size — are real but **proportionate to a private ~20-user app**, not launch blockers.

If you ever opened this to the public internet, revisit security (passcode strength, rate limiting, session invalidation) and testing first.

---

*End of audit v3. Reflects `main` at bc95b62 (matchday recap, scroll fix, README, ESLint fixes).*
