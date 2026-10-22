# Saved progress repeat-back

The goal is to make done badges and collections reflect an account's saved correct answers, shared across Letter Post, Moonboat, and Ribbon Road.

This turn changes only this repeat-back file. Investigation, implementation, tests, screenshots, rollback creation, commits, and pushes wait for the go.

## Understanding

Bradley's reported progress is saved, but the game UI reportedly reads a fresh, in-memory `visited` set each visit. That would explain why badges disappear after signing out and back in. After the go, I will verify that explanation in the actual account storage, sync flow, and game renderers before making changes.

1. For signed-in play, use the account that owns the saved play. This applies to grown-up accounts and child accounts. Any saved correct-answer round for a letter, in any game, makes that letter done in all three games for that account.
2. Load the done set when the game opens, after account readiness. Refresh it after sync finishes so rounds from another device appear in the current game's badges and collection.
3. Preserve correct-answer-only completion. Opening a letter or tapping a wrong picture never creates a completion.
4. Animate the badge settle only when a letter becomes newly done through a correct answer. Loading or syncing saved completions must not animate them. A letter already completed in another game is already done.
5. Keep Play without saving visit-only. Guests must not inherit saved account progress or gain persistent completion from this change.
6. Update visit-specific wording and accessibility labels so signed-in progress is described accurately. Keep visit-only wording where it remains true for guests.
7. Keep progress isolated by account. Signing out and signing in as someone else must replace the displayed progress with that account's own saved completions.

The shared behavior must cover both game script copies and Ribbon Road's use of the Letter Post script, as well as home badges and the stamp album, constellation, and Ribbon Road collection.

## Plan after the go

1. Confirm that work is on `codex/home-flow-ribbon`. Create `rollback/pre-progress-2026-10-21-codex` at the HEAD implementation starts from and push it to origin.
2. Trace account readiness, the saved rounds, the play owner, sync completion notifications, and all consumers of `visited`. Reproduce the reported loss of displayed badges with local fixtures.
3. Populate and refresh the shared done set from the owning account's existing saved rounds. Keep account changes, guest play, and new-completion animation distinct so progress cannot leak or animate merely because it was loaded.
4. Update the affected visible text and accessibility labels. Preserve the existing tidy-1 and tidy-1B behavior and approved appearance.
5. Verify a correct answer in one game, reload, sign out and back in, then open the other games. Confirm that the saved completion appears throughout. Also verify incoming sync from another device, wrong answers, guest visit-only behavior, account switching, and animation behavior.
6. Run tests and browser checks at 1024×576, a 768×1024 portrait tablet, and 1920×1080. Use isolated local fixtures for account verification. Save screenshots and evidence to `reports/progress/`.
7. Regenerate the offline manifest to bump the cache version and verify that the updated games take over through the existing update flow.
8. Write `reports/progress.md` with the verified cause, changes, test results, screenshots, and any limitations. Commit and push the completed work on the lane branch, verify the remote commit, then stop.

## Account and database protections

Use the existing account-round storage and sync APIs. Make no database, migration, or backend schema changes.

Leave Brandy's master administrator account completely alone, including its username, display name, password, settings, and progress. Do not sign into it for testing or reset its progress.

Never delete or restore pre-existing accounts. Preserve Bradley's account deletions, password changes, and setting changes. Do not restore an earlier database state. Verification will use local fixtures rather than existing live accounts.

Waiting for the go.
