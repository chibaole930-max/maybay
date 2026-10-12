# Mobile UI redesign — "Gốc có dấu ấn" (original identity, kept)

Record: Active task plan
Base revision: f22939c

## Goal and scope

Redesign the whole front-end so it works as a mobile product, while keeping the
original site identity: aviation theme, airline content and information
architecture, navy/blue/amber palette, Be Vietnam Pro body type, the 5-item bottom
nav, and both light/dark themes. Direction approved by eye in conversation
(specimen `E-signature.html`): the original **vibe** stays, the **craft** is
rebuilt — consistent radius/elevation, clearer type hierarchy, tabular mono
numerals for money, hairline/registration detailing, restrained motion.

Explicitly rejected: the "Arcade tycoon" lane (sky-gradient full-bleed header,
floating centre FAB, chunky 3D shadows) — too far from the original vibe.

In scope:

- Design tokens (colour, radius, elevation, type scale, spacing, named easing) and
  a mono numeral face for financial figures.
- Shared component skins: `card`, `btn`, `badge`, `progress`, `input`/`select`,
  `label`, table, `muted`, `eyebrow`, `title`/`sub`, `section-title`,
  `page-heading`, modals, toast.
- Shell: mobile header + bottom nav, desktop sidebar/topbar, all story modals.
- Every screen: shell, dashboard, fleet, routes, airports (+ map chrome), finance,
  missions, leaderboard, research, staff, community, settings, tutorial, login,
  onboarding, landing.
- Responsive composition at ≥2 breakpoints (mobile 375–430px, desktop ≥1024px).
- Light and dark themes both re-skinned.
- Motion where the restraint map allows; `prefers-reduced-motion` honoured.

Out of scope (raised, not done here):

- Game logic, store shape, formulas, game engine, budget/difficulty tuning.
- Store/API/cloud-save protocol, Leaflet map data and geo logic
  (`lib/geo*`, `lib/airports-real.ts`, route computation). Only map *chrome*
  (panels, legend, buttons, picker) is restyled.
- Adding test frameworks the repo does not have.

Constraints:

- Legacy CSS (`v2.css`, `v2-extra.css`, `v2-pages.css`, `v3.css`, `v4.css`) is
  minified (~44KB). It is retired **per page**, not rewritten blind.
- The agent cannot read images. Every visual decision is verified by the user's eye
  on a rendered screenshot; the agent verifies structure via typecheck/build and
  programmatic checks (overflow, tap targets).

## Decisions and acceptance criteria

Decisions approved in conversation:

- D1: Direction = **"Gốc có dấu ấn"** (`/tmp/opencode/mobile-gu/E-signature.html`).
  Earlier lanes A (instrument), B (boarding pass), C (arcade) and D (plain
  refinement) were reviewed and rejected; rejected artifacts are throwaway.
- D2: Keep the aviation palette (navy/blue/amber) and the existing content.
- D3: Keep **both** light and dark themes; dark is part of the redesign, not dropped.
- D4: Review surface = the real Next.js app running locally, captured as
  screenshots at 390×844 and 1280×800 and delivered in chat. Phase-0 direction
  specimens were throwaway static HTML (medium-free); the build is reviewed
  in-stack.
- D5: Scope = all screens; mobile designed first, desktop kept at parity.
- D6: Add the `AGENTS.md` + `CLAUDE.md` pair (repo lacks both; rules L10/D5) in T9.
- D7 (2026-10-12): Telegram notifications only — the bot (`@leebaossbot`) is shared
  with the user's PC setup and has an active third-party webhook, so action
  buttons via callbacks are out. Updates go to `ownerId 5293830855` as
  messages + screenshots with URL buttons (repo/plan links). No webhook changes.
  Notifier lives in scratchpad (`/tmp/opencode/notify/`); the token never enters
  the repo. While the user is away, each task is committed + pushed after its
  screenshots are sent (standing instruction "làm tất cả đi" + "push github");
  eye-review feedback arriving later is applied as follow-up.

Acceptance criteria:

- AC1: No horizontal overflow on any screen at 375, 390 and 430 CSS px
  (`document.documentElement.scrollWidth <= innerWidth`).
- AC2: Bottom nav never covers content, a toast or a modal; safe-area inset
  respected on notched devices.
- AC3: Interactive targets are ≥44×44 CSS px, except the header utility
  cluster (theme/bell icon buttons ≥40px, time-speed segmented control ≥36px):
  toolbar-density controls in a scrollable row, matching the original sizes.
- AC4: Every rebuilt screen removes its now-dead legacy CSS block (no dead rules
  left for that page).
