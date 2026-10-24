# Fade pictures

Created `codex/fade-pictures` from `codex/home-flow-ribbon` at `b0ef6de7c3931077f27de97da1f8cf9bb023e43a`.

`word-pictures-fade/` contains 52 transparent, 512×512 lossless WebPs, the standalone preview, reproduction scripts, and verification evidence. Sources were exclusively the existing game WebPs. The fade changes alpha, preserves source RGB pixels, and keeps the original frame. Ribbon Road uses a broad rounded feather. Moonboat also fades its navy atmosphere, with protection for purple subject shading.

The preview shows all 26 pictures per game on each applicable theme: Pink, Purple, Yellow, Dark, Cloud day, and Plum dusk. Theme declarations come directly from the game stylesheets. It reproduces rounded answer cards, Moonboat pill cards with the three answer-slot colors, and 12 Moonboat circle examples. All image paths are relative. Fonts use the local system sans-serif fallback.

Ran `check-images.py` and rendered the final preview with headless Chromium through `check-preview.cjs`. All 52 files matched the fade recipe and original RGB pixels, with lossless encoding and transparent borders. All 168 image instances loaded across 156 answer cards and 12 circles. There were no browser errors or horizontal overflow at 390px. I visually inspected every theme screenshot, all pictured subjects, the circle examples, and both mobile card screenshots. The hard square edges are gone. Moonboat retains a soft blue glow near some subjects; its fine white web remains delicate on light cards. Evidence is in `word-pictures-fade/checks/`, and reproduction commands are in its README.

Changes are confined to `word-pictures-fade/` and this report. The base branch, game files, service worker, and tests remain unchanged. No paid API, prohibited source folder, deployment, live site, Pi, Supabase, database, or account access was used. The Brandy account was left completely alone.
