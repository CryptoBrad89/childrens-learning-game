# Accounts and sync build

Real username/password accounts, child and class management, offline play, and cross-device sync are implemented. The migration and account function are deployed only to `ixjbgshhzeaosrzavssr`. The live two-profile offline test passed. All existing and added checks passed, including the expanded live grown-up-to-child settings journey.

## What changed and why

Every child and grown-up has a real Supabase Auth identity and a unique login name. Children use the same credentials at school and home. The only password requirement is six characters. The account Edge Function creates confirmed synthetic email identities through the official Auth Admin API, so the project's email confirmation stays on and children need no inbox. The browser receives only the publishable key.

The notebook supports grown-up registration, sign-in, child creation, linked-child password resets, changing your own password, classes and membership lists, and linking an existing child to another grown-up. A teacher or parent opens the child's notebook to inspect progress and edit that child's settings. Playing uses the actual signed-in person's account. The existing grown-ups' door, look and settings remain; a real grown-up login replaces the reading gate on hosted pages. Local-file play retains the original gate and device-only guest settings for compatibility.

IndexedDB stores immutable, person-owned UUID operations before a successful round celebrates. Supabase accepts an identical UUID only once. Progress is the union of completed rounds, and milestones derive from that same ledger, so retries cannot multiply achievements. The familiar in-world strip remains a collection for this visit; the header and notebook show lasting history.

Every grown-up setting, sound choice and each world's theme belongs to the person. Settings merge per field in server-assigned sequence order. Independent edits survive; the last newly accepted same-field edit wins. Offline edits from one profile upload in their original order. Retrying an older accepted edit retains its original sequence and cannot overwrite a newer edit. No device clock chooses a cross-device winner.

A generated service-worker manifest precaches all 136 HTML, JS, CSS, font, art and audio assets. The page announces offline readiness only after installation completes. Previously signed-in people can reopen and play offline, then sync on reconnect, foregrounding or the 15-second polling interval. Sign-out leaves each person's pending operations attached to that person's UUID. New sign-ins need a connection. Failed storage writes prevent claiming a round was saved.

Full paginated pulls deliberately favor simple complete reconciliation over an incremental sequence cursor, which could miss transactions that commit out of sequence. This is appropriate for the current small game; very large histories would need server snapshots or compaction. Browser storage must remain available for unsynced play. Clearing it removes pending work, as with any offline application. World settings take effect when a world opens; account projections and calm CSS update during sync.

Grown-ups can change their own password while signed in, and linked grown-ups can reset a child's password. There is no logged-out grown-up recovery flow because these handles have no verified inbox. This is a known functional limit, not a deployment blocker.

## How to try it

1. Serve the repo with `python3 -m http.server 8000` and open `http://localhost:8000/accounts/`. Use HTTPS when hosting beyond localhost.
2. Sign in with a test login below, or create a grown-up and then a child. Classes and existing-child linking are in the notebook.
3. For child settings, sign in as a linked grown-up, open the child's notebook, and enter the existing grown-ups' corner.
4. Sign in as the child on two browser profiles. Wait for **Games ready for offline play** before disconnecting one.
5. Reload the disconnected profile, play a round and change settings. Reconnect and press **Sync now** on the other notebook. The round, milestone, settings and theme arrive once.
6. On shared computers, use **I'm done** before the next person signs in. Pending changes remain available when their original login returns.

After editing runtime assets, run `python3 scripts/build-offline-manifest.py` and commit `sw-assets.js`.

## Test logins

All these accounts were deliberately created in the authorized project. No tokens or administrator secrets are included.

