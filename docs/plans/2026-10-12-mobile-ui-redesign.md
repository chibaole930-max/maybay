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

Acceptance criteria:

- AC1: No horizontal overflow on any screen at 375, 390 and 430 CSS px
  (`document.documentElement.scrollWidth <= innerWidth`).
- AC2: Bottom nav never covers content, a toast or a modal; safe-area inset
  respected on notched devices.
- AC3: Interactive targets are ≥44×44 CSS px.
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

- [ ] **Task 1: Tokens, mono font, `v5.css` base components**
  - Files: `app/v5.css` (new), `app/layout.tsx`
  - Build: token set (bg/surface/text/line/navy/blue/accent/success/danger, radius
    scale 8/13/18/pill, elevation `--sh-1`/`--sh-2`, type scale, spacing, named
    ease, `--font-mono`), light + dark values; base skins for `card` (accent top
    edge, registration tick), `btn` (+`secondary`/`ghost`/`danger`/`compact`),
    `badge` (+`warn`/`danger`), `progress` (subtle sheen), `input`/`select`/`label`,
    table, `muted`, `eyebrow`, `title`/`sub`, `section-title`, `page-heading`,
    `term-help`. Add the JetBrains Mono webfont in `layout.tsx`.
  - Verify: `npx tsc --noEmit` → clean; `npm run build` → success; screenshots of
    `/settings` (component-heavy) at 390×844 and 1280×800, light + dark →
    user eye-review; AC1, AC3, AC5, AC6.

- [ ] **Task 2: Shell — header, bottom nav, sidebar, topbar, toast, modals**
  - Files: `components/game-shell.tsx`, `app/v5.css`
  - Depends on: Task 1
  - Build: mobile header and bottom nav in the new language; desktop sidebar/topbar
    restyled to match; toast and story modals re-skinned (level-up, offline,
    milestone, IPO, situation, teaser); locked nav states.
  - Verify: `npm run build` → success; screenshots of `/dashboard` shell at 390×844
    and 1280×800 plus each modal state → user eye-review; AC2, AC5, AC6.

- [ ] **Task 3: Dashboard**
  - Files: `app/dashboard/page.tsx`, `app/v5.css`, legacy blocks in `v2.css`/`v4.css`
  - Depends on: Task 2
  - Build: re-compose for mobile (dominant value read → operating tiles → chart →
    mission), retire `cockpit-grid`, `journey-card`, `live-*` legacy rules.
  - Verify: `npm run build`; screenshots 390×844 / 1280×800, light + dark → user
    eye-review; AC1, AC4.

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

Not run yet.

## Handoff

Active. Phase 0 (direction) closed: the user picked `E · Gốc có dấu ấn` from
`/tmp/opencode/mobile-gu/index-de.png`. Arcade lane rejected as too far from the
original vibe; light+dark themes must both be kept.

Checkout: `/home/chibao/vietnam-airline-tycoon`, current default branch, worktree
clean at base revision f22939c. No PR requested. Next action: Task 1.

Blockers: none.
