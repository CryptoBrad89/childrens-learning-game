# Portal fixes — 2026-10-19

TL;DR: Grown-up sign-in, kid management and settings now share the cream home chrome. Public administrator signup, the playing-as banner and group/code controls are gone. Child creation offers six profile icons and a picture upload. Additional administrators require an existing signed-in grown-up.

## Preview

Run `python3 -m http.server 8000` from the repository root, then open:

- [Child login](http://localhost:8000/) — small **Are you a grown-up?** link.
- [Grown-up sign-in and portal](http://localhost:8000/accounts/) — sign in with an existing administrator.
- [Grown-up settings](http://localhost:8000/grown-ups/) — requires grown-up sign-in on hosted pages.

Repository previews: [index.html](../index.html), [accounts/index.html](../accounts/index.html), [grown-ups/index.html](../grown-ups/index.html). Check light and dark device preferences: the grown-up pages stay cream. Sign in, open **Make a child's login**, choose an icon or upload a picture, create the child, then reload to see the saved avatar. **Add a grown-up administrator** appears only after grown-up sign-in. Selecting a linked child's notebook keeps the administrator signed in and opens that child's progress/settings.

## Changes and permissions

- Removed the dark grown-up color scheme and shader masthead; matched the home background, dotted texture, ink and red accent. Letters with Lucy branding and Ribbon Road defaults remain.
- Removed the shared play/account strip from admin pages, grown-up play action and grown-up personal progress view. The portal shows account administration and linked kids.
- Removed public registration UI and the public client registration method. All Edge actions, including legacy `register` requests, now validate Auth identity and the database grown-up role. Anonymous requests and children cannot create administrators or children. Creating another administrator preserves the current session and never creates a guardian relationship to that grown-up.
- Removed all group/classroom/code controls and group queries from the portal. Existing group records remain stored; no data was deleted.
- Added six generic icons and any browser-decodable picture upload. The browser saves a JPEG copy with a longest side of 256 pixels. Avatars persist in RLS-protected profiles; ordinary clients cannot write profile fields directly. Server and SQL constraints accept only the supported icons or bounded raster data URLs.
- Rebuilt the offline manifest. Child play, saved notebooks, linked-child settings and offline sync retain their existing behavior.

## Backend and rollback

Applied `20261019175141_portal_admin_avatars.sql` and deployed `accounts` Edge function version 2 to **ixjbgshhzeaosrzavssr** (`lwl-codex`) only. Every action authenticates inside the function; gateway JWT verification retains its existing setting. The new avatar column is additive. A trusted service operator can still bootstrap an initial administrator; there is no browser-accessible bootstrap path.

Rollback tip: `portal-fix-rollback-20261019`. Branch: `codex/home-flow-ribbon`; main was not changed. Restoring frontend files alone does not roll back deployed server permissions. The avatar column can safely remain if reverting the UI.

## Verification

Passed without screenshots:

- `python3 tests/run_tests.py` — 6/6 strict checks.
- `node tests/portal_flow.cjs` and `node tests/portal_flow.cjs --live` — four cases each: phone/desktop × light/dark, matching chrome, no playing-as/groups/codes, icons and persisted picture uploads, new administrator sign-in, anonymous and child denial for every creation endpoint.
- `node tests/accounts_database.cjs` — actual migrations, RLS, avatar constraints/write denial, administrator creation without child links, immutable events and retry behavior.
- `node tests/accounts_database_edge.cjs` — actual handler, restricted creation including legacy calls, avatar validation, password preservation, guardian checks and interrupted provisioning recovery.
- `node tests/accounts_sync.cjs` and `ACCOUNTS_LOGIN_REPORT=.job/portal-fix-test-logins.json node tests/accounts_sync.cjs --live` — two-profile offline play, reconnect, deduplication, settings, guardian linking and real cross-child RLS denial. Live credentials remain in the local `.job/` record; prior login reports were preserved.
- `node tests/accounts_selection.cjs` — real linked-child notebook and settings navigation.
- `node tests/home_flow.cjs` — child-first entry, Ribbon Road default, unsaved isolation and offline reload.
- `node tests/grown_ups_runtime.cjs` and `tests/grown_ups_smoke.cjs` — settings, all viewport sizes, gate, calm motion and cream under dark preference.
- `node tests/runtime_smoke.cjs` — 234 rounds across the existing layouts/themes.
- `tests/browser_smoke.cjs`, six existing shards — 18/18 browser journey cases; `tests/silk_smoke.cjs` — Ribbon Road A–Z, palettes, target sizes, offline and reduced motion.
- Strict Edge TypeScript check, JavaScript syntax checks and `git diff --check`.

Browser helpers use `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. Retained portal and live sync output is in the accompanying `portal-fix-*.log` files. The account feature guide documents the updated verification flow.

No new design dependency or external design service was used. The existing home chrome supplied the visual reference; the local design-tool index was inspected. No splash, cursor, art or audio changes. No open questions.