| Login | Person | Password |
| --- | --- | --- |
| `test_adult_mveuloaz` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mveumgwi` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mveuugbw` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mvevil8u` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mvevk15s` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mvevn0zu` | Grown-up; earlier verification fixture | `7234ab` |
| `test_adult_mvevohar` | Grown-up; latest class owner | `7234ab` |
| `test_child_mveuloaz` | Child; earlier verification fixture | `7234ab` |
| `test_child_mveumgwi` | Child; earlier verification fixture | `7234ab` |
| `test_child_mveuugbw` | Child; earlier verification fixture | `7234ab` |
| `test_child_mvevil8u` | Child; earlier verification fixture | `7234ab` |
| `test_child_mvevk15s` | Child; earlier verification fixture | `7234ab` |
| `test_child_mvevn0zu` | Child; earlier verification fixture | `7234ab` |
| `test_child_mvevohar` | Child; latest full live test, one B round | `7234ab` |
| `test_other_mveumgwi` | Child; earlier verification fixture | `aaaaaa` |
| `test_other_mveuugbw` | Child; earlier verification fixture | `aaaaaa` |
| `test_other_mvevil8u` | Child; earlier verification fixture | `aaaaaa` |
| `test_other_mvevk15s` | Child; earlier verification fixture | `aaaaaa` |
| `test_other_mvevn0zu` | Child; earlier verification fixture | `aaaaaa` |
| `test_other_mvevohar` | Child; latest isolation test | `aaaaaa` |
| `test_parent_mveumgwi` | Grown-up; earlier verification fixture | `7234ab` |
| `test_parent_mveuugbw` | Grown-up; earlier verification fixture | `7234ab` |
| `test_parent_mvevil8u` | Grown-up; earlier verification fixture | `7234ab` |
| `test_parent_mvevk15s` | Grown-up; earlier verification fixture | `7234ab` |
| `test_parent_mvevn0zu` | Grown-up; earlier verification fixture | `7234ab` |
| `test_parent_mvevohar` | Grown-up; latest linked parent | `7234ab` |

The machine-readable record is [accounts-test-logins.json](accounts-test-logins.json).

## Verification

The real Supabase test passed with two isolated Chromium profiles signed in as the same child. Profile A installed the actual service worker, disconnected, reloaded from cache, changed settings and theme, and completed B through normal game buttons. After reconnect, profile B rendered exactly one completed round and **First sound**, and its reopened world rendered the synchronized choices. Repeated sync kept one round. Concurrent volume and calm changes survived. A grown-up also opened the linked child's notebook, changed the one-miss hint through the real existing corner, and the second child profile rendered that hint after one wrong answer. See [accounts-live.log](accounts-live.log).

The live test also exercised class creation and assignment, a second grown-up linking the same child, and the six-character lowercase password `aaaaaa`. Actual RLS denied a child reading another child's profile or play, and returned HTTP 403 for a cross-child progress write.

The local protocol-fixture browser run separately passed committed-response loss and safe retry, pending-work isolation across sign-out, same-field offline edits with reverse UUID ordering, and sign-out during a delayed refresh. The fixture is explicitly labelled and is not substituted for live proof. See [accounts-sync.log](accounts-sync.log).

SQL tests execute the actual migration with PostgreSQL WASM, simulated Supabase roles, and `auth.uid()`. They cover access policies, immutable grants, exact retries, conflicting UUIDs, atomic rollback and class permissions. Edge tests execute the real handler with controlled transport responses, including ownership checks, retry recovery and partial provisioning. Strict TypeScript checking passed for the Edge Function.

Existing tests run with `NO_SCREENSHOTS=1` and `CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. No screenshots were taken. Results and repeatable commands are below. Browser commands use `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`.