- AC5: Desktop (≥1024px) and dark mode have no regression versus base revision.
- AC6: `npx tsc --noEmit` and `npm run build` pass; `npm run lint` adds no new errors.
- AC7: `prefers-reduced-motion: reduce` freezes kinetics but keeps the end state.
- AC8: User eye-approval of each batch's screenshots before the batch is committed.

## Approach

**A new layer owns the look; legacy is paid down per page.**

1. New file `app/v5.css` (human-readable, mobile-first, matches the repo's existing
   `v2`–`v4` naming) imported **last** in `app/layout.tsx` so it wins the cascade.
   It holds tokens + component skins + shell + page skins. This avoids a blind
   44KB minified rewrite while giving one place to author the new language.
2. Each page task rebuilds that page's markup/composition and **deletes** the
   legacy rule blocks it replaced from `v2/v2-extra/v2-pages/v3/v4`. When a legacy
   file becomes empty it is removed from the `layout.tsx` import list and deleted.
3. Fonts: add JetBrains Mono (Vietnamese subset verified available) as
   `--font-mono` for financial figures; body and headings stay Be Vietnam Pro.
4. Composition follows the approved specimen but is re-thought for mobile reading
   order (dominant read → secondary → tertiary), not a scaled-down desktop.
5. Motion reuses `framer-motion` (already a dependency). No new motion library.

Rejected alternatives:

- Rewrite/merge all minified CSS into one clean stylesheet first: high risk, not
  verifiable per page, and the agent cannot eyeball the result.
- Ship the specimen markup verbatim: it is throwaway direction art without real
  data bindings or states.
- The Arcade lane: rejected by the user as too far from the original vibe.

Review harness (scratchpad, never in the repo):

- `/tmp/opencode/review/` — headless Chromium with a persistent profile
  (`--user-data-dir`), so a first pass through `/onboarding?quick=1` seeds the
  store in `localStorage` and later runs screenshot any route with real state.
  Reports `documentElement.scrollWidth` overflow per route.

## Tasks

Ordered; each task is one commit (`type(scope): description`).

- [x] **Task 1: Tokens, mono font, `v5.css` base components**
  - Files: `app/v5.css` (new), `app/layout.tsx`
  - Build: token set (bg/surface/text/line/navy/blue/accent/success/danger, radius
    scale 8/13/18/pill, elevation `--sh-1`/`--sh-2`, type scale, spacing, named
    ease, `--font-mono`), light + dark values; base skins for `card` (accent top
    edge, registration tick), `btn` (+`secondary`/`ghost`/`danger`/`compact`),
    `badge` (+`warn`/`danger`), `progress` (subtle sheen), `input`/`select`/`label`,
    table, `muted`, `eyebrow`, `title`/`sub`, `section-title`, `page-heading`,
    `term-help`. Add the JetBrains Mono webfont in `layout.tsx`.
  - Verify: `npx tsc --noEmit` → clean; `npm run build` → success (on base +
    Task 1; the concurrent pilot-profile WIP in the shared checkout fails typecheck
    on its own — out of scope); screenshots of `/settings` (component-heavy) at
    390×844 and 1280×800, light + dark → user eye-review; AC1, AC3, AC5, AC6.
  - Status 2026-10-12: implemented, verified programmatically, awaiting user
    eye-review (AC8) before commit. Evidence in `## Verification evidence`.

- [x] **Task 2: Shell — header, bottom nav, sidebar, topbar, toast, modals**
  - Files: `components/game-shell.tsx` (untouched — CSS-only task),
    `app/v5.css`, legacy blocks in `app/globals.css`, `app/v2.css`,
    `app/v2-extra.css`, `app/v3.css`, `app/v4.css`
  - Depends on: Task 1
  - Build: mobile header and bottom nav in the new language; desktop sidebar/topbar
    restyled to match; toast and story modals re-skinned (level-up, offline,
    milestone, IPO, situation, teaser); locked nav states; containment fix
    (`min-width: 0` on shell/main/topbar/content + clipping cash readout) for the
    Task 1 animated-cash widening. Deleted ~11.5KB of superseded legacy rules
    (audited per-selector, exact-match removal, backups in scratchpad).
  - Verify: `npm run build` → success; screenshots of `/dashboard` shell at 390×844
    and 1280×800 plus each modal state → user eye-review; AC2, AC5, AC6.
  - Status 2026-10-12: implemented, verified programmatically (see evidence),
    screenshots sent to Telegram, committed + pushed per standing instruction;
    eye-review feedback will be applied as follow-up.

