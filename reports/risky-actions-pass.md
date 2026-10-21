# Risky actions verification

Implemented on `codex/home-flow-ribbon`. The forward migration `20261021045745_risky_actions.sql` and `accounts` Edge version 9 are deployed only to `ixjbgshhzeaosrzavssr`. On resumption, both deployed source texts matched the working tree exactly. Implementation commit `6d044fb` was pushed to the required branch, and the remote branch matched that commit. Published GitHub source for the client, portal, settings editor, and offline manifest returned HTTP 200 and matched the committed files. [Deployment evidence](risky-actions/deployment.json).

## What changed

`accounts/portal.js`, `accounts/index.html`, and `accounts/portal.css` provide password-only confirmation with affected names and usernames. Typed-count confirmations and the unlink browser popup are gone. Harmless edits do not prompt. Master account mutation controls are hidden.

`accounts/client.js` pages complete rosters and settings, starts bulk jobs, and resumes them after interrupted requests. Session storage contains only action inputs, request IDs, and job IDs, scoped to actor/session. It never contains the submitted password. `grown-ups/editor.js` resolves large settings selections through a short, actor-scoped session-storage reference, avoiding URL-size truncation. Progress reads use bounded concurrency. `sw-assets.js` refreshes the offline asset version.

`supabase/functions/accounts/index.ts` preserves bearer and server-session checks, verifies the signed-in actor's current password, covers legacy action aliases, and processes server-owned jobs. `supabase/README.md` documents the deployed contracts and verification commands.

The migration adds `verify_risky_password`, `set_account_password`, `edit_confirmed_profile`, `start_bulk_action`, `claim_bulk_action`, `process_bulk_action`, and `finish_bulk_action`, plus the private job table. It replaces the active settings and transfer functions without their account-count caps. SQL mutations and batch outcomes commit together, so retrying a completed reset cannot erase subsequently earned progress. Request IDs make a lost initial response resumable too. Profile edits compare the previously observed username under a row lock, closing a concurrent-rename bypass.

Direct Auth password/email updates are blocked by an invoker trigger; supported portal password changes use the service-only SQL setter. This closes the old direct Auth route without signing in again, replacing the session, or changing its deadline. Legacy database mutators remain unavailable to browser roles. Separate triggers protect the master profile and credentials. Password verification reads the existing Auth hash; submitted passwords are never persisted or logged by the implementation.

## Every account-count cap removed

| Location | Change |
| --- | --- |
| Portal delete/reset confirmation | Removed the 100-account selection rejection. |
| Portal transfer | Removed the 100-child selection rejection. |
| Edge child/grown-up deletion | Removed maximum array length; exact targets become a durable job. |
| Edge single/bulk transfer | Removed maximum array length; retained UUID, duplicate, and destination validation. |
| Edge child settings/settings reset | Removed maximum array length and silent deduplication. |
| Database `patch_child_settings` | Removed the 100-child maximum; rejects empty, null, and duplicate targets. |
| Database `transfer_children` | Removed the 100-child maximum; retains relationship and distinct-target checks. |
| Roster/assignment/settings reads | Read every page, including beyond the API row limit. Bounded profile lookups avoid oversized query URLs. |
| Tests | Replaced cap expectations with 1,251-target dispatch/selection tests and 251-target execution tests. |

Ten-target work batches, 200-row list pages, and 100-event synchronization chunks are internal processing sizes. They do not limit selections. Missing or unauthorized targets produce rejection or an individual failed result, with no unauthorized mutation. Historical migrations remain intact; the forward migration replaces their active definitions.

## Actions behind the password

One confirmation authorizes one exact single or bulk action. The password must belong to the grown-up resolved from the existing session.

- Delete children or grown-ups, including older singular routes.
- Reset child, grown-up, or own progress.
- Set/reset a child's or another grown-up's password, or change your own.
- Unlink a child.
- Transfer one or many children.
- Create a grown-up login, including the older `register` route.
- Change your own, a child's, or another grown-up's username.

Linking/sharing children, creating child accounts, name/picture-only edits, settings changes/resets, gameplay, comfort controls, viewing, and signing out remain password-free. A username-changing request must pass verification before any combined name/picture update occurs. Browser `confirm` flags provide no authorization.

## Verification

The new Edge suite executes the real handler with transport doubles. It covers 1,251-target requests, 251 grown-up deletions, missing/wrong/another-person passwords, actor spoofing, legacy routes, malformed/duplicate selections, partial failures, pagination, session failure, and master protection.

