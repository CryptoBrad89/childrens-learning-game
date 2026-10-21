# Wrong-answer audio

These three clips use Lucy, voice `FgiNpTIapnCbaD6xiqIo`, with ElevenLabs `eleven_v4` through `creative_generate_speech`, matching the existing game voice pipeline. Each line had one take, with the speech tool's default settings and a `[gently]` delivery tag. No other voice or model was used.

| File | Spoken line | Duration | Generation |
| --- | --- | --- | --- |
| `lucy-uh-oh.mp3` | Uh-oh. | 1.36 s | `LxzWnFPI8KG0NbuhllVx` |
| `lucy-try-again.mp3` | Try again. | 1.44 s | `sPRqdT5rMLwV6nfHJD7t` |
| `lucy-oops-try-again.mp3` | Oops, try again. | 2.16 s | `q7enl15zmQTFJl1XrOmx` |

Flow: `ObIg2KwAqdvA9GosB4lL`. Total generation cost was 59 credits. The files are downloaded generation bytes; hashes and source prompts are recorded in `voice-manifest.json`.

The existing wrong-answer handler cycles through the three clips with a random starting position. It uses the existing `voice()` sequence, volume, mute, visibility, and route cancellation. Ribbon Road shares Letter Post's application script. The clips are cached for offline playback.
