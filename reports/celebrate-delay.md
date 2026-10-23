# Celebrate sound delay

The celebrate clip now starts at the correct tap. Across all three layouts and three screen sizes, median native playback delay fell from 6.41–6.45 seconds to 15–22 milliseconds.

## Cause and change

The original correct-answer handler automatically played the target word, awaited its end, awaited the 480 ms correct bounce, and transitioned screens for 180 ms. The celebration handler then awaited the entire 4,400 ms reward animation and a 380 ms Lucy nod before calling `voice()` for the cheer. These waits existed in both game app files; Ribbon Road uses Letter Post’s app.

The separate diagnostic baseline captured the actual sequence for Ribbon Road at 1024×576: word requested at 0.4 ms and playing at 21.1 ms, bounce starting at 909.0 ms, transition at 1,396.1 ms, reward at 1,596.1 ms, nod at 6,029.8 ms, cheer requested at 6,413.4 ms, and cheer playing at 6,431.2 ms. The reward animation alone held the cheer for about 4.4 seconds. See [baseline trace](celebrate-delay/baseline.json).

Both app files now request only the existing cheer immediately in the correct-answer handler, before animation or progress persistence. The transition preserves that active voice. Reward and nod remain visual effects and can no longer queue a late cheer. Automatic letter/name/sound playback on entry and return to Listen was removed to meet the job’s sound rule; explicit speaker taps still work. The correct word is available through the existing “Hear apple again” control.

Wrong answers retain the tapped-word → 200 ms pause → one random retry sequence. Existing cancellation, mute, no-hint behavior, progress recording, and clip selection remain in place. No audio files changed. No preloading was added: instrumentation identified scheduling waits as the cause. The existing offline manifest already includes both cheers in both asset folders. Its content version changed from `7efa2a5b01823475` to `75e9b578998091b5`.

## Measured playback delay

Milliseconds from the browser’s captured correct-answer click to the native MP3 `playing` event. Each cell gives median [minimum–maximum], five runs per side per layout and size. Before and after alternate in fresh browser contexts; the three layouts run concurrently. Both sides use normal motion, real unmodified MP3 files, the same local HTTP server, and guest play. The before app is read directly from starting commit `67cf3c2`; the two original app files are identical. Service workers are blocked in this comparison so each side exercises an uncached first visit. No fake media player, shortened timer, or autoplay-policy override is used.

| Layout | Viewport | Before, ms | After, ms |
|---|---|---:|---:|
| Letter Post | 1024×576 | 6424.1 [6402.1–6470.4] | 20.9 [11.2–25.6] |
| Letter Post | 768×1024 | 6422.0 [6420.9–6423.9] | 20.2 [18.7–21.4] |
| Letter Post | 1920×1080 | 6415.7 [6404.7–6432.0] | 21.9 [20.7–28.3] |
| Moonboat | 1024×576 | 6408.2 [6402.6–6425.7] | 22.0 [20.4–23.7] |
| Moonboat | 768×1024 | 6410.2 [6405.0–6422.4] | 19.5 [15.6–22.8] |
| Moonboat | 1920×1080 | 6436.9 [6410.2–6447.6] | 14.8 [11.8–21.8] |
| Ribbon Road | 1024×576 | 6451.5 [6432.2–6493.5] | 21.0 [19.5–22.4] |
| Ribbon Road | 768×1024 | 6425.1 [6420.7–6446.5] | 20.8 [17.8–24.5] |
| Ribbon Road | 1920×1080 | 6437.0 [6407.8–6480.9] | 20.7 [19.2–24.2] |

All 90 runs reached real playback without media or page errors. The remaining delay is browser fetching/decoding/playback startup; the seconds of application waits no longer gate speech. Initial host load was 0.37 across eight cores. These are local headless Chrome measurements, not a claim about remote network latency or physical speaker output. Network/device conditions can add media startup time.

Raw measurements: [timings.json](celebrate-delay/timings.json), [run log](celebrate-delay/timings.log). Rerun with `node tests/celebrate_delay.cjs`. Use `--baseline` for the separate diagnostic trace.

## Verification

- `node tests/celebrate_audio_rules.cjs`: passed all 18 layout/size/online-or-offline combinations using native playback. Portrait tablet also exercises reduced motion. Offline correct-tap playback started in 16.1–21.7 ms after installation of the versioned cache. Verified word replay, cheer interruption, no speech overlap, mute, silent letter entry/next, and horizontal fit. Three wrong taps per layout verify one of each random retry clip, the original pause, and no hints. A new correct tap also cuts off wrong-answer speech.
- The same browser test signs in only to a regular in-memory fixture and verifies that completing A in each layout records one additional round. All external guest requests are blocked; no live backend request is sent.
- `node tests/runtime_smoke.cjs`: passed 234 rounds across every letter and all three themes in all three layouts. Covers explicit letter replay, wrong answers, no hints, correct-answer cheer without the target word, reward replay, collection, next/wrap, and mute. This separate regression test stubs browser APIs and is not used for timing claims.
- `python3 tests/run_tests.py`: all six strict checks passed, including approved clip hashes and the complete voice inventory. The old static checks requiring automatic letter playback and a particular cheer expression were removed; the browser and runtime assertions check the required playback behavior.
- JavaScript syntax, reproducible offline manifest generation, and `git diff --check` passed.

Evidence: [audio rules](celebrate-delay/audio-rules.json), [browser log](celebrate-delay/audio-rules.log), [runtime log](celebrate-delay/runtime.log), and [static checks](celebrate-delay/static.log). Browser: Google Chrome 156.0.8078.47; Node.js v20.19.2. Timing and rule tests use the actual static application with guest sessions or an in-memory backend; no hosted account test was run.

Screenshots for all three layouts at 1024×576, 768×1024 portrait tablet, and 1920×1080 are under [celebrate-delay/](celebrate-delay/), including `before-`, `after-`, `online-`, and `offline-` captures.

## Delivery and account protection

Work stayed on `codex/home-flow-ribbon`. The rollback branch `rollback/pre-celebrate-delay-2026-10-22-codex` was created and pushed at starting HEAD `67cf3c2af1a751a37098203ee0a41892903e34c2` before application edits.

No database, account, credential, setting, or existing progress changes were made. Guest browser requests to external services were blocked; saved-progress verification uses an in-memory account backend. No live sign-in or account inspection was performed. The real master administrator account was never accessed. Bradley’s deleted accounts, passwords, and settings were left alone; no pre-existing account was deleted or restored. No Supabase deployment or migration was run.