The new PostgreSQL suite executes all current migrations with real pgcrypto/bcrypt. It covers 251-target settings, child and grown-up resets, transfers, direct settings/transfer calls over 100, permission denial, stale-username races, immutable request replay, session-bound jobs, leases, partial results, and lost-response reset retries that preserve newly earned progress. Password checks and changes preserve session/deadline rows.

Responsive browser tests use 1,251 children and 151 grown-ups at 390, 768, and 1440 pixels. They cover select-all, password-only dialogs, wrong/right retries, password-free bulk settings, failed-selection retention, lost start responses, and resumption across reload after all final-response retries fail. [Phone](risky-actions/browser/bulk-password-390.png), [tablet](risky-actions/browser/bulk-password-768.png), [desktop](risky-actions/browser/bulk-password-1440.png).

Live verification used only newly created disposable accounts against the deployed backend. It passed 125-child resets, settings updates and deletion with a missing-ID partial result, own/child password changes, username changes, harmless edits, wrong/missing/another-grown-up passwords, direct Auth and SQL denial, and all three portal widths. The new password authenticated successfully and the original session deadline stayed unchanged. [Live results](risky-actions/live-checks.json).

The first disposable bootstrap used bcryptjs's `$2b$` hash prefix, which this PostgreSQL crypt implementation does not recognize. The fixture was corrected to Auth's native `$2a$` prefix and the complete live suite passed. Existing account hashes were not changed.

Existing database, Edge, account synchronization, portal, call-list, fixlist, offline, static/audio, runtime, and game/browser suites were run. Exact final outcomes are recorded in [test results](risky-actions/tests). The five historical PGlite suites explicitly cover the pre-risky schema because PGlite lacks pgcrypto; the new real PostgreSQL suite covers the complete current schema. One grown-up audio smoke check timed out once and passed two unchanged reruns, including the full screenshot run. Game browser coverage uses all six supported shards with optional screenshots disabled; behavior assertions remain unchanged.

Old live suites that authenticate as, edit/restore, or otherwise mutate the real master were intentionally not run. Their applicable behavior is covered by disposable local master fixtures and the new disposable-only live suite. No prohibited live test was used to obtain a passing result.

The security advisor flags the deliberately authenticated security-definer entry points and the private job table's lack of browser policies. Those functions derive and validate actor/session identity; mutation workers remain service-only. The existing leaked-password-protection setting was left unchanged.

## Master and live-data preservation

The master remains `brandy`, display name Brandy. Its complete profile and Auth-row digests are identical to the original read-only baseline. The master was never signed in, modified, renamed, deleted, reset, re-passworded, or restored by this work. Master behavior was tested with local disposable fixtures.

All 370 pre-existing account IDs remain. The two live test runs created 254 disposable accounts total. Every one was removed using only its recorded exact ID, with children cleaned up before their grown-ups. No pre-existing live account was deleted, no Bradley change was restored, and no database rollback was performed. [Preservation checks](risky-actions/preservation.json).

The final `raw.githack.com` fetch check returned HTTP 403 from this environment. The live portal checks used a local static frontend with the deployed Supabase backend; CDN-hosted UI verification is therefore not claimed. This did not prevent the required branch push or backend deployment.

## Test with a disposable login

Create a new disposable grown-up through the portal's existing authorized master flow, confirming the acting grown-up's current password. Sign out and sign in as that disposable grown-up. Create disposable children, then select them and try a progress reset. The dialog should list their identities and ask only for your current password. A wrong password should preserve their data; the correct password should complete the action. Try changing your own password and a child's password, then verify the new credentials. A name/picture-only edit and a settings reset should work without a password prompt. Delete only the disposable children and grown-up IDs you created.

For automated coverage, run `node tests/risky_actions_database.cjs`, `node tests/risky_actions_edge.cjs`, and `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome node tests/risky_actions_browser.cjs`. The local database suite requires PostgreSQL with pgcrypto and `sudo -u postgres psql`; browser/transport suites use the repository's existing local test dependencies. Never substitute the real master into a mutating fixture.

The opt-in `tests/risky_actions_live.cjs` generates ephemeral credentials in memory and prints a fixture SQL path containing only hashes. With `RISKY_ACTIONS_LIVE=ixjbgshhzeaosrzavssr`, apply that exact fixture SQL to the authorized project, then create its adjacent `fixture-applied` marker. It records created IDs for exact cleanup; its bootstrap grown-ups must also be removed by those exact IDs after completion. Do not commit the private fixture directory or copy any password into a report.
