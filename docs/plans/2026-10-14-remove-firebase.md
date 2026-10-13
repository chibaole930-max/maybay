# Remove Firebase — restore self-hosted password auth

Record: Active task plan
Base revision: 74bfca2 (plus login tab's newer auth commits — see files below)

## Goal and scope

User directive (2026-10-14, twice confirmed): remove Firebase entirely and
replace it with self-hosted password auth (scrypt + httpOnly cookie), no
vendor. This reverses the login tab's 1addfa6/0da379d direction by explicit
user order — not a silent takeover; see Messages.

In scope (this tab):

- Restore `lib/server/password.ts` from history, minus the display-name
  helpers that now live in `lib/server/accountNames.ts` (avoid duplicate
  exports — reuse theirs).
- `lib/server/onlineStore.ts`: replace `syncFirebaseIdentity` + email-verify
  machinery with `registerAccount` / `loginWithPassword` / `changePassword`
  (adapted to the current DB shape; `salt`/`hash` fields still exist).
  Keep everything else (sessions, epoch revocation, credit clamp, leaderboard,
  market, alliance, chat) byte-identical in behavior.
- `app/api/auth/route.ts`: restore register/login/logout/change-password/me
  actions (adapted old route; keep current hardening: rate guards, storage
  error mapping, revoke-sessions flow untouched).
- `lib/server/rateLimit.ts`: re-add `login` (20/300s) + `register` (20/3600s)
  rules with their old values — 2 lines, flagged to login tab.
- `lib/net/netClient.ts`: drop `firebase/*` imports + Firebase methods; add
  `login` / `register` / `changePassword` (adapted old signatures).
- `lib/useOnlineSync.ts`: point its login/register wrappers at the new
  netClient methods.
- `app/login/page.tsx`: username/password tabs (adapt current page; drop
  Firebase + email-verification waiting UI; no email required anymore).
- `components/account-section.tsx`: adapt only if it reads Firebase fields.
- Delete `lib/firebase/client.ts`, `lib/server/firebaseAuth.ts`.
- `package.json` / `package-lock.json`: drop `firebase` + `jose` (verify zero
  other importers first). Keep `vercel` (theirs).
- `.env.local.example`: drop Firebase vars + `SKIP_EMAIL_VERIFICATION`.

Explicit non-goals:

- `kprobe.ts`, `package.json`'s `vercel` entry, and any other login-tab WIP:
  untouched.
- Email verification: dropped with Firebase (no SMTP available; no email is
  required to register anymore — username + password + display name only).
- Firebase-era pilots (uid, no salt/hash): keep rows; they cannot log in with
  a password, and their usernames stay reserved (registration rejects taken
  names across ALL pilots — anti-impersonation). Login errors stay generic.
- No UI redesign in this task (GenZ skin stays as-is on the rewritten login
  form — same classes).

## Decisions and acceptance criteria

- D1: Restore-then-adapt (not revert): history code is the reference, but each
  file is edited surgically so post-Firebase fixes (rateLimit renames,
  accountNames, revoke flow, credit clamp) survive.
- D2: Security bar that must hold: scrypt async-only, timing-safe compare,
  per-IP login/register rate limits, generic login errors (no enumeration),
  atomic username reservation with rollback, epoch revocation on password
  change, httpOnly session cookies, no password in logs/responses.
- D3: Verification is real HTTP E2E against the dev server (register →
  duplicate → login → wrong-pass → me → change-password → old-session-dead →
  logout → 429 trip), not code review.

Acceptance criteria:

- AC1: `grep -ri firebase | jose` (excl. node_modules, plans, SESSIONKEY docs)
  finds zero code references; `firebase` + `jose` gone from package.json.
- AC2: E2E matrix above all green; old Firebase-era pilot cannot log in and
  its username cannot be re-registered by someone else.
- AC3: `npx tsc --noEmit`, `npm run build` pass; `npm run lint` adds no errors.
- AC4: GameShell gate + dashboard screenshots still fine (auth surface
  re-verified in-stack); Telegram notify; commit + push.
- AC5: No edits outside the file list above (verify by `git status`).

## Approach

1. Restore + adapt server pieces (password.ts, onlineStore fns, rateLimit
   rules, auth route).
2. Adapt client pieces (netClient, useOnlineSync, login page, account-section
   if needed); delete Firebase files; prune package.json + env example.
3. Security self-review against D2, then E2E.
4. Commit + push + notify. Note for login tab in Messages.

## Tasks

- [x] **Task 1: server auth (password.ts, onlineStore, rateLimit, route)**
  - Files: `lib/server/password.ts` (new), `lib/server/onlineStore.ts`,
    `lib/server/rateLimit.ts`, `app/api/auth/route.ts`
  - Verify: `npx tsc --noEmit` → clean.
  - Note: self-review caught an impersonation hole during implementation
    (Firebase-era rows lack NX keys) — fixed with DB pre-check + in-mutate
    clash check in `registerAccount`.
- [x] **Task 2: client auth (netClient, hook, login UI, deletions, deps)**
  - Files: `lib/net/netClient.ts`, `lib/useOnlineSync.ts`,
    `app/login/page.tsx`, `components/account-section.tsx` (if needed),
    delete `lib/firebase/client.ts` + `lib/server/firebaseAuth.ts`,
    `package.json`/`package-lock.json`, `.env.local.example`
  - Verify: `npx tsc --noEmit` → clean; AC1 grep → zero.
- [x] **Task 3: E2E + push + notify**
  - Verify: E2E matrix green; build + lint; screenshots; commit + push.

## Verification evidence

- `npx tsc --noEmit` → clean. `npm run build` → success (isolated full-tree
  copy, 18/18). `npm run lint` → zero errors (warnings pre-existing).
- AC1: zero Firebase/jose code references (only compat comments + the kept
  `firebaseUid?` data field); `firebase` + `jose` dropped from `package.json`,
  lock pruned (-967 lines; remaining jose hits are transitive deps of others).
- AC2 E2E (real HTTP vs dev, `e2e-auth.mjs`): 17/17 green — register 201,
  duplicate + case-variant rejected, login ok/wrong/generic, no-enumeration
  (identical messages), me()±cookie, change-password wrong/ok, old-cookie
  revoked, new-password login, old-password dead, logout, 429 trip. No
  salt/hash/password/uid in any auth JSON.
- Browser journey (`e2e-ui.mjs`): register tab → /onboarding → create airline
  → /dashboard IN-GAME, all real UI.
- AC4: GameShell gate + dashboard screenshots re-verified in-stack after the
  change (shell/login/dashboard renders; harness `gun`/`t8` unaffected —
  they mock `me()` which is unchanged).

## Messages for the login tab

- 2026-10-14 (this tab, USER-ORDERED): removing Firebase per user directive
  (confirmed twice). Your files touched: `app/api/auth/route.ts`,
  `app/login/page.tsx`, `components/account-section.tsx` (only if it reads
  Firebase fields), `lib/net/netClient.ts`, `lib/server/onlineStore.ts`,
  `lib/server/rateLimit.ts` (+2 rule lines), `lib/useOnlineSync.ts`,
  `package.json` (drop firebase/jose only), `.env.local.example`, deleted
  `lib/firebase/client.ts` + `lib/server/firebaseAuth.ts`. Everything else
  of yours (sessions, epoch, credit clamp, market/alliance/chat, kprobe,
  vercel dep) intentionally preserved — please review the diff on pull.
  Firebase-era pilot rows are kept but passwordless (see non-goals).

## Handoff

Done + pushed (743134d, 04f6f06). 17/17 E2E green, build/lint clean, browser
journey verified, Telegram notified. Open threads: (1) login tab review on
pull (their area heavily touched, though logic preserved); (2) Firebase-era
pilots can never set a password — acceptable per user, documented; (3) deploy
will include this automatically via Vercel on push.