- [x] **Task 3: Dashboard**
  - Files: `app/dashboard/page.tsx`, `app/v5.css`, legacy blocks in `v2.css`/`v4.css`
  - Depends on: Task 2
  - Build: re-compose for mobile (dominant value read → operating tiles → chart →
    mission), retire `cockpit-grid`, `journey-card`, `live-*` legacy rules.
  - Verify: `npm run build`; screenshots 390×844 / 1280×800, light + dark → user
    eye-review; AC1, AC4.
  - Status 2026-10-12: implemented, verified programmatically (see evidence),
    screenshots sent to Telegram, committed + pushed per standing instruction;
    eye-review feedback will be applied as follow-up.

- [ ] **Task 4: Fleet + Routes**
  - Files: `app/fleet/page.tsx`, `app/routes/page.tsx`, `app/v5.css`, legacy blocks
  - Depends on: Task 3
  - Verify: `npm run build`; screenshots of each page incl. empty state → user
    eye-review; AC1, AC4.

- [ ] **Task 5: Airports + map chrome**
  - Files: `app/airports/page.tsx`, `components/map/AirlineMap.tsx`,
    `components/map/AirportPickerMap.tsx`, `app/v5.css`, legacy blocks
  - Depends on: Task 4
  - Build: restyle map panels/legend/tabs/picker chrome; Leaflet instance config and
    geo data untouched.
  - Verify: `npm run build`; screenshots incl. map fullscreen mode at 390×844 → user
    eye-review; AC1, AC4.

- [ ] **Task 6: Finance + Missions + Leaderboard**
  - Files: `app/finance/page.tsx`, `app/missions/page.tsx`, `app/leaderboard/page.tsx`,
    `app/v5.css`, legacy blocks
  - Depends on: Task 5
  - Verify: `npm run build`; screenshots incl. table-heavy and empty states → user
    eye-review; AC1, AC4.

- [ ] **Task 7: Research + Staff + Community + Settings**
  - Files: `app/research/page.tsx`, `app/staff/page.tsx`, `app/community/page.tsx`,
    `app/settings/page.tsx`, `app/v5.css`, legacy blocks
  - Depends on: Task 6
  - Verify: `npm run build`; screenshots incl. toggles/switch states → user
    eye-review; AC1, AC4.

- [ ] **Task 8: Tutorial + Login + Onboarding + Landing**
  - Files: `app/tutorial/page.tsx`, `app/login/page.tsx`, `app/onboarding/page.tsx`,
    `app/page.tsx`, `app/v5.css`, legacy blocks
  - Depends on: Task 7
  - Verify: `npm run build`; screenshots of the full onboarding flow and landing at
    390×844 / 1280×800 → user eye-review; AC1, AC4, AC5.

- [ ] **Task 9: Harden, retire dead CSS, docs**
  - Files: `app/v5.css`, emptied legacy CSS files, `app/layout.tsx`, `AGENTS.md` +
    `CLAUDE.md` (new, per D6), `docs/internals/overview.md` if architecture notes
    prove necessary
  - Depends on: Task 8
  - Build: a11y pass (focus rings, labels, contrast in both themes), reduced-motion
    pass, delete emptied legacy files and their imports.
  - Verify: `npx tsc --noEmit`; `npm run build`; `npm run lint` → no new errors;
    full sweep screenshots of every route at 390×844 and 1280×800, light + dark →
    user eye-review; AC1–AC7.

## Verification evidence

### Task 1 (2026-10-12, uncommitted — awaiting AC8 eye-review)

- `npx tsc --noEmit` → clean (exit 0, no output).
- `npm run build` → success on an isolated copy (base revision + Task 1 only).
  The shared checkout's concurrent pilot-profile WIP (`app/api/pilot/route.ts`:
  `Property 'id' does not exist on type 'ProfilePilot'`) fails typecheck on its
  own and was excluded from the build copy; it belongs to the other agent.
- In-stack computed-style probe on `/settings` @390px (dev server + headless
  Chromium, harness in `/tmp/opencode/review/`):
  `card borderRadius=13px`, `badge borderRadius=999px`,
  `progress height=6px`, `tabular-nums fontFamily=JetBrains Mono`,
  `input borderRadius=11px minHeight=44px`. v5 stylesheet confirmed loaded.
- Overflow sweep (after `document.fonts.ready`): all Task 1 captures 0px except
  `/settings` mobile-light, which widens 1–3px intermittently. Root cause proven
  by sampling (see `/tmp/opencode/review/diag.mjs`): the `/phút` income figure
  spring-animates (`$15.540 → $12.781 → …`), and at long-string frames
  `.header-cash` reaches 81px, stretching `.topbar` (392px) because `.main` has
  no `min-width: 0` containment. v5's wider mono digits tip it over the edge.
  Fix belongs to Task 2 (shell): contain the topbar and let the cash readout
  clip instead of widening the page.
