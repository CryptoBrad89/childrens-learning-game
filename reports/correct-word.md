# Correct taps say the word, then cheer

Correct taps now immediately queue the tapped word followed by one existing celebration clip in Letter Post, Moonboat, and Ribbon Road. The audio sequence starts before the correct bounce and continues across the reward-screen transition. The cheer starts when the word finishes, independently of the reward animation and Lucy's nod.

## Change

The correct-answer handler previously queued only the cheer. Both app files now pass the tapped word and cheer to the existing sequential voice player. Ribbon Road shares Letter Post's app. The existing cancellation token handles interruptions to either clip and cancels a pending cheer when muted.

The production change is one line in each app and a regenerated offline manifest. No animation, letter-entry behavior, wrong-answer behavior, clip selection, or audio files changed. The correct bounce remains 480 ms, the reward animation remains 4,400 ms, and the existing confetti and nod still run. Audio does not await them.

The offline cache version changed from `15e87cc24c836db0` to `adf7b090c78c90d6`, with the same 150 assets. Regenerating the manifest produces the same version.

## Playback timings

| Layout | Viewport | Tap to word, ms | Word end to cheer, ms |
|---|---|---:|---:|
| Letter Post | 1024×576 | 18.1 [17.1 to 24.2] | 8.1 [7.6 to 8.4] |
| Moonboat | 1024×576 | 19.4 [16.9 to 20.7] | 8.4 [6.8 to 37.1] |
| Ribbon Road | 1024×576 | 19.6 [17.9 to 20.7] | 8.1 [6.2 to 10.8] |
| Letter Post | 768×1024 | 16.8 [16.0 to 19.1] | 9.2 [7.1 to 9.7] |
| Moonboat | 768×1024 | 19.1 [18.1 to 24.3] | 9.0 [8.6 to 10.2] |
| Ribbon Road | 768×1024 | 18.9 [13.3 to 19.3] | 9.4 [7.7 to 12.0] |
| Letter Post | 1920×1080 | 18.3 [16.2 to 19.6] | 8.6 [7.5 to 10.0] |
| Moonboat | 1920×1080 | 19.6 [19.2 to 24.1] | 7.8 [7.5 to 9.2] |
| Ribbon Road | 1920×1080 | 17.2 [13.6 to 18.7] | 8.6 [6.7 to 11.9] |

All 45 completed samples meet both timing limits, and every cheer starts before the 4,400 ms reward animation ends.

Each row contains five runs in fresh Chrome contexts, alternating apple and hat. Times are milliseconds, shown as median [minimum to maximum]. Tap-to-word measures from the captured answer click to the word's native `playing` event. Word-to-cheer measures from the word's native `ended` event to the cheer's native `playing` event. Both MP3s must finish without errors, in the correct order, with exactly two speech clips. All runs use normal motion.

These are local HTTP, headless Chrome measurements with actual, unmodified MP3 playback. Service workers are blocked for the timing run, so each context fetches assets on its first visit. Browser fetch, decode, and playback startup account for the remaining gap. The figures measure browser playback events, not physical speaker latency or hosted network performance. Initial host load was 0.10 across eight cores. Chrome was 156.0.8078.47 and Node was v20.19.2.

One additional Ribbon Road 1920×1080 attempt timed out waiting for the cheer to finish. Its state was not captured, so the cause is unknown. The three unfinished samples passed in fresh contexts using `node tests/correct_word.cjs --resume`. The table summarizes the 45 completed samples; the interrupted attempt is preserved in the run log. The runner now captures playback state on such a timeout.

Raw evidence is in [timings.json](correct-word/timings.json) and [timings.log](correct-word/timings.log). Rerun with `node tests/correct_word.cjs`. Screenshots for each layout and size use the `correct-` prefix under [correct-word/](correct-word/).

## Verification

- The updated runtime regression failed before the fix because a correct tap played one clip instead of two. See [regression-before.log](correct-word/regression-before.log). After the fix, `node tests/runtime_smoke.cjs` passed 234 rounds across all letters, themes, and layouts. It asserts that only wrong tapped words play after misses and that a correct tap says its own word before a cheer. See [runtime.log](correct-word/runtime.log). This test stubs browser APIs and supplies no timing claims.
- `CELEBRATE_REPORT_DIR=reports/correct-word node tests/celebrate_audio_rules.cjs` checks real MP3 playback across all three layouts and sizes, online and offline. It covers letter name and sound on entry and return through Listen, silent Find navigation, explicit replay, wrong-word then pause then one random retry, no hints, correct-word then cheer, interruption, mute, next-letter autoplay, and no speech overlap. Portrait tablet uses reduced motion in this separate rules test. A regular in-memory account fixture verifies progress recording. All 18 cases passed without page errors. Their word-start delays were 9.9 to 25.2 ms and cheer gaps were 6.3 to 200.6 ms, including offline playback. See [audio-rules.json](correct-word/audio-rules.json) and [audio-rules.log](correct-word/audio-rules.log).
- A supplemental native-playback check mutes during the correct word in each layout and confirms that the word stops and the queued cheer never starts. See [mute-queue.json](correct-word/mute-queue.json).
- `python3 tests/run_tests.py` passed all six strict checks, including approved clip hashes and the complete voice inventory. See [static.log](correct-word/static.log). JavaScript syntax, reproducible cache generation, and `git diff --check` also passed.

The previous celebration timing test's assertions now recognize word-then-cheer behavior. The focused `correct_word.cjs` runner measures the two requested intervals directly.

## Delivery and account protection

Work stayed on `codex/home-flow-ribbon`. Before application edits, rollback branch `rollback/pre-correct-word-2026-10-23-codex` was created at starting HEAD `3871215e1651d56c74bbc942e14dc474d5694457` and pushed. The initial push encountered a stale credential-helper executable path; using the installed GitHub CLI succeeded without changing repository configuration.

Verification used local guests and an in-memory regular-account fixture. Guest test contexts block external requests, and fixture requests are intercepted locally. No live Supabase access, sign-in, deployment, migration, database change, or account inspection was performed. The master administrator account was never accessed or changed. Bradley's deletions, passwords, settings, and existing account progress were left untouched. No pre-existing accounts were deleted or restored.
