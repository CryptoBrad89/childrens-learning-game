# Wrong-answer audio

These clips use Lucy, voice `FgiNpTIapnCbaD6xiqIo`, and ElevenLabs `eleven_v4` through `creative_generate_speech`. Generation used the tool defaults and plain prompts without delivery or emotion tags. The letter-generation metadata in `approved/clips.json` supplied the carrier-sentence approach.

| File | Generation prompt | Generation ID | Kept take | Duration | Median pitch, reliable frames | Median pitch, all voiced frames |
| --- | --- | --- | --- | --- | --- | --- |
| `lucy-uh-oh.mp3` | `The word is "Uh-oh."` | `Lw3dqK6Hi4ThYuZl2KmT` | 6 of 6 | 0.84 s | 266.9 Hz | 268.8 Hz |
| `lucy-try-again.mp3` | `Try again.` | `fHxR8ND1RQjcLzX0nkK3` | 6 of 7 | 1.12 s | 272.6 Hz | 254.2 Hz |
| `lucy-oops-try-again.mp3` | `Oops! Try again.` | `MfV3RTVlD0Xnofd5EcWt` | 5 of 5 | 2.08 s | 305.3 Hz | 306.9 Hz |

Flow: `qf00rNe71dXtPbyboPhK`. Eighteen takes cost 248 credits total, including rejected takes. The kept generations cost 20, 10, and 16 credits respectively. Additional takes beyond the planned three or four were needed because the first short prompts and exclamation carrier takes missed the target range.

`lucy-uh-oh.mp3` is the excerpt from 1.54 to 2.38 seconds of its full generation. FFmpeg removed the carrier sentence at the silence gap, applied a 15 ms fade-in and a 30 ms fade-out, and encoded 128 kbps MP3. No pitch or tempo shift was applied. The other two files are unchanged downloaded generation bytes. Hashes and complete kept-take metadata are in `voice-manifest.json`.

Pitch measurements decode each file to 16 kHz mono and use Praat autocorrelation through `praat-parselmouth` 0.4.7, with a 10 ms step and a 75–600 Hz search range. The reliable-frame median retains voiced frames with correlation strength at least 0.6. The all-voiced median keeps every nonzero pitch estimate. The same settings apply to references, old clips, and every candidate. `Try again` has greater estimator sensitivity than the other kept clips; its unfiltered median remains below the approximate 265–310 Hz target. Pitch and spectral measurements support the selection but do not establish a human listening judgment. Local Whisper base.en transcription confirms the intended phrases and absence of the carrier sentence.

The previous clips used `[gently]` and one take each. Their generation IDs were `LxzWnFPI8KG0NbuhllVx`, `sPRqdT5rMLwV6nfHJD7t`, and `q7enl15zmQTFJl1XrOmx`, in that file order. They cost 59 credits in the earlier job, excluded from this pass's 248-credit spend.

The existing handler still cycles through the same filenames and retains volume, mute, visibility, and route cancellation behavior. Rebuilding `sw-assets.js` changed the content-derived cache version from `9fcdd52ea893fcd7` to `3123469b05cfd921`. The service worker installs the new cache and removes the old cache on activation.

See `reports/feedback-voice-pass.md` for the reference measurements, all accepted and rejected takes, measurement code, validation, and implementation commit. No database changes or live account operations were performed.