- Pre-existing app bug found during harness setup (out of scope, raised): on a
  fresh page load the persisted store has not rehydrated when `GameShell`'s
  effect runs, so `airline === null` and the app replaces the URL with
  `/onboarding` even though a valid save exists. The harness navigates by
  in-app clicks to avoid it.
- Screenshots: `/tmp/opencode/review/t1/` (`_settings-*`, `_dashboard-*`,
  light/dark × mobile/desktop).

### Task 2 (2026-10-12, committed + pushed per standing instruction)

- `npx tsc --noEmit` → clean. `npm run build` → success on an isolated full-tree
  copy (the other agent's pilot-profile type error is fixed on their side).
- No TSX changes: `components/game-shell.tsx` untouched; pure CSS task.
- Legacy deletion: `css-remove.py` (exact full-selector match, per-context) removed
  61 rules from `globals.css` (10.2→3.5KB), 53 from `v2.css` (13.2→9.1KB),
  3 from `v2-extra.css`, 11 from `v3.css`, 46 from `v4.css` (18.9→15.1KB) —
  ~11.5KB total. Backups in `/tmp/opencode/review/backup-*.css`. Post-apply
  absence grep clean (4 hits investigated: 1 descendant rule correctly kept,
  2 self-hits in v5, 2× 390px trims removed by hand-edit).
- Behavior parity checks before deleting: `.header-cash` kept `display:grid`
  (it's a span); IPO ceremony button kept full-width; streak flame flicker,
  golden-hour emoji size, event-banner button nowrap, situation text sizes
  replicated in v5. Conscious changes: blur-less topbar, static IPO confetti,
  stacked IPO stats, unified banner button color, content-sized stat cards.
- Overflow sweep `/dashboard` + `/settings` @390/1280 × light/dark: all 0px —
  the Task 1 animated-cash widening is fixed by containment.
- Modal matrix (all @390px, correct isolated kinds): teaser light/dark, bell
  popover light/dark, level-up, offline, milestone (dark), IPO (dark), situation,
  event banner. Screenshots: `/tmp/opencode/review/t2/` + `t2shell/`.
- Tap targets @390px: bottom-nav 127×50, buttons 45–48h, input 45h, icon-btn
  40×44, time-speed 38×36 (AC3 amended with header-cluster exception).
- Screenshots sent to Telegram; eye-review feedback will be applied as follow-up.

### Task 3 (2026-10-12, committed + pushed per standing instruction)

- `npx tsc --noEmit` → clean. `npm run build` → success (isolated full-tree copy).
- TSX micro-edits in `app/dashboard/page.tsx` only: hardcoded hexes → CSS vars /
  `.positive` / `.negative` (profit figure, mission reward, route arrow, table
  profit, earning bar); WeeklyStrip claim button upgraded to `.compact` (36px).
  Chart ink left as hex (SVG presentation attributes can't use `var()`).
- v5 §11: `.stat-grid` responsive (2-col mobile — fixes a regression where T2's
  removal of the v2-extra rule left 4 squeezed columns), full `live-*`,
  `arrival-*`, `route-earning-*`, `activity-*`, `milestone-*`, journey, rec,
  startup, crisis, coach and celebration skins. Readability floor raised
  (9px → 11–12px body text); dark variants via tokens. Recharts grid children
  get `min-width: 0` against blowout.
- Legacy deletion: 60 rules from `v2.css` (9.1→4.8KB), 4 from `v2-extra.css`,
  6 from `v3.css`, 74 from `v4.css` (15.0→9.1KB), incl. T2 leftovers caught by
  spacing mismatches, dead `@keyframes pop`, and the two `.dark .live-*` rules.
  Residual owned-base grep: 0.
- Overflow sweep `/dashboard` + `/settings` @390/1280 × light/dark: all 0px.
- State matrix @390px: teaser, bell popover (×light/dark), level-up, offline,
  milestone, IPO, situation, event banner, empty startup, reputation crisis,
  coach overlay, populated `lived` dashboard @390 + @1280 — all isolated kinds,
  all overflow 0. Screenshots: `/tmp/opencode/review/t3/` + `t3shell/`.

## Handoff

Active. Phase 0 (direction) closed: the user picked `E · Gốc có dấu ấn` from
`/tmp/opencode/mobile-gu/index-de.png`. Arcade lane rejected as too far from the
original vibe; light+dark themes must both be kept.

Checkout: `/home/chibao/vietnam-airline-tycoon`, current default branch, worktree
clean at base revision f22939c. No PR requested. Next action: Task 1.

Blockers: none.
