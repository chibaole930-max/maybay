# Online fairness: pin game speed to 1× (remove fast-forward)

Record: Active task plan
Base revision: b7a353c

## Goal and scope

User directive (2026-10-13): fast-forward (1×/2×/4×) is unfair in online play —
a player at 4× earns ~4× the income per real minute, so leaderboard/season
competition is meaningless across speeds. Remove the choice; every airline
progresses at the same real-time rate (`TIME_SCALE = 60` game-minutes per real
second, unchanged and equal for all).

In scope (this tab):

- Pin `timeSpeed` to `1`: type narrowed to `1`, `setTimeSpeed` removed, old
  saves normalized on rehydrate, speed selector UI removed (shell), per-page
  speed displays removed/simplified (dashboard, routes→map), dead `.time-speed`
  CSS removed.
- Engine math untouched (`gameDeltaMs = elapsed × TIME_SCALE × speed` stays
  correct with speed = 1); no economy rebalancing; no API/store-protocol
  changes.

Explicit non-goals:

- Server-authoritative economy / anti-cheat validation. The economy is still
  client-authoritative (localStorage editable) — pinning speed fixes the
  *honest-client* unfairness the user reported, not cheating. True server
  validation is a joint follow-up with the login tab (they own the server).
- No changes to auth, login UI, account, sessions, Firebase, rate limits,
  netClient auth methods, or any `/api/*` route.

## Coordination (two tabs, one checkout — async via this file + commits)

I cannot message the other tab directly; the repo is the channel. Agreed split:

- **Login tab owns (do not touch):** `app/api/**`, `app/login/**`,
  `components/account-section.tsx`, `lib/firebase/**`, `lib/net/netClient.ts`,
  `lib/server/**`, `lib/useOnlineSync.ts`, `package.json` / `package-lock.json`,
  `.env*`, `kprobe.ts` (their probe at root — please move to scratchpad per L4).
- **This tab owns (this task):** `types/index.ts` (timeSpeed type only),
  `store/useGameStore.ts` (setter removal + rehydrate pin), `lib/game-engine.ts`
  (no change expected), `components/game-shell.tsx` (chip UI removal only —
  account-chip/auth area untouched), `app/dashboard/page.tsx`,
  `app/routes/page.tsx`, `components/map/AirlineMap.tsx` (prop types only),
  `app/v5.css` (`.time-speed` removal only).
- If the login tab needs anything here (e.g., submissions must include a
  fairness attestation later), they leave a note in this file under
  `## Messages for the login tab`; likewise I check this file before touching
  anything near their boundary.

## Decisions and acceptance criteria

- D1: Pin-to-1 (remove the choice) instead of full variable removal from the
  engine. Rationale: smallest diff that kills the unfairness; engine formula,
  flight ETAs and offline math stay provably correct.
- D2: `TIME_SCALE = 60` stays. Fairness = equal rate, not 1:1 wall-clock.
- D3: No migration version bump; pin in `onRehydrateStorage` (covers all old
  saves holding 2×/4× without invalidating anything).

Acceptance criteria:

- AC1: No speed selector or speed choice anywhere in the UI (shell, pages).
- AC2: Fresh and old saves (incl. a save holding 4×) both run at speed 1;
  income-per-real-minute identical across clients (argue by code path:
  single constant).
- AC3: `npx tsc --noEmit`, `npm run build`, `npm run lint` (no new errors) pass.
- AC4: Screenshots @390×844 and @1280×800 (topbar without chips, dashboard
  without speed label, routes map + flight panel intact) → user eye-review
  via Telegram.
- AC5: Login/auth flows untouched and working (login page renders; no edits to
  their files — verify by `git status` showing none of their paths).

## Approach

1. Types + store: narrow `timeSpeed?: 1`; delete setter type + impl; pin in
   `onRehydrateStorage`.
2. Shell: delete chip group + `setTimeSpeed`/`timeSpeed` destructures; simplify
   `goldenCountdown` divisor to plain game minutes.
3. Dashboard: drop `gameSpeed` const + "Tốc độ game" label; divide ETAs and
   per-minute income by plain constants.
4. Routes + map: pass literal `1`; narrow prop types to `1`.
5. CSS: delete `.time-speed` rules (base + responsive).
6. Verify: tsc, build, lint, screenshots, Telegram, commit, push.

## Tasks

- [x] **Task 1: pin speed in types + store**
  - Files: `types/index.ts`, `store/useGameStore.ts`
  - Verify: `npx tsc --noEmit` → clean.
- [x] **Task 2: remove speed UI + per-page displays**
  - Files: `components/game-shell.tsx`, `app/dashboard/page.tsx`,
    `app/routes/page.tsx`, `components/map/AirlineMap.tsx`, `app/v5.css`
  - Verify: `npx tsc --noEmit` → clean; screenshots @390/1280 → eye-review.
- [x] **Task 3: build + push + notify**
  - Verify: `npm run build` → success; `npm run lint` → no new errors;
    `git status` shows none of the login tab's paths; commit + push + Telegram.

## Verification evidence

- `npx tsc --noEmit` → clean. `npm run build` → success (isolated full-tree
  copy, 18/18 pages). `npm run lint` → warnings only (all pre-existing, none in
  touched lines); zero errors.
- AC1: `.time-speed` absent from DOM on dashboard; "Tốc độ game" label gone
  (faircheck probe: `chipsInDom: 0`, `speedLabel: false`).
- AC2: simulated old save with `timeSpeed: 4` → after fresh load + enter,
  save reads `timeSpeed: 1` (pin in `onRehydrateStorage` verified live).
- AC4: 12 captures (/dashboard /routes /settings @390/1280 × light/dark):
  correct URLs + themes, page overflow 0. Screenshots sent to Telegram.
- AC5: `git status` throughout shows none of `app/api/**`, `app/login/**`,
  `components/account-section.tsx`, `lib/firebase/**`, `lib/net/netClient.ts`,
  `lib/server/**`, `lib/useOnlineSync.ts`, `package.json` — login tab's area
  untouched. `kprobe.ts` left alone (theirs).
- Fairness argument (AC2, code path): `tickGame` computes
  `gameDeltaMs = elapsed × TIME_SCALE(60) × speed` with speed now constant 1
  (setter deleted, type narrowed, old saves pinned) → income per real minute is
  identical for every client by construction. `TIME_SCALE` itself is equal for
  all, hence kept. Server-side economy validation remains a joint follow-up
  (economy still client-authoritative).

## Messages for the login tab

(none yet — this tab will note here if it needs anything auth-side.)

## Handoff

Done + pushed (515628a). Fairness work complete on this tab's side; login
tab's area untouched (verified by status + lint + build).

Coordination note (for the user as bridge — tabs cannot message each other
directly): nothing blocking needed from the login tab. Optional joint
follow-up whenever both agree: server-side sanity checks on submitted saves
(e.g., reject `timeSpeed !== 1`, bound cash deltas per wall-clock) — that lives
in their server files, so it needs their hands, not mine.
