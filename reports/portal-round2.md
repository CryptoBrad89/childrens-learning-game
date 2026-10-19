# Portal round two

TL;DR: All six requests are implemented. Grown-ups can share children without passwords, edit their own profiles, see server progress automatically, and confirm a child's progress reset or permanent deletion. The guest picker now says **Sign in to save**. Phone and desktop live checks pass on **ixjbgshhzeaosrzavssr** (`lwl-codex`).

## Preview

- [Home and layout picker](https://raw.githack.com/CryptoBrad89/childrens-learning-game/d74fa8e22254d7ff898464311ff2c7c14115f360/index.html)
- [Grown-up sign-in and portal](https://raw.githack.com/CryptoBrad89/childrens-learning-game/d74fa8e22254d7ff898464311ff2c7c14115f360/accounts/index.html)
- [Grown-up settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/d74fa8e22254d7ff898464311ff2c7c14115f360/grown-ups/index.html)

The pinned Githack preview host returns HTTP 403 from this runner, so hosted browser verification is blocked by that host. All app journeys below ran in Chromium served locally against the live Supabase project. [Preview attempt](portal-round2-preview.log).

For localhost, run `python3 -m http.server 8000` and open [home](http://localhost:8000/) or [the portal](http://localhost:8000/accounts/).

## Test logins

| Account | Username | Password |
| --- | --- | --- |
| Administrator grown-up | `r2_adult_mvfnzyk3390_new` | `8345bc` |
| Second grown-up | `r2_parent_mvfnzyk3390` | `7234ab` |
| Child | `r2_play_mvfnzyk3390` | `7234ab` |

The child, **Explorer available to link**, belongs to the administrator. Sign in as the second grown-up and expand **Link an existing child** to select that child without their password. The second grown-up has not yet linked this retained child. Use home for the child login and the portal for both grown-ups. [The login record](portal-round2-test-logins.json) also includes an independent desktop set. Only disposable reset/delete children were deleted.

## Changes and decisions

- **Progress page** replaces “notebook” throughout current UI, tests, and account documentation. Historical reports retain their original wording.
- Removed the **Ready to play** badge. All three layouts are playable; Ribbon Road keeps its default highlight.
- Guests see **Sign in to save**, which opens the child sign-in dialog. Signed-in players retain **Change player**.
- Child linking uses a dropdown of children already assigned to another grown-up. Both grown-ups retain their links. The Edge function authenticates the caller, checks the grown-up role, validates the selected child, and inserts a duplicate-safe guardian link. Discovery returns only IDs and names needed by the picker.
- **Edit my profile** offers display name, unique username, six icons, and picture upload. Username changes update the profile and synthetic Auth email atomically, including the email identity. **Change my password** keeps its existing separate form. New credentials work after sign-out; the old handle stops working.
- Reset and delete live inside **Manage this child**, below the selected child's progress. Neither appears on roster cards. Each opens a named confirmation dialog with **Cancel** focused and explains the effect on every linked grown-up. Only a linked grown-up can perform either action. Deletion removes the Auth account and cascades to profile/avatar, all guardian links, progress, and legacy child memberships.
- Reset deletes completed rounds and derived milestones while preserving account, picture, and settings. A server progress version prevents old cached or pending rounds from restoring erased progress. New play saves normally after reset.
- Previously, only the selected account synced, and totals could come from a local cache first. The roster now reads every child's server operations on entry, focus, reconnect, and every 15 seconds while visible. Last-known results appear only with an offline/connection label. Selected-child details show the check time. **Refresh progress** remains optional. An explicit sync now also drains writes queued during an in-flight sync.

## Deployment and rollback

Applied `20261019194252_portal_round2.sql` and `20261019194423_profile_auth_transaction.sql`; deployed `accounts` Edge version **3** to **ixjbgshhzeaosrzavssr only**. The Edge function retains internal Auth validation and the prior gateway setting. Profile/Auth editing is a service-only SQL transaction. The sync RPC locks the progress version for safe concurrent resets and explicitly checks access before writing.

Branch: `codex/home-flow-ribbon`. Rollback tag **pre-portal-round2-2026-10-19-codex** points to `4b715be` and is pushed. Main was not changed. Frontend rollback alone does not reverse deployed migrations or Edge permissions, and cannot recover a confirmed deletion/reset.

The security advisor flags the intentionally authenticated `SECURITY DEFINER` sync RPC, whose access checks are exercised by the database and live RLS tests. It also reports the existing disabled leaked-password protection setting. References: [function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Verification

All browser helpers use `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. No screenshots were taken. Bradley's supplied picker image was the reference. Existing cream chrome and form controls supplied the design; the local design-tool index and Better Design reference were inspected without a live design connection. Art and audio are unchanged. The offline manifest was rebuilt.

- `tests/portal_round2.cjs`: live phone **390px** and desktop **1440px**. Profile/name/password/icon/upload persistence, unique handles, old-handle rejection, password-free sharing, repeated linking, anonymous/child denial, unlinked-grown-up denial, actual game progress read on entry, confirmation and cancellation, settings-preserving reset, old offline round rejection, new rounds after reset, labelled offline reload, complete deletion, no page errors or horizontal overflow. [Log](portal-round2-live.log).
- `tests/portal_flow.cjs`, fixture and live: phone/desktop with light/dark preferences, cream chrome, existing creation and avatar behavior, role restrictions. [Live log](portal-round2-portal-live.log).
- `tests/accounts_sync.cjs`, fixture and live: offline game reload, cross-browser progress/settings, retries, deduplication, identity separation, and real RLS denial. [Live log](portal-round2-sync-live.log), [fixture log](portal-round2-sync.log).
- `tests/accounts_database.cjs`: actual migrations, profile/Auth uniqueness transaction, RLS, reset generations, old direct inserts/replays rejected, settings kept, new play accepted, and full deletion cascade. `tests/accounts_database_edge.cjs`: real handler with transport doubles. [Database log](portal-round2-database.log), [Edge log](portal-round2-edge.log).
- Existing home flow, child selection/settings navigation, grown-up runtime/browser, 234 game runtime rounds, Ribbon Road, **12/12 motion cases**, **18/18 confetti cases**, and six browser shards totalling **18/18 browser cases**. Accompanying `portal-round2-*.log` files retain the results.
- `python3 tests/run_tests.py`: **6/6** strict checks. Strict Edge TypeScript, JavaScript syntax, and `git diff --check` pass.

No open product questions. [Retained login verification](portal-round2-review-logins.log) checks child sign-in and confirms the second grown-up still has the child available to link.
