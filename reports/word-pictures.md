# Word pictures

Completed on 2026-10-23 on `codex/word-pictures`, cut from `codex/home-flow-ribbon` at `ea2d8a52b7d115da929568f8b26cabdf709e139c`.

[Open the preview](https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/refs/heads/codex/word-pictures/word-pictures/index.html).

## Artwork

The collection contains nine original SVG illustrations, each with a 320 × 320 viewBox and transparent outer canvas.

| Layout | Files in `word-pictures/` | Treatment |
| --- | --- | --- |
| Letter Post | `letter-post/apple.svg`, `letter-post/kite.svg`, `letter-post/van.svg` | Cream stamp paper, navy contours, red and air-mail blue, paper grain, and printed hatching. |
| Moonboat | `moonboat/moon.svg`, `moonboat/octopus.svg`, `moonboat/fox.svg` | Cream moonlight, peach and periwinkle shading, plum outlines, and tiny gold stars. The octopus has eight arms. |
| Ribbon Road | `ribbon-road/rabbit.svg`, `ribbon-road/umbrella.svg`, `ribbon-road/ball.svg` | Rounded toy forms, glossy highlights, pink, turquoise, yellow, and plum contours. The rabbit and umbrella have bow accents. |

I authored the vector paths directly. No image APIs, paid services, or ElevenLabs tools were used. Each picture has one central subject. The artwork contains no visible text, letters, numbers, or Lucy character. SVG titles provide accessible word names without drawing text.

The palette sources were `v1-letter-post/style.css`, `v3-moonboat/style.css`, and `v4-silk-thread/style.css` on the approved base branch. These files were read only. The preview calls the v4 collection Ribbon Road, as requested.

## Preview and checks

`word-pictures/index.html` groups the pictures by layout, with word labels outside the SVGs. Each group uses its default background and shows the same three pictures in two smaller alternate-theme strips. All asset references are relative. The preview has no JavaScript, external fonts, network dependencies, or game integration.

The preview uses these background colors from the layout stylesheets:

| Layout | Default | Alternate 1 | Alternate 2 |
| --- | --- | --- | --- |
| Letter Post | `#faf2df` | `#f9dfed` | `#182b43` |
| Moonboat | `#191d39` | `#e7edf3` | `#30223e` |
| Ribbon Road | `#ffd2eb` | `#e3d4ff` | `#fff1a6` |

I inspected the full-page [desktop screenshot](../word-pictures/preview-checks/desktop.png) and [phone screenshot](../word-pictures/preview-checks/mobile.png). All nine subjects remain visible at the smaller sizes. Moonboat's plum contours keep the cream moon and pale highlights readable on Cloud day. The alternate-theme strips show no obvious color clashes.

`python3 word-pictures/verify.py` passed in Chrome at viewport widths of 1440 and 390 pixels. It checked all nine SVGs, loaded all 27 preview image instances, confirmed three collections and six alternate strips, and found no horizontal overflow or external resource requests. It also checked that the SVGs contain no text elements, scripts, embedded raster images, or external references. The script requires Chrome or Chromium and Python's `websocket-client` package. Results are in [checks.json](../word-pictures/preview-checks/checks.json).

The githack HTML, CSS, and all nine SVGs were fetched after the artwork push. Each returned HTTP 200 and matched the local file bytes. Results are in [remote-checks.json](../word-pictures/preview-checks/remote-checks.json). The screenshot checks used local files. No account sign-in was needed.

`python3 word-pictures/build.py` rebuilds the artwork and HTML using only Python's standard library. `preview.css` holds the preview styling.

## Delivery and scope

The artwork commit is `31e3888`. It was pushed before this report was written. The report and remote verification record are included in the following commit on the same branch.

The complete diff from the base branch is confined to `word-pictures/` and this report. No game files changed. No database or Supabase actions, deployments, or Brandy account access occurred. No other lane's work or output was inspected. The configured Git remote redirected the push to `TeslaWarpDrive/childrens-learning-game`; its configuration was left unchanged.

The checkout is returned to `codex/home-flow-ribbon` after the final push. That branch receives no commits or merges from this job. The artwork and this report remain on `codex/word-pictures`.
