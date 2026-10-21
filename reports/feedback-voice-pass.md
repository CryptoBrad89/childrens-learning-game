# Lucy feedback voice pass

The three wrong-answer files now use new, untagged Lucy generations. The filenames and handler are unchanged. All work is on `codex/home-flow-ribbon`. No Supabase requests or live account operations were made.

Eighteen takes cost **248 ElevenLabs credits**, including rejected takes. The original three or four takes per line did not produce suitable matches, so generation continued within the cap. Lucy voice `FgiNpTIapnCbaD6xiqIo`, model `eleven_v4`, and creative speech defaults were used throughout. No pitch shifting or tempo adjustment was applied.

Implementation commit: [`2856ffcb312bcef5dfed9c193f0db5c515a41794`](https://github.com/CryptoBrad89/childrens-learning-game/commit/2856ffcb312bcef5dfed9c193f0db5c515a41794). The following documentation commit records these results; both commits are pushed to `codex/home-flow-ribbon`.

## Before and after

Both medians below use the same Praat estimator. The reliable-frame column excludes estimates with correlation strength below 0.6. The all-voiced column includes every nonzero estimate.

| File | Before, reliable Hz | After, reliable Hz | Before, all voiced Hz | After, all voiced Hz | After voiced frames, reliable/all | Duration |
| --- | --- | --- | --- | --- | --- | --- |
| `lucy-uh-oh.mp3` | 198.2 | 266.9 | 198.3 | 268.8 | 49/55 | 0.84 s |
| `lucy-try-again.mp3` | 214.4 | 272.6 | 207.7 | 254.2 | 66/72 | 1.12 s |
| `lucy-oops-try-again.mp3` | 209.9 | 305.3 | 209.9 | 306.9 | 70/77 | 2.08 s |

The reliable-frame medians fall within the approximate 265–310 Hz target. This is an estimator-dependent result: the unfiltered `Try again` median is 254.2 Hz. It is an improvement over 207.7 Hz, but remains below that range. The available measurements do not establish a human judgment that the voices sound identical. Selection used pitch, spectral brightness, phrase duration, and transcript checks. No human listening approval is claimed.

The kept brightness estimates are 1038.0, 1023.5, and 1514.2 Hz in file order. Brightness here means median power-spectral centroid of active frames, not pitch. Different vowels and consonants change this value. The short exclamation takes of `Try again!` had both higher pitch and higher centroids, while the short `Uh-oh!` takes stayed low and duller by this measure.

## Reference clips

The reference set includes four letter names, three letter sounds, and all 20 files in `audio/words/`. All measurements use the same settings as the candidates. The broader word set and the letter sounds show why the target is approximate rather than a property of every approved clip. Some existing clips are well above or below it; the supplied 265–310 Hz range remains the selection target for this pass.

| Existing file | Reliable median Hz | All-voiced median Hz | Reliable/all voiced frames | Brightness Hz |
| --- | --- | --- | --- | --- |
| `audio/letters/a-name-trim.mp3` | 261.9 | 307.8 | 42/44 | 777.5 |
| `audio/letters/b-name-trim.mp3` | 284.5 | 278.2 | 40/45 | 1017.9 |
| `audio/letters/e-name-trim.mp3` | 306.5 | 287.6 | 28/34 | 1110.5 |
| `audio/letters/m-name-trim.mp3` | 267.2 | 267.2 | 41/43 | 1407.0 |
| `audio/letters/a-sound-trim.mp3` | 258.3 | 257.7 | 16/17 | 1527.7 |
| `audio/letters/e-sound-trim.mp3` | 349.1 | 342.7 | 26/27 | 1275.1 |
| `audio/letters/m-sound-trim.mp3` | 235.8 | 235.8 | 63/63 | 352.4 |
| `audio/words/word-ball.mp3` | 307.9 | 307.9 | 58/58 | 827.4 |
| `audio/words/word-cat.mp3` | 470.9 | 477.0 | 19/22 | 1672.8 |
| `audio/words/word-duck.mp3` | 513.4 | 527.4 | 15/17 | 1497.0 |
| `audio/words/word-egg.mp3` | 318.3 | 318.4 | 43/46 | 1454.3 |
| `audio/words/word-fish.mp3` | 444.3 | 451.9 | 18/21 | 3042.3 |
| `audio/words/word-fox.mp3` | 446.7 | 443.1 | 14/17 | 1364.7 |
| `audio/words/word-goat.mp3` | 482.7 | 457.9 | 27/30 | 1419.1 |
| `audio/words/word-hat.mp3` | 367.2 | 364.4 | 8/10 | 1698.4 |
| `audio/words/word-jellyfish.mp3` | 444.1 | 439.1 | 58/59 | 1173.3 |
| `audio/words/word-kite.mp3` | 512.1 | 507.9 | 17/21 | 2252.3 |
| `audio/words/word-leaf.mp3` | 329.4 | 317.8 | 32/38 | 971.6 |
| `audio/words/word-nest.mp3` | 292.4 | 292.4 | 30/30 | 1395.5 |
| `audio/words/word-octopus.mp3` | 309.7 | 308.3 | 46/47 | 856.0 |
| `audio/words/word-quilt.mp3` | 414.1 | 418.9 | 20/25 | 817.5 |
| `audio/words/word-rabbit.mp3` | 355.7 | 358.3 | 47/49 | 832.1 |
| `audio/words/word-umbrella.mp3` | 388.8 | 387.0 | 82/86 | 961.9 |
| `audio/words/word-van.mp3` | 305.7 | 304.9 | 49/50 | 1351.0 |
| `audio/words/word-web.mp3` | 287.8 | 285.5 | 48/54 | 1396.1 |
| `audio/words/word-yak.mp3` | 251.3 | 251.3 | 16/16 | 1599.4 |
| `audio/words/word-zebra.mp3` | 247.0 | 247.0 | 70/78 | 772.0 |

## All takes and selection

Take numbers are per line. Carrier rows measure only the trimmed feedback phrase, excluding the carrier. Every prompt is literal spoken text with no delivery or emotion tag. Generation IDs identify the stored ElevenLabs assets.

| Line/take | Prompt | Generation ID | Credits | Reliable Hz | All voiced Hz | Brightness Hz | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| u1 | `Uh-oh!` | `ZV1PPi6fQ9pAgaPWrGBo` | 6 | 201.8 | 202.8 | 646.1 | Rejected; lower median than target and kept take. |
| u2 | `Uh-oh!` | `TgcWwXps0QRVXwn36dhS` | 6 | 201.5 | 201.7 | 804.9 | Rejected; lower median than target and kept take. |
| u3 | `Uh-oh!` | `Hq5w9qSGZIp6kNvRxXnW` | 6 | 203.9 | 204.5 | 732.0 | Rejected; lower median than target and kept take. |
| u4 | `The words are "Uh-oh!"` | `JVVBml1ws6SUb0Rg0TNX` | 22 | 336.2 | 336.9 | 1023.5 | Rejected; higher median than target and kept take. |
| u5 | `Uh oh.` | `v1yt9RlzBBqHmeSAGw6d` | 6 | 199.8 | 199.9 | 653.6 | Rejected; lower median than target and kept take. |
| u6 | `The word is "Uh-oh."` | `Lw3dqK6Hi4ThYuZl2KmT` | 20 | 266.9 | 268.8 | 1038.0 | Kept; closest combined pitch and spectral match for this line. |
| t1 | `Try again!` | `skEecxkhS17glk1C26QS` | 10 | 404.8 | 404.8 | 1587.0 | Rejected; higher median than target and kept take. |
| t2 | `Try again!` | `4KTLa1cC2wO51hpduLli` | 10 | 420.1 | 402.6 | 1673.8 | Rejected; higher median than target and kept take. |
| t3 | `Try again!` | `LR8RDlEaeKnl3OgxF98R` | 10 | 407.0 | 406.1 | 1773.5 | Rejected; higher median than target and kept take. |
| t4 | `The words are "Try again!"` | `vk77JmpZtp9C6g1nYbcd` | 26 | 394.8 | 388.9 | 1339.3 | Rejected; higher median than target and kept take. |
| t5 | `Try again.` | `iuKajBWpGWcGsMbG2Wer` | 10 | 261.2 | 253.4 | 1008.9 | Rejected; lower median than target and kept take. |
| t6 | `Try again.` | `fHxR8ND1RQjcLzX0nkK3` | 10 | 272.6 | 254.2 | 1023.5 | Kept; closest combined pitch and spectral match for this line. |
| t7 | `Try again?` | `A0ODF46E5cLkUG1aVVZq` | 10 | 329.1 | 323.0 | 1188.5 | Rejected; higher median than target and kept take. |
| o1 | `Oops, try again!` | `2Ob1pa3P4kMYIRBqVIUz` | 16 | 339.7 | 337.2 | 1744.0 | Rejected; higher median than target and kept take. |
| o2 | `Oops, try again!` | `CAl0F0fex4Z7cuNx6gys` | 16 | 341.4 | 340.6 | 1611.7 | Rejected; higher median than target and kept take. |
| o3 | `Oops, try again!` | `79Syi123ZcK94HLZST2U` | 16 | 352.3 | 350.0 | 1582.8 | Rejected; higher median than target and kept take. |
| o4 | `The words are "Oops, try again!"` | `hLQRbFpIkZkOS1vB5xj6` | 32 | 367.8 | 361.7 | 1762.7 | Rejected; higher median than target and kept take. |
| o5 | `Oops! Try again.` | `MfV3RTVlD0Xnofd5EcWt` | 16 | 305.3 | 306.9 | 1514.2 | Kept; closest combined pitch and spectral match for this line. |

`u`, `t`, and `o` mean Uh-oh, Try again, and Oops try again. The generation flow is `qf00rNe71dXtPbyboPhK`. No further generation was attempted after spend reached 248 credits.

## Trimming and phrase checks

The kept Uh-oh source was trimmed from 1.54 to 2.38 seconds. The carrier ends before a silence gap from about 1.093 to 1.597 seconds. The cut begins inside that gap, before the feedback onset. The final 0.84-second excerpt has a 15 ms fade-in and 30 ms fade-out and was encoded at 128 kbps. Both other kept files retain the downloaded MP3 bytes.

Rejected carrier windows were 1.44–2.34 seconds for u4, 1.43–2.56 seconds for t4, and 1.56–3.23 seconds for o4. Full-source medians were not used to select these excerpts.

Local Whisper base.en transcribed the kept files as "Uh-oh!", "Try again.", and "Oops, try again." The model received 0.5 seconds of silence on each side and no transcript hint. The carrier sentence is absent. Tiny.en did not transcribe the selected Try again take, so the larger base.en model checked all three kept clips. Transcription confirms words, not voice quality.

## Measurement method and limits

FFmpeg decodes each MP3 to mono, 16 kHz float64 samples. Praat autocorrelation through `praat-parselmouth` 0.4.7 uses a 10 ms step and 75–600 Hz search range. NumPy is 2.5.4. Silence and unvoiced frames are excluded. Reliable-frame results additionally require correlation strength at least 0.6. This filter was chosen after exploratory measurements showed sensitivity to weak periodicity; it was then applied to every old clip, reference, and candidate. The unfiltered results remain visible to avoid hiding that choice.

Estimator sensitivity is material. For the selected Try again take, unfiltered medians with 60–700, 75–600, and 100–500 Hz search ranges were 277.1, 254.2, and 267.3 Hz respectively. Within the 75–600 Hz run, correlation thresholds 0.6, 0.7, and 0.8 yielded 272.6, 283.0, and 299.8 Hz. A pYIN cross-check produced conflicting estimates, including a near-floor result on the reference octopus clip, so it did not determine selection. These short recordings do not support a precise perceptual equivalence claim.

The following code reproduces both reported medians and the brightness estimate for any supplied file. Use the same file bytes from the implementation commit for final clips. Before files are available from its parent commit; candidate originals are identified above in ElevenLabs. Rejected candidate bytes and analysis tools remain in `/tmp/lucy-feedback/` in this workspace, outside the shipped asset set.

```python
import json, subprocess, pathlib
import numpy as np
import parselmouth

def measure(path):
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f64le','-ac','1','-ar','16000','-'])
    y = np.frombuffer(raw, dtype='<f8')
    sound = parselmouth.Sound(y, sampling_frequency=16000)
    pitch = sound.to_pitch_ac(time_step=0.01, pitch_floor=75, pitch_ceiling=600)
    f = pitch.selected_array['frequency']
    voiced = f[(f > 0) & (pitch.selected_array['strength'] >= 0.6)]
    all_voiced = f[f > 0]
    frames = np.lib.stride_tricks.sliding_window_view(y, 640)[::160]
    energy = np.sum(frames**2, axis=1)
    active = frames[energy > energy.max()*0.01]
    spectrum = np.abs(np.fft.rfft(active*np.hanning(640)))**2
    freq = np.fft.rfftfreq(640, 1/16000)
    centroid = np.sum(spectrum*freq, axis=1)/np.maximum(spectrum.sum(axis=1),1e-20)
    return dict(median_hz=round(float(np.median(voiced)),1), unfiltered_median_hz=round(float(np.median(all_voiced)),1), p10_hz=round(float(np.percentile(voiced,10)),1), p90_hz=round(float(np.percentile(voiced,90)),1), voiced_frames=len(voiced), all_voiced_frames=len(all_voiced), duration_secs=round(len(y)/16000,3), brightness_hz=round(float(np.median(centroid)),1))

if __name__ == '__main__':
    import sys
    paths = [pathlib.Path(p) for p in sys.argv[1:]]
    print(json.dumps({str(p):measure(p) for p in paths}, indent=2))
```

## Cache and validation

`python3 scripts/build-offline-manifest.py` changed the content-derived version from `9fcdd52ea893fcd7` to `3123469b05cfd921`, retaining all 148 asset paths. The service worker uses that version in its cache name, installs the current files, and deletes older game caches on activation.

Validation passed:

| Command | Result |
| --- | --- |
| `python3 tests/run_tests.py` | 6/6 static groups; approved audio unchanged; all 94 inventory hashes match |
| `node tests/runtime_smoke.cjs` | Passed all game runtime rounds and audio sequencing assertions |
| `node tests/grown_ups_runtime.cjs` | Passed |
| `BROWSER_SMOKE_SHARD=N node tests/browser_smoke.cjs`, N = 0 through 5 | All six shards passed, 18 total journey cases |
| `node tests/motion_smoke.cjs` | 12 motion cases passed |
| `node tests/silk_smoke.cjs` | Ribbon Road and chooser passed |
| `node tests/confetti_smoke.cjs` | 18 confetti cases passed |
| `node tests/grown_ups_smoke.cjs` | Passed |
| `node tests/call_list_sounds.cjs` | Nine cases passed across grown-up, child, and guest sessions in all three worlds; native playback, clip cycling, mute, overlap prevention, and Escape cancellation |
| `node tests/call_list_offline.cjs` | Offline reload and all three feedback files passed |
| `node /tmp/lucy-feedback/cache-upgrade.cjs` | Original cached audio confirmed; service-worker update removed old cache; all three offline SHA-256 hashes matched replacement files |
| `git diff --check` and inventory comparison | Passed; only three inventory entries changed and all 148 cache paths are unchanged |

Browser commands used `NO_SCREENSHOTS=1 CHROMIUM_EXECUTABLE=/usr/bin/google-chrome`. Test logs and results are under `/tmp/lucy-feedback/`. A temporary Node preload redirected the sound suite's report output there to preserve the requested file scope. The initial unsharded browser run was stopped after two successful cases and replaced by the complete six-shard run. Its interrupted result is not counted as a pass.

The supplemental cache test served the previous manifest and original feedback bytes from a local server, confirmed the old Try again SHA-256, switched to the current files, called the registration's update method, waited for old-cache removal, disconnected the browser, and compared fetched hashes with the local replacement files. Its first attempts used async `waitForFunction` predicates that returned before the required cache state. The final test polls awaited `page.evaluate` results from Node and checks actual hashes; only that completed run is counted.

Only the three feedback MP3s, their source notes, `voice-manifest.json`, `sw-assets.js`, and this report belong to the change. The master administrator, Bradley's test changes, and all pre-existing live accounts remain untouched. Tests for this pass use local files or isolated browser fixtures, with no live account tests.
