# Celebrate delay: repeat-back

After you give the go, I will investigate and fix the long delay between a correct tap and the celebrate clip starting in Letter Post, Moonboat, and Ribbon Road. I will identify the cause with measurements rather than guess, then measure the delay before and after for each layout.

The work is restricted to branch `codex/home-flow-ribbon` and Supabase project `ixjbgshhzeaosrzavssr`, with no database changes. Before implementation, I will create and push `rollback/pre-celebrate-delay-2026-10-22-codex` at the starting HEAD specified in the job (`67cf3c2`).

The celebrate clip should start immediately when a correct answer lands. I will preserve the sound rules: no hints; a new tap cuts off current audio; a wrong answer plays the tapped word, pauses, then plays one random retry clip; and the letter name, letter sound, and correct word never autoplay. I will keep the clips unchanged and preserve “Hear apple again.” Any required preloading must work offline and on the first visit.

I will verify all three layouts at 1024×576, portrait tablet size, and 1920×1080 using only local fixtures, a guest, or throwaway test accounts. I will bump the offline cache version, save screenshots under `reports/celebrate-delay/`, report measured delays before and after in `reports/celebrate-delay.md`, and commit and push the completed work.

I will leave the master administrator account (username and display name Brandy) completely untouched, including its password and progress, and will not sign in as it for testing. I will preserve Bradley’s test deletions, password changes, and setting changes, and will never delete or restore pre-existing accounts.

This turn is limited to writing this repeat-back. I will make no other file changes and will stop and wait for the go before investigating or implementing anything.
