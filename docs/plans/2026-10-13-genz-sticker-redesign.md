# Gen Z redesign — "A · Sticker Pop" (single light theme)

Record: Active task plan
Base revision: e435d07

## Goal and scope

User-picked direction (eye-review 2026-10-13, specimens in
`/tmp/opencode/genz/`): **A · Sticker Pop** — cream paper background, thick ink
borders + hard offset shadows, sticker badges, Baloo 2 display type + Be
Vietnam Pro body, violet/lime/pink accents. Friendly for Gen Z but NOT
confusing: clear hierarchy, readable sizes, one dominant action per screen.

Constraints locked in conversation:

- Full UI: all game screens + entry flows.
- Free palette (no longer bound to navy/blue/amber); **single theme** — dark
  mode is dropped.
- Review surface: screenshots in chat + Telegram photos; the user judges.

In scope:

- New layer `app/genz.css` (loaded last), Baloo 2 font, tokens + base
  components, shell, every page, entry flows.
- Remove dark-mode CSS (no `body.dark` rules in the new layer), remove theme
  toggle UI (topbar button, settings row). Store `theme` field stays untouched
  (harmless; avoids store-shape churn near the login tab's sync code).
- Retire `app/v5.css` + drop its import when the new layer fully covers it.

Out of scope (raised, not done here):

- Game logic, store shape (except nothing), economy, auth, Firebase, sessions,
  API routes, geo/map data. Styles only.
- Server-side anti-cheat (recorded earlier as joint follow-up).

## Coordination (login tab owns auth-gated entry since e435d07)

Since e435d07 the game requires login: GameShell waits for `hydrate` +
`online.ready`, then no-account → `/login`; `/onboarding?quick=1` no longer
seeds. This tab does NOT touch:

- `app/api/**`, `app/login/**`, `app/onboarding/**`, `app/page.tsx`,
  `components/account-section.tsx`, `lib/firebase/**`,
  `lib/net/netClient.ts`, `lib/server/**`, `lib/useOnlineSync.ts`,
  `package.json`, `kprobe.ts`.

Review harness (scratchpad) authenticates WITHOUT touching product code: CDP
`Fetch.enable` intercepts `GET /api/auth` (the `me()` call) and returns a fake
review account; the airline is then created through the real onboarding UI.
Login/landing screenshots use the genuine logged-out views.

Messages for the login tab: none blocking. Heads-up: this redesign replaces
`app/v5.css` wholesale (incl. the 24 `.quick-btn` lines you already deleted —
no conflict) and removes the topbar theme button + settings theme row. If you
need either back, say so in this file.

## Decisions and acceptance criteria

- D1: Direction = A · Sticker Pop (`/tmp/opencode/genz/A-sticker.html`).
  Lanes B (soft minimal) and C (dark HUD) rejected by eye-review.
- D2: Single light theme. Dark rules are not carried into the new layer.
- D3: New file `app/genz.css` instead of rewriting `v5.css` in place (same
  migration pattern as v2→v5: build beside, verify per page, delete at the end).
- D4: Clarity guardrail for every screen: one dominant read, labels stay short,
  no decorative element may cover tappable content or money.
- D5 (2026-10-13): user waived per-batch eye-approval ("làm tất cả đi không cần
  xác nhận"). Batches are committed + pushed after programmatic verification;
  screenshots still go to Telegram for post-review, feedback applied as
  follow-ups. AC6 becomes post-review instead of a gate.

Acceptance criteria:

- AC1: No horizontal overflow at 320/390/430 CSS px on any screen.
- AC2: All money fully readable (reuse `money.mjs` audit: zero clipped).
- AC3: Tap targets ≥44px (header utility cluster exception stands).
- AC4: `npx tsc --noEmit`, `npm run build` pass; `npm run lint` adds no errors.
- AC5: No edits to the login tab's paths (verify by `git status`).
- AC6: User eye-approval per batch over Telegram before commit.
- AC7: `prefers-reduced-motion` honored; contrast AA for body text.

## Approach

Phase 0 (done): 3 divergent specimens → user picked A.
Phase 1 (this task): tokens + font + base components in `genz.css`.
Then per-surface batches (shell → pages → entry), each verified in-stack with
the auth-mocked harness before commit. Final batch deletes `v5.css`.

## Tasks

- [x] **Task 1: tokens, font, base components, single-theme cut**
  - Files: `app/genz.css` (new), `app/layout.tsx` (font + import), plus theme
    toggle removals in `components/game-shell.tsx`, `app/settings/page.tsx`
  - Build: sticker tokens (paper/ink/violet/lime/pink, 2px borders, hard
    shadows, radius scale, Baloo 2 display), skins for card/btn/badge/progress/
    input/table/type; delete theme toggle UI.
  - Verify: tsc; screenshots of a component-heavy page → eye-review; AC4.
  - Done 2026-10-13 in 06fb010. Eye-approved by user over Telegram. Contrast
    computed AA (muted 4.78, violet-white 5.70, pink uses ink text 5.83).

- [x] **Task 2: shell (header, nav, modals, toast)**
  - Files: `components/game-shell.tsx` (markup only where needed),
    `app/genz.css`
  - Verify: screenshots incl. modal states → eye-review; AC1, AC6.
  - Done 2026-10-13 in eaf7602 (CSS-only; no tsx change needed).
    Eye-approved by user over Telegram. Verified: teaser/popover/level-up/
    offline kinds isolated, overflow 0 @390px.

- [x] **Task 3: dashboard**
  - Done in commit below. Pure CSS (no tsx change). Verified: populated
    airline (2 routes + flight), overflow 0 @390/1280, screenshots sent.
- [x] **Task 4: fleet + routes**
  - Done in bd1f0d2. Pure CSS (all class hooks already present). Verified:
    13 captures (empty/catalog/hangar + 4 fleet modals + routes list/create/edit
    + dark pages), overflow 0, sent to Telegram (post-review under D5).
- [x] **Task 5: airports + map chrome** (no logic/geo changes)
  - Done in d5282f0. Pure CSS (no tsx change). Verified: 10 captures, overflow 0.
- [ ] **Task 6: finance + missions + leaderboard** (leaderboard logic untouched)
- [ ] **Task 7: research + staff + community + settings** (community logic untouched)
- [ ] **Task 8: entry flows** (landing/onboarding/tutorial/login styles only —
    login tab owns their logic; extra care, announce in Messages first)
- [ ] **Task 9: harden + retire v5.css + docs**
  - Contrast/class-coverage/reduced-motion pass, full sweep, delete `v5.css` +
    drop import, update `AGENTS.md` (R2 now points at genz.css).

## Verification evidence

Not run yet.

## Messages for the login tab

- 2026-10-13 (this tab): starting Gen Z restyle per user order. Only shared
  file I touch is `components/game-shell.tsx` (theme-button removal + sticker
  skins; your redirect/auth logic stays byte-identical) and styling of login/
  onboarding/landing markup in Task 8 (no logic). Shout here if anything I do
  breaks your flows.

## Handoff

Active. Next action: Task 1.