| Check | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 strict groups |
| `node tests/runtime_smoke.cjs` | 234 rounds across all games and themes |
| `node tests/grown_ups_runtime.cjs` | Settings validation and all real renderers |
| `node tests/browser_smoke.cjs`, shards 0 through 5 | 18/18 game, viewport and theme cases |
| `node tests/motion_smoke.cjs` | 12/12 motion cases |
| `node tests/silk_smoke.cjs` | All 26 letters, palettes and viewport checks |
| `node tests/confetti_smoke.cjs` | 18/18 cases |
| `node tests/grown_ups_smoke.cjs` | Gate, settings, guards, reset, effects and layouts |
| `node tests/accounts_database.cjs` | SQL and RLS behavior passed |
| `node tests/accounts_database_edge.cjs` | Real handler transport tests passed |
| `node tests/accounts_sync.cjs` | Mocked transport browser cases passed |
| `node tests/accounts_sync.cjs --live` | Real Supabase two-profile journey, classes, links, RLS and actual corner settings passed |
| `node tests/accounts_selection.cjs` | Existing-account live child selection and navigation passed |
| Edge `tsc --noEmit --strict` and `git diff --check` | Passed |

Exact logs are in this directory. The browser matrix used the helper's existing `BROWSER_SMOKE_SHARD=0` through `5` partitions, each exiting zero. The first serial attempt was stopped after its first three passed cases, then the complete matrix passed as shards. The two runtime-only helpers now explicitly stub the local-file URL protocol; their original behavior assertions remain intact.

## Design tools and pstack

[Account design notes](accounts-design.md) give exact source paths and usage for every allowed design repository. Superdesign supplied the layout exploration workflow; design-taste supplied the playful paper direction; Better Design was read-only reference for hierarchy and a brief entrance; ui-layouts supplied the responsive grid pattern; Hyperiux supplied the existing fill-arrow interaction; motion-primitives supplied short transition timing; trickle supplied CSS rule animation; Paper Shaders supplied the reused static band. No live design connection, extension or new runtime package was used. `canvas-ui` and `cursify` were skipped as explicitly instructed. No other repository was skipped.

Pstack skills used were Poteto Mode, Architect with parallel candidate exploration and review, How for integration grounding, Figure It Out for the phased workflow, Show Me Your Work for the decision trail, No Comments for comment review, Unslop, Technical Writing, and Skill Creator for the focused verification-skill update. Supabase and TypeScript Best Practices guided the backend work. Model the Domain chose immutable round/setting operations; Make Operations Idempotent chose UUID delivery; Attack the Premise replaced a timing assumption with a focused live child-selection probe. Build the Lever produced the repeatable sync/database tests and offline-manifest generator; Prove It Works and Test Behavior Not Implementation required actual browser journeys and live database checks. The unavailable pstack model families and deslop tool were not used; all subagents used the available inherited model. No new PR was opened for tooling.

The independent implementation review found and led to fixes for offline field ordering, refresh after sign-out, deferred settings subscription, and startup hydration. The added selection test also caught a missing declaration in the navigation guard, which was fixed before final verification. Comment review removed one redundant comment and retained comments explaining privileged server credentials and non-obvious retry compensation. No comments were restored or constraints left awaiting approval. [Decision trail](accounts-decisions.tsv) records the choices and corrections.

## Deployment

`supabase/migrations/20261019060259_accounts_sync.sql` is applied as remote migration `20261019060259`, named `accounts_sync`. The local filename matches the connector's assigned history version. All tables, grants, policies and functions are in this migration. `supabase/functions/accounts/index.ts` is deployed as `accounts` version 1, ACTIVE. `supabase/config.toml` records gateway JWT verification as disabled because registration is public; protected actions validate the caller through Auth and its stored grown-up role. No other project was read or changed.

The security advisor reported no schema findings. Its only latest warning is **Leaked Password Protection Disabled**, which is the owner's explicit choice. It remains off. Supabase's [password protection documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) describes that advisory. Deployment evidence is [accounts-deployment.json](accounts-deployment.json).

## Open questions

No owner decision blocks the build. Known limits are new-login connectivity, browser storage durability, full-history sync bandwidth, and the missing logged-out grown-up password recovery flow described above. Static files are ready for the owner's HTTPS host; no hosting deployment was requested. The named feature branch contains the implementation and this report. No PR or main-branch change is part of this job.


Attention. Reviewed with the available inherited model. No blocking findings remain. Cross-family review was unavailable. Known limits and the intentionally disabled password advisory are documented above.
