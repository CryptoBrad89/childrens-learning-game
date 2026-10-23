# Letter-page autoplay

Lucy again says the letter name and letter sound automatically when a letter page opens in Letter Post, Moonboat, and Ribbon Road. Returning with the "◀ Listen" button also plays both clips. "Find the picture" still opens the match step silently.

The change restores the pre-`4a9067c` entry sequence after the opening animation and the existing replay call after returning to Listen. Each app file has two restored calls. Ribbon Road uses `v1-letter-post/app.js`.

Correct-answer audio remains exactly as at `4a9067c`. The answer handler, celebration handler, match transition, and explicit replay function are byte-for-byte unchanged. A correct tap still starts only the existing cheer, and "Hear apple again" still plays the word when tapped. See the [preservation checks](letter-autoplay/preservation.log).

Wrong answers still play the tapped word, pause for 200 ms, and play one random retry clip. They never play the letter name, letter sound, or correct word. Hints remain absent. A new tap cancels active speech and queued clips, and mute suppresses all speech. No clips, audio mappings, styles, or visual effects changed.

The offline manifest was regenerated with `python3 scripts/build-offline-manifest.py`. Its version changed from `75e9b578998091b5` to `15e87cc24c836db0`, with the same 150 asset paths. Regeneration produces identical output.

## Verification

The updated runtime assertion first failed against the starting code because letter entry produced no clips. The [failure log](letter-autoplay/regression-before.log) records the missing A name and sound. After the fix, [all 234 rounds passed](letter-autoplay/runtime.log), covering A-Z and all themes in every layout. These runtime tests stub browser APIs and do not measure playback timing.

The [browser audio checks](letter-autoplay/audio-rules.log) passed all 18 combinations of layout, viewport, and online or offline mode. Viewports were 1024x576, 768x1024 portrait tablet, and 1920x1080. Portrait also exercised reduced motion. The checks use the real application, real MP3 playback events, guest sessions, and the installed offline cache. They verify:

- Automatic letter name followed by letter sound on entry, Listen-back navigation, and "Another sound".
- Silent match entry and sound-only playback from the match speaker.
- Three wrong taps producing the tapped words and all three random retry clips, with the original pause and no hints.
- Correct-answer cheer without automatic word playback, explicit word replay, and interruption of a playing cheer.
- Mute on letter entry, Listen-back navigation, and celebration.
- Leaving during automatic letter-name playback stops it and cancels the queued letter sound.
- No speech overlap, media errors, page errors, or horizontal overflow.

The test taps animated answer and replay controls without waiting for animation stability when checking audio interruption. It still sends browser mouse events and leaves application animations and MP3 durations intact. A separate regular-user fixture check confirms that completing a round in each layout records progress. [Machine-readable results](letter-autoplay/audio-rules.json) include all cases and the fixture result.

All [six strict static checks](letter-autoplay/static.log) passed, including approved clip hashes and the complete voice inventory. JavaScript syntax checks and `git diff --check` also passed. Screenshots of Listen and celebration screens for every layout and size, online and offline, are under [letter-autoplay/](letter-autoplay/).

Rerun the checks from the repository root:

```sh
node tests/runtime_smoke.cjs
python3 tests/run_tests.py
CELEBRATE_REPORT_DIR=reports/letter-autoplay node tests/celebrate_audio_rules.cjs
CELEBRATE_BASELINE_REF=4a9067c CELEBRATE_REPORT_DIR=reports/letter-autoplay/timing node tests/celebrate_delay.cjs
```

## Cheer timing

The cheer remains immediate in the application. In the 45 new-build samples, the request occurred 0.2-0.4 ms after the captured correct tap. Native playback had a median of 18.7 ms and a range of 8.0-63.4 ms. Forty-four samples were below 30 ms. One Letter Post sample at 1024x576 took 63.4 ms, above the approximate 50 ms target; that sample is retained in the results.

A focused follow-up repeated that layout and size with five alternating samples per side. All five new-build samples started in 17.5-19.8 ms, with a median of 18.8 ms. Local MP3 responses took 2.7-3.7 ms in that follow-up. The initial baseline also had startup outliers of 72.5-100.1 ms. The immediate requests, unchanged answer handler, and follow-up are consistent with browser media startup variation rather than a new application wait. The original outlier's individual browser startup cause was not traced.

The table shows median [minimum-maximum] milliseconds from the capture-phase correct click to the real MP3 `playing` event. There are five alternating samples per side for each cell, 90 runs total. "Before" uses the app source from `4a9067c`. Both sides use guest play, normal motion, fresh browser contexts with service workers blocked, and unchanged MP3 files from the same local server. Layouts run concurrently. All runs reached native playback with only the cheer after the correct tap, without page or media errors.

| Layout | Viewport | At 4a9067c, ms | Restored letter autoplay, ms |
|---|---|---:|---:|
| Letter Post | 1024x576 | 19.5 [13.8-19.9] | 19.1 [18.6-63.4] |
| Letter Post | 768x1024 | 19.2 [18.8-22.3] | 18.4 [17.4-20.8] |
| Letter Post | 1920x1080 | 22.4 [14.7-78.6] | 18.3 [17.6-19.2] |
| Moonboat | 1024x576 | 20.2 [18.1-72.5] | 20.1 [17.2-21.3] |
| Moonboat | 768x1024 | 19.2 [18.7-22.4] | 19.1 [18.1-29.3] |
| Moonboat | 1920x1080 | 21.8 [20.4-100.1] | 16.5 [8.0-20.9] |
| Ribbon Road | 1024x576 | 22.2 [19.1-23.8] | 19.4 [16.8-20.5] |
| Ribbon Road | 768x1024 | 19.9 [15.0-22.1] | 18.0 [11.9-19.6] |
| Ribbon Road | 1920x1080 | 19.3 [13.3-29.1] | 18.8 [16.2-26.2] |

The initial host load was 1.00 across eight cores. These are local headless Chrome measurements, not physical speaker or remote network guarantees. The test measures actual playback startup, not just a `play()` call. No audio preloading, clip edits, or correct-answer changes were introduced.

Evidence: [90-run measurements](letter-autoplay/timing/timings.json), [timing log](letter-autoplay/timings.log), [focused follow-up](letter-autoplay/timing-followup/timings.json), [follow-up log](letter-autoplay/timing-followup.log), and [environment and measurement claim](letter-autoplay/measurement-environment.log).

Rerun the focused follow-up with:

```sh
CELEBRATE_LAYOUT=v1-letter-post CELEBRATE_WIDTH=1024 CELEBRATE_BASELINE_REF=4a9067c CELEBRATE_REPORT_DIR=reports/letter-autoplay/timing-followup node tests/celebrate_delay.cjs
```

## Account protection and rollback

Work stayed on `codex/home-flow-ribbon`. Before application edits, `rollback/pre-letter-autoplay-2026-10-22-codex` was created and pushed at starting HEAD `4a9067c09fe5755e336b52c9aaba5faf32b9dc76`. The remote rollback reference was verified at that commit.

No database or live account operations were performed. Guest contexts blocked external requests, and saved-progress checks used an in-memory backend. No test signed in as, inspected, or changed the real master administrator account. No pre-existing account was deleted or restored. Bradley's test deletions, passwords, settings, and progress were left alone. No Supabase migration or deployment was run.
