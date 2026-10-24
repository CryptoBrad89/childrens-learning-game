# Faded word pictures

Open `index.html` to view all 52 pictures on the six game themes. The page uses relative image paths and has no external dependencies.

To rebuild the images, install Pillow and NumPy, then run these commands from the repository root:

```sh
python3 word-pictures-fade/generate.py
python3 word-pictures-fade/build-preview.py
python3 word-pictures-fade/check-images.py
```

The generator reads only the existing WebPs in `v3-moonboat/pictures/` and `v4-silk-thread/pictures/`. It preserves source RGB pixels and adjusts alpha. It does not crop the pictures. Moonboat also fades the blue atmosphere so its navy background does not form dark patches on light cards.

To render the preview with an installed Playwright package and Chromium:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node word-pictures-fade/check-preview.cjs
```

The browser check saves six theme screenshots, two mobile card screenshots, and `checks/browser.json`. The image check saves `checks/images.json` with source and output hashes. Inspect the screenshots after changes to judge subject visibility and the fades.

The preview copies theme declarations from the first three lines of each game's `style.css`. It reproduces answer-card shapes and sizes, including Moonboat's answer-slot colors and four circle examples per theme. Local system fonts keep the page self-contained.
