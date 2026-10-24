# Fade pictures round 2

Completed on 2026-10-24 on `codex/fade-pictures`, following `FADE-PICTURES-V2-JOB.md` and the approved `reports/fade2-repeat-back.md`.

The output contains 52 lossless 512 × 512 RGBA WebPs, with 26 pictures for each game. Every picture retains a visible band of its original ElevenLabs background. The fade uses one centered geometric alpha mask per game. No mask uses object detection, segmentation, rembg, luminance, or picture-specific geometry.

## Picture processing

The only picture sources read were the 52 original PNGs at `/workspace/lwl-pictures/elevenlabs/full/{moonboat,ribbon-road}/<word>.png`. `word-pictures-fade-v2/manifest.json` records source and output SHA-256 hashes.

Both masks center on pixel coordinates `255.5, 255.5`. Both use a cubic smoothstep transition with zero slope at either end of the fade.

| Game | Geometry | Original picture placement | Fade |
| --- | --- | --- | --- |
| Moonboat | Circular radial mask | Entire original resized to 420 × 420, centered with 46px on each side | Fully opaque through radius 218px, transparent at radius 254px |
| Ribbon Road | Rounded square with outer half-size 254px and corner radius 73.728px | Entire original resized to 512 × 512 | Fully opaque 30px inside the rounded boundary, then fades outward to zero |

Moonboat uses the same centered reduction for all 26 pictures. This keeps the wide animals and tall subjects inside the opaque circle. Its 46px outer padding repeats the original image's outermost background pixels. This preserves a continuous color boundary without cropping or moving the subject. Only the outer radial band fades.

Ribbon Road's corner radius uses the ratio `36 / 250` from `v4-silk-thread/style.css`, `.silk .choice`, scaled to the 512px picture. The source retains its full square bounds. There are no per-picture size adjustments in either game.

## Preview and checks

[Open the preview](../word-pictures-fade-v2/index.html). It retains round 1's layout, theme colors, card mocks, word order, and circle examples. Each game has all 26 pictures on each of its three themes, for 156 answer cards and 12 Moonboat letter-page circles. All asset paths are relative. The preview makes no external requests.

`check-images.py` passed for all 52 decoded WebPs. It checks dimensions, RGBA mode, exact equality to the fixed alpha mask, horizontal and vertical symmetry, diagonal symmetry, fully transparent image borders, more than 200 alpha levels, and exact source-derived RGB values wherever alpha is nonzero. It also checks output hashes against the manifest.

Headless Chrome 156.0.8078.47 rendered all six sections at a 1440px viewport. All 168 images loaded at their expected natural width. There were no browser errors, failed requests, or external requests. A 390px viewport check found no horizontal overflow. [Browser results](../word-pictures-fade-v2/checks/browser.json).

I visually inspected every card in all six browser screenshots, comparing subjects with contact sheets made directly from the permitted originals. The original background remains visible around each subject. The geometric fade is centered and symmetric. No subject is visibly clipped or cut by the fade, and no hard square image edge appears. Moonboat's goat, fox, yak, zebra, kite tail, and umbrella remain complete.

| Theme | Visible background band | Centered symmetric fade | No hard square edge or clipped subject | Browser screenshot |
| --- | --- | --- | --- | --- |
| Ribbon Road Pink | Pass | Pass | Pass | [Pink](../word-pictures-fade-v2/checks/ribbon-road-0.png) |
| Ribbon Road Purple | Pass | Pass | Pass | [Purple](../word-pictures-fade-v2/checks/ribbon-road-1.png) |
| Ribbon Road Yellow | Pass | Pass | Pass | [Yellow](../word-pictures-fade-v2/checks/ribbon-road-2.png) |
| Moonboat Dark | Pass | Pass | Pass | [Dark](../word-pictures-fade-v2/checks/moonboat-0.png) |
| Moonboat Cloud day | Pass | Pass | Pass | [Cloud day](../word-pictures-fade-v2/checks/moonboat-1.png) |
| Moonboat Plum dusk | Pass | Pass | Pass | [Plum dusk](../word-pictures-fade-v2/checks/moonboat-2.png) |

The pixel check proves mask symmetry and source color preservation. Subject completeness and the visible background band were also checked visually against the actual rendered cards.

## Reproduction

Run from the repository root with Python 3, Pillow, and NumPy installed:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 word-pictures-fade-v2/generate.py
PYTHONDONTWRITEBYTECODE=1 python3 word-pictures-fade-v2/build-preview.py
PYTHONDONTWRITEBYTECODE=1 python3 word-pictures-fade-v2/check-images.py
```

The browser check needs `playwright-core` and `/usr/bin/google-chrome`. This run installed the browser driver outside the repository, in `/tmp/fade2-browser`:

```sh
NODE_PATH=/tmp/fade2-browser/node_modules node word-pictures-fade-v2/check-preview.cjs
```

## Scope

The commit contains only `word-pictures-fade-v2/` and this report. Round 1 in `word-pictures-fade/` remains unchanged. No game code, game pictures, service worker, or tests changed. No branch switch, deployment, live-site access, Pi access, Supabase access, database change, or account operation occurred. The master administrator account was left completely alone, with no sign-in or other access.
