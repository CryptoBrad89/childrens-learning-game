# Tidy 1B repeat-back

Bradley approved the visual changes in `previews/tidy-1/`. After the go, I will apply exactly those changes to the real games on `codex/home-flow-ribbon`.

This turn changes only this repeat-back file. Implementation, screenshots, cache updates, commits, and pushes wait for the go.

## Approved changes

1. Increase the top-right profile picture from 32 px to 42 px inside the preview's 50 px button. Keep its center aligned with the sound and theme controls. Apply the approved styling wherever the profile button appears in Letter Post, Moonboat, and Ribbon Road, across every theme.
2. Remove the Letter Post "OPEN FOR PLAY!" tag completely, with nothing in its place. Apply the removal to the live home rendering paths so the tag cannot reappear.

Keep the rest of tidy list 1 intact: current-build takeover, the grown-up-only portal link, silent picture-screen entry, interruptible word-and-retry feedback, no hints, and dropdown dismissal. A letter must become done only after a correct answer.

## Plan after the go

1. Confirm the working branch and verify that `rollback/pre-tidy-1b-2026-10-21-codex` points to `e31c9af`. Push that rollback branch to origin.
2. Use the approved preview as the reference for the profile button styling and tag removal. Make only the corresponding live-game changes.
3. Regenerate the offline manifest to bump its cache version. Verify that the new build takes over through the existing update flow and remains available offline.
4. Check all three games and themes at 1024×576, a 768×1024 portrait tablet, and 1920×1080. Verify the avatar dimensions, control alignment, and absence of the Letter Post tag. Check grown-up and child profile menus with isolated local fixtures.
5. Run appropriate regression checks for the tidy-1 behavior and correct-answer-only completion. Save screenshots and test evidence under `reports/tidy-1b/`.
6. Write `reports/tidy-1b.md` with the changes, test results, screenshots, and any verification limitations. Commit and push the completed work on `codex/home-flow-ribbon`, verify the remote commit, then stop.

## Account and database protections

There is no database work. Leave Brandy's master administrator account completely alone, including its username, display name, password, settings, and progress. Do not sign into or use that account for verification.

Never delete or restore pre-existing accounts. Preserve Bradley's test deletions, password changes, and setting changes. Do not restore any earlier database state. Browser verification will use local fixtures or block live account requests.

Waiting for the go.
