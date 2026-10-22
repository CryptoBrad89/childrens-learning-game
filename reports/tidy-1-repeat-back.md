# Tidy-up list 1 repeat-back

This turn changes only `reports/tidy-1-repeat-back.md`. Implementation, previews, tests, commits, and pushes wait for Bradley's go.

## Scope and protections

After the go, work stays on `codex/home-flow-ribbon`. Each applicable fix covers Letter Post, Moonboat, and Ribbon Road unless the item names one game. The reference screenshots are in `reports/tidy-1-screens/`.

There is no database work. Leave the master administrator account, username and display name Brandy, completely untouched, including its password, settings, and progress. Never delete or restore pre-existing accounts. Preserve Bradley's test deletions and all existing password and setting changes. Do not restore an earlier database state.

Verify that the local rollback branch `rollback/pre-tidy-1-2026-10-21-codex` points to `3d874eb`, then push that rollback branch to origin as part of the authorized job.

## Understanding of every item

1. Fix stale offline builds. A new hosted build must appear on the next load or after one refresh, even when an older service worker has cached the game. Users must not need to close tabs, use incognito, or clear their cache.

2. Add a grown-up portal link to the profile dropdown during play. Show it only for a signed-in grown-up. A signed-in child must never see it.

3. Remove the repeated letter sound when the child taps "Find its picture". Keep the initial letter and sound on the "You've got sound mail!" screen. On the picture screen, the child can tap the letter to replay its sound.

4. Merge the held wrong-answer sound fix into this work. Every wrong tap plays only the tapped picture's word, pauses about 150–250 ms, then plays one random existing Lucy retry clip. Use the existing uh-oh, try-again, and oops-try-again clips, with uh-oh still eligible. A new tap or replay stops the current audio sequence. Never add the letter sound, letter name, or correct word to wrong-answer feedback, including on the first miss. Use no new audio.

5. Remove every hint path wherever it exists in these games. Repeated misses must not trigger spoken hints, automatic letter sounds or names, the correct word, highlighting, or narrowed choices. On the picture screen, the letter sound plays only when the child taps the letter on the left. Preserve the rule that a letter becomes done only after a correct answer.

6. Prepare a preview of a larger profile picture inside the top-right button. It should be easier to recognize while staying aligned with the sound and theme buttons. Build this only under `previews/tidy-1/`, with screenshots. Bradley must approve the preview before any live game receives this visual change.

7. Close the profile dropdown whenever the user navigates to another page or screen, including opening a letter, Home, "Find its picture", and other links. Also close it when the user taps outside the dropdown. Check both child and grown-up sessions.

8. Prepare a preview that removes the Letter Post "OPEN FOR PLAY!" tag. Removal is my initial choice because the tag suggests an action but does nothing. Any decorative alternative must have no button shape, raised appearance, shadow, or action wording. Build this only under `previews/tidy-1/`, with screenshots, and wait for Bradley's approval before changing the live game.

## Plan after the go

1. Check the branch and rollback point. Read the reference screenshots and trace the service-worker update flow, profile menu, navigation, audio playback, and hint paths across the three games.
2. Complete Step A: implement items 1, 2, 3, 4, 5, and 7. Consolidate the wrong-answer behavior with the held fix and remove all hint paths.
3. Build the preview page and screenshots for items 6 and 8 under `previews/tidy-1/`. Keep those visual changes out of the live games pending Bradley's approval.
4. Run appropriate tests and browser checks at 1024×576, a portrait tablet size, and 1920×1080. Check grown-up versus child menu visibility, dropdown dismissal, audio timing and interruption, repeated wrong taps, explicit sound replay, and completion only after a correct answer.
5. Test the service-worker update using an old build followed by the new build in the same browser session. Confirm that the new version appears on the next load or one refresh without closing tabs or clearing cache.
6. Save verification screenshots to `reports/tidy-1/`. Commit and push the authorized changes and the rollback branch. Write `reports/tidy-1.md` with the result for each item, test results, preview links for items 6 and 8, and game links using `https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/...`.
7. Wait for Bradley's preview approval before applying items 6 and 8 to the live games.

No implementation has started. Waiting for the go.
