# Correct-word job: my understanding

This turn is repeat-back only. I will create only this file, make no implementation or database changes, create no branches or commits, push nothing, and stop until you give the go.

Bradley reports that correct picture taps are silent in Letter Post, Moonboat, and Ribbon Road. Wrong taps already say the tapped word and then play a retry clip correctly. The earlier instruction to never auto-play the correct word applied to wrong answers and hints; it should not have silenced a correct tap. The supplied screenshot is `reports/correct-word/bradley-screenshot.png`.

After the go, the required behavior is:

- A correct tap immediately starts Lucy saying the tapped word, such as “hat.” Once the word ends, the celebration clip follows with a short, natural gap under approximately 300 ms.
- Audio must not wait for the 4.4-second reward animation or Lucy’s nod. Preserve the instant-celebrate fix.
- Confetti, the reward animation, the bounce, and Lucy’s nod keep their existing behavior. Only audio timing changes.
- The letter page continues to automatically say the letter name and sound when it opens, including through “◀ Listen.” “Find the picture” does not replay the letter sound.
- A wrong tap still says only the tapped word, pauses, and plays one random retry clip. It never plays the letter or reveals the correct word. No hints are added.
- A new tap cuts off current audio, mute silences everything, and “Hear <word> again” continues to work.
- Keep the existing clips and bump the offline cache.

Implementation is restricted to `codex/home-flow-ribbon`, with Supabase project `ixjbgshhzeaosrzavssr` and no database changes. After authorization, first preserve the starting HEAD specified as `3871215` in `rollback/pre-correct-word-2026-10-23-codex` and push that rollback branch.

Verification must cover all three layouts at 1024×576, a portrait tablet size, and 1920×1080. For each of the nine combinations, measure tap-to-word-start latency, which should be approximately instant, and word-end-to-cheer-start latency, which should be under approximately 300 ms. Verify the preserved audio and animation behaviors as well. Use only local fixtures, a guest, or throwaway test accounts. Save screenshots under `reports/correct-word/`, record measured timings per layout and size in `reports/correct-word.md`, then commit and push the completed work after the go.

The master administrator account with username and display name Brandy must remain completely untouched. Do not sign in as it, reset its progress, change its credentials or settings, rename it, or delete it. Preserve Bradley’s test deletions and all password and setting changes. Never delete or restore pre-existing accounts, and do not restore the database to an earlier state.

No implementation, testing, rollback branch creation, commit, or push is authorized for this turn. I will stop after writing this repeat-back and wait for the go.
