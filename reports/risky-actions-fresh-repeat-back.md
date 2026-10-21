# Risky actions repeat-back

This turn is inspection and this report only. Implementation, tests that write data, commits, pushes, and deployment wait for a later turn.

I will remove account-count limits throughout the portal, Edge functions, database functions, and tests. The current code caps deletion and transfer selections in `accounts/portal.js`, validates arrays against 100 in `supabase/functions/accounts/index.ts`, and caps settings and transfer arrays in the database migrations. I will check every bulk path, including settings, and make roster loading and select-all include every matching account. Large actions will use internal batches with bounded concurrency and report partial failures. Empty, duplicate, malformed, and unauthorized targets will still be rejected. Sync-event chunk sizes and pagination can stay when they do not restrict account selections.

I will require the signed-in grown-up's current password for deleting kids or grown-ups, every progress reset including their own, setting or resetting another account's password, changing their own password, unlinking kids, single or bulk transfers, creating grown-up logins, and changing usernames. Profile edits will require this check when the username changes; editing only a name or picture will not. Linking or sharing kids, creating kids, settings changes or resets, gameplay, comfort controls, viewing, and signing out will remain outside this check.

The server will derive the actor from the signed-in session and verify that actor's password before any risky mutation. Missing, wrong, or another person's password must leave data unchanged. I will close bypasses through direct database calls, older action routes, browser confirmation flags, and the direct Auth password-update path currently used by `accounts/client.js`. One password confirmation will cover a whole bulk action. Verification must neither store or log the password nor change the session or its timeout.

The portal will show the affected people and ask only for the password as confirmation. I will replace the typed-count fields and the unlink `window.confirm()` popup. No typed names, counts, or acknowledgement checkboxes will remain in risky confirmations.

I will test selections well over 100, successful and failed password checks, another user's password, bypass attempts, and partial failures. I will run the existing suites and exercise the portal at phone, tablet, and desktop widths.

All implementation, commits, pushes, and deployment will stay on `codex/home-flow-ribbon` and Supabase project `ixjbgshhzeaosrzavssr`. The master account `brandy` will remain completely untouched. I will preserve Bradley's deletions, password changes, and settings, never roll back the database, and never delete pre-existing live accounts. Master behavior will be tested with disposable accounts, with cleanup restricted to their exact IDs. The final implementation report will be `reports/risky-actions-pass.md`.

I have no questions that need an answer before implementation. The next code review must establish every database and Auth bypass and the safe batching approach before changes begin.
