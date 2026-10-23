# Letter autoplay repeat-back

This turn is limited to this repeat-back. I will make no other file changes, commits, or pushes, and will stop and wait for the go before implementation.

Commit `4a9067c` applied the ban on automatic letter audio too broadly. That ban belongs to wrong-answer handling. Bradley's standing rule requires Lucy to say the letter name and letter sound automatically when a child opens a letter page.

After the go, I understand the requested work as follows:

- Restore that automatic audio in Letter Post, Moonboat, and Ribbon Road, including when the child returns with the "◀ Listen" back button, as before `4a9067c`.
- Keep the celebrate clip starting immediately at a correct tap. Do not restore the celebrate delay.
- Keep wrong-answer audio as the tapped word, a pause, and one random retry clip. Never play the letter name, letter sound, or correct word during that sequence.
- Keep hints absent everywhere.
- Keep "Find the picture" from replaying the letter sound. The child can tap the letter to hear it again.
- Preserve audio interruption on a new tap and mute behavior for all audio.
- Leave correct-answer word autoplay as it is now, and keep "Hear apple again" working.
- Do not change the clips themselves. Keep all other behavior as it is now.

Implementation must stay on `codex/home-flow-ribbon`, with Supabase project `ixjbgshhzeaosrzavssr` and no database changes. Before implementation, create and push `rollback/pre-letter-autoplay-2026-10-22-codex` at the starting HEAD, identified in the job as `4a9067c`. That rollback action is deferred until the go.

Verification must cover all three layouts at 1024x576, a portrait tablet size, and 1920x1080. Use only local fixtures, a guest, or throwaway test accounts. Re-run the celebrate timing check and confirm that the cheer still starts within approximately 50 ms of the correct tap. Bump the offline cache version, save screenshots under `reports/letter-autoplay/`, and write the implementation and verification report to `reports/letter-autoplay.md`. The eventual implementation delivery includes a commit and push.

The master administrator account, username and display name `Brandy`, must remain completely untouched. Do not sign in as that account, reset its progress, or change its password or any other account data. Preserve Bradley's test deletions, password changes, and settings changes. Never delete or restore pre-existing accounts, and do not restore the database to an earlier state.

No implementation or verification has been performed in this repeat-back turn. Work is waiting for the go.
