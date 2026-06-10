# BMFC Club Hub — copy rules (human tone)

Derived from [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (June 2026), adapted for **user-facing app copy** — buttons, headings, toasts, empty states, admin labels, push notifications.

Machine-readable version: [`copy-rules.json`](./copy-rules.json)

---

## Voice for this product

| Do | Don't |
|----|-------|
| Sound like a mate on the committee explaining something | Sound like a startup landing page or travel brochure |
| Use plain British English | Use American marketing register |
| Keep sentences short; one idea per line in UI | Pad with significance, legacy, or “broader trends” |
| Name concrete things (opponent, date, passcode, invite link) | Vague authorities (“experts say”, “industry reports”) |
| Use **is** / **has** / **are** | Replace with “serves as”, “boasts”, “features”, “underscores” |

**Club names:** Bishop Middleham FC (app), Bishop Middleham Football Club (formal/DDSFL). League: DDSFL Third Division when relevant.

---

## UK English (en-GB)

All user-facing copy uses **British English**. The app locale is `en-GB`; dates in the UI already format that way in code.

### Spelling

| Use (UK) | Not (US) |
|----------|----------|
| colour, favour, honour | color, favor, honor |
| organise, recognise, synchronise | organize, recognize, synchronize |
| centre | center (in prose — not CSS class names) |
| grey | gray |
| licence (noun), license (verb) | mixing these up |
| defence, offence | defense, offense |
| programme (schedule of events) | program |
| practise (verb), practice (noun) | getting these swapped |
| travelled, labelled | traveled, labeled |
| maths | math |
| whilst, among | while, amongst (either UK pair is fine; don’t use US-only *gotten*, *normalcy*) |

### Words and football context

| Use | Not |
|-----|-----|
| match, game, fixture | *soccer*; avoid US *game* when *match* is clearer |
| league table, table | *standings* (US sports) |
| kit, pitch, clean sheet | uniform, field, shutout |
| gaffer, lads, squad | *coach* (unless quoting someone) |
| MOTM, cards, appearance | *MVP*, *ejections*, *games played* |
| WhatsApp | *text message* when you mean WhatsApp |
| mobile / phone | *cell phone*, *cellular* |
| postcode | *zip code* |
| autumn | *fall* |

### Dates, numbers, punctuation

- Dates: **10 Aug 2025** or **10/08/2025** (day before month). Not US month-first.
- Times: **10:30** or **10:30am** — consistent with existing `en-GB` formatting in the app.
- Use **full stops** not “periods”. Say *full stop* only in meta docs, not UI.
- Prefer **£** if money ever appears (unlikely here).
- **−** or **–** for scorelines is fine (`2–1`); avoid em dashes in sentences (see formatting below).

### Contractions and tone

- British contractions are fine: *isn’t*, *can’t*, *you’re*, *haven’t*, *won’t*.
- Avoid US-only informal: *y’all*, *gotten*, *I guess*, *touch base*, *reach out* (corporate US).

### Americanisms to avoid in UI copy

```
gotten, normalcy, reach out, touch base, awesome, super (as intensifier),
you guys, vacation (use holiday), sidewalk, trash (use rubbish sparingly),
cell phone, zip code, soccer, standings, shutout, uniform, field (for pitch)
```

---

## Avoid — AI vocabulary

Do not use these in UI copy unless quoting a source. One accidental word is fine; a cluster is not.

```
additionally, align with, boasts, bolstered, crucial, delve, emphasizing,
enduring, enhance, fostering, garner, highlight (verb), interplay,
intricate, key (adjective), landscape (abstract), meticulous, pivotal,
robust, showcase, tapestry, testament, underscore (verb), valuable,
vibrant, seamless, comprehensive, leverage, utilize, facilitate,
streamline, empower, elevate, cutting-edge, game-changer
```

**Promotional / brochure words:**

```
nestled, in the heart of, groundbreaking, renowned, diverse array,
rich heritage, natural beauty, commitment to, exemplifies, fostering,
dynamic hub, captivating, fascinating glimpse, worth visiting
```

---

## Avoid — structures

### 1. Significance padding
No undue emphasis on legacy, broader trends, or “what this means for the club going forward”.

- Bad: *“This fixture underscores Bishop Middleham’s enduring presence in the DDSFL landscape.”*
- Good: *“League game · Sat 10:30 · home”*

### 2. “Despite / challenges / future outlook” closers
No outline-style endings on empty states or help text.

- Bad: *“Despite these challenges, the squad continues to thrive…”*
- Good: *“No results yet. Admin can add scores after each game.”*

### 3. Negative parallelisms
Avoid “Not just X, but Y” / “It’s not X, it’s Y” / “No X, no Y, just Z”.

- Bad: *“It’s not just a calendar — it’s your season hub.”*
- Good: *“Fixtures, training, and availability in one place.”*

### 4. Rule of three
Avoid three adjectives or three parallel phrases for fake completeness.

- Bad: *“Fast, reliable, and intuitive availability tracking.”*
- Good: *“Mark yourself in, out, or maybe.”*

### 5. Elegant variation
Repeat a word if it’s clearer. Don’t swap “fixture” → “match-up” → “encounter” in the same screen.

### 6. Superficial `-ing` tails
Avoid trailing participles that add fake analysis.

- Bad: *“…reflecting the club’s commitment to excellence.”*
- Good: *“…added by Lewis on 12 Aug.”*

### 7. Vague attribution
No weasel wording.

- Bad: *“Observers note that availability helps team selection.”*
- Good: *“Mark availability so the gaffer knows who’s in.”*

### 8. Chatbot / assistant voice
Never write UI copy as if replying to the user in a chat.

Banned openers/closers:

```
I hope this helps, Of course!, Certainly!, You're absolutely right!,
Would you like…, Is there anything else…, Let me know if…,
Here's a…, Feel free to…, Happy to help, Great question
```

### 9. Didactic disclaimers
Avoid lecturing the user.

- Bad: *“It’s important to remember that passcodes should be kept private.”*
- Good: *“Don’t share your passcode.”*

### 10. Placeholder / template filler
No lorem-style or “[insert X here]” tone in production strings.

---

## Avoid — formatting habits

| Pattern | UI guidance |
|---------|-------------|
| Title Case In Every Heading | Sentence case: “Enter results”, not “Enter Results” |
| Bold every other word | Bold only for true emphasis (sparingly) |
| Em dashes everywhere | Prefer commas, full stops, or parentheses |
| Curly quotes `“ ”` `’` | Straight quotes `'` `"` in code strings |
| Emoji as bullets/headers | No emoji in labels (stats icons in data UI are OK if already established) |
| **Label:** description list spam | Use proper headings + body, or a single line of help text |
| Numbered “Key takeaways” blocks | Use one short paragraph or a real list without bold prefixes |

---

## Prefer — human UI copy

From the same Wikipedia page (“signs of human writing”), adapted:

1. **Simple copulas** — “Next match is away at Crook Town.”
2. **Plain verbs** — wrote, used, tried, died — not authored, utilized, attempted, perished.
3. **Specific facts** — dates, scores, names, counts.
4. **Hedging when honest** — “maybe”, “about”, “roughly” when data is uncertain.
5. **Short imperatives** — “Save”, “Retry”, “Copy invite link”.
6. **Explain errors plainly** — say what failed and what to do next; no policy essay.

---

## Length by surface

| Surface | Target |
|---------|--------|
| Button | 1–3 words |
| Toast | ≤ 12 words |
| Empty state title | ≤ 6 words |
| Empty state body | 1–2 sentences |
| Page subtitle | 1 sentence |
| Admin help hint | 1 sentence under the field |

---

## Examples (BMFC)

| Context | Avoid (AI-ish) | Prefer (human) |
|---------|----------------|----------------|
| Login error | *Invalid credentials. Please ensure your details align with your registered profile.* | *Wrong name or passcode.* |
| Empty stats | *No data yet — showcasing your journey awaits once match events are captured.* | *No stats yet. Scorers appear after results are entered.* |
| Dashboard greeting | *Good afternoon — your comprehensive season hub awaits.* | *Good afternoon, Lewis* |
| Invite | *Complete your onboarding to unlock the full suite of club features.* | *Pick a 4-digit passcode to finish setup.* |
| Sync success | *Fixtures successfully synchronized, underscoring live connectivity.* | *Fixtures updated from DDSFL.* |

---

## Review checklist

Before shipping new copy:

- [ ] Would a committee member say this out loud on WhatsApp?
- [ ] Any word from the AI vocabulary list?
- [ ] Any “not just… but…”, rule-of-three, or “despite challenges”?
- [ ] Any “serves as / features / boasts” instead of is/has?
- [ ] Sentence case on headings?
- [ ] Straight apostrophes in strings?
- [ ] UK spelling and football words (match, table, not soccer/standings)?
- [ ] Dates day-first if written out?
- [ ] Concrete next step on errors?

---

## Source

Rules distilled from [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). Wikipedia content is CC BY-SA; this adaptation is project-specific guidance, not legal advice.
