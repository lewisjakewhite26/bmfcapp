# BMFC Club Hub: input placeholders

Inventory of all `placeholder` attributes on `<input>` and `<textarea>` fields in the app (June 2026).

Tone follows [`COPY-RULES.md`](./COPY-RULES.md): UK English, sentence case in examples, plain committee voice, concrete hints where helpful.

---

## Auth

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `LoginForm.tsx` | Login name | `ChrisL` |
| `LoginForm.tsx` | Passcode | `••••` |
| `InviteForm.tsx` | Passcode | `••••` |
| `InviteForm.tsx` | Confirm passcode | `••••` |
| `ChangePasscodeForm.tsx` | Current passcode | `••••` |
| `ChangePasscodeForm.tsx` | New passcode | `••••` |
| `ChangePasscodeForm.tsx` | Confirm new passcode | `••••` |

**Notes:** Invite first/surname fields have no placeholder (labels only). Passcode fields use bullet masking, not literal hint text.

---

## Player

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AvailabilityForm.tsx` | Note (optional) | `e.g. away for the weekend, injured` |

---

## Admin: squad members

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminUsers.tsx` | Invite label | `e.g. trialist A (optional)` |
| `AdminUsers.tsx` | First name (edit names) | `First name` |
| `AdminUsers.tsx` | Last name (edit names) | `Last name` |
| `AdminUsers.tsx` | New passcode (reset modal) | `••••` |

---

## Admin: squad numbers

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminSquad.tsx` | Shirt number | `#` |

---

## Admin: fixtures

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminFixtures.tsx` | Competition name | Dynamic (see below) |
| `AdminFixtures.tsx` | Opponent | `-` |
| `AdminFixtures.tsx` | Venue (home) | `Bishop Middleham Park` |
| `AdminFixtures.tsx` | Venue (away) | `e.g. Willington Recreation Ground` |

### Competition name (dynamic)

From `fixtureCompetitions.ts` via `presetMeta.placeholder`:

| Preset | Placeholder |
|--------|-------------|
| Friendly | `Friendly` |
| League | `Swinburne Maddison Second Division` |
| Cup / trophy | `e.g. Alan Smith Memorial Trophy` |
| Other | `e.g. charity match` |

---

## Admin: results

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `ResultEntryForm.tsx` | Notes | `Optional` |
| `ResultEntryForm.tsx` | Minute (match event) | `e.g. 67` |

---

## Admin: training

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminTraining.tsx` | Notes | `Optional` |

**Default location value (not placeholder):** `Bishop Middleham Park`

---

## Admin: calendar events

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminEvents.tsx` | Title | `e.g. end of season social` |
| `AdminEvents.tsx` | Location | `Optional` |
| `AdminEvents.tsx` | Notes | `Optional` |

---

## Admin: fundraisers

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminFundraisers.tsx` | Event name | `e.g. Last Man Standing` |
| `AdminFundraisers.tsx` | Notes (`<textarea>`) | `Optional notes` |

---

## Admin: finance

| Page / component | Field (label) | Placeholder |
|------------------|---------------|-------------|
| `AdminFinance.tsx` | Sponsor name | `Sponsor name` |
| `AdminFinance.tsx` | Details | `e.g. home shirts (optional)` |
| `AdminFinance.tsx` | Amount (sponsorship) | `Amount (£)` |
| `AdminFinance.tsx` | Description (transaction) | `Description` |
| `AdminFinance.tsx` | Amount (transaction) | `Amount (£)` |

---

## Fields without placeholders

These inputs use labels only (no `placeholder` attribute):

| Page / component | Fields |
|------------------|--------|
| `InviteForm.tsx` | First name, surname |
| `AdminNotifications.tsx` | Title, message (`<textarea>`), link |
| `AdminFinance.tsx` | Date fields (native date inputs) |
| Various admin forms | Date / time / `<select>` controls |

---

## Non-UI placeholders (excluded)

| Location | Purpose |
|----------|---------|
| `src/lib/supabase.ts` | Fallback Supabase URL/key when env vars missing (not shown in UI) |

---

## Copy-rules pass (June 2026)

Changes applied in the same pass as this inventory:

- Default home venue renamed to **Bishop Middleham Park** (was Recreation Ground).
- Example text moved to sentence case where appropriate (`e.g. charity match`, `e.g. Last Man Standing`).
- Optional hints simplified (`e.g. trialist A (optional)` instead of label-first phrasing).
- Match-event minute hint made concrete (`e.g. 67` instead of `Min`).
- Availability note ellipsis removed for a cleaner hint.
- Em dashes removed from UI copy per COPY-RULES (use full stops or parentheses instead).
