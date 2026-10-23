# Letters with Lucy catch-up

Rollback: `rollback/pre-catchup-2026-10-21-cursor` at `e911030c4af819bd1f99eeeee0a614d0cad7145e` (Swap the three wrong-answer clips). Local HEAD, `origin/cursor/home-flow-ribbon`, and that rollback ref all matched it before this build. No migration. Supabase project `shkmpxaejiuqzejsdwyr` only. No pull request.

## TL;DR

Letter Post and Moonboat now page six letters at a time and fit 1024×576 and 1366×768 without scrolling. A correct answer puts the same green done mark on that letter in all three games for the signed-in player. Wrong taps say only the tapped word, wait about 200ms, then one random retry clip. The celebrate clip starts on the correct tap.

Clarification for C3, C4, C5, and E: “never auto-play the letter name, the letter sound, or the correct word” is only for wrong answers and hints. It does not silence the letter page. Tapping a letter, including the ◀ Listen back button, still opens the page and Lucy says the letter name and the letter sound on her own, in all three layouts. Find the picture does not replay that. This build had not silenced the letter page. The listen-back path was already `voice(letterAudio())`. Tests now lock both that path and the silent Find the picture step.

## Preview

Always-latest on `cursor/home-flow-ribbon`:

- Home: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/index.html
- Letter Post: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/v1-letter-post/index.html
- Moonboat: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/v3-moonboat/index.html
- Ribbon Road: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/v4-silk-thread/index.html
- Grown-ups: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/grown-ups/index.html
- My account: https://raw.githack.com/TeslaWarpDrive/childrens-learning-game/cursor/home-flow-ribbon/grown-ups/account.html

## Status

| Item | Status | What changed |
| --- | --- | --- |
| A | Done | Letter Post and Moonboat show six letters per page, with Previous, Next, and “Page N of M”. The title stays up top. 1024×576 and 1366×768 do not scroll. Returning from a letter reopens that letter’s page. A short Stamps or Stars summary opens the full collection. Ribbon Road’s road is unchanged. |
| B | Done | Done is a 36px green circle (`#176b3a`), white tick, white rim, upper right. At 1600px and wider it is 52px, except Ribbon Road’s narrow collection slots, which use 40px so the mark does not cover the letter or the next slot. Caption is Done. Cards stay bright. One 220ms settle the first time the child is back on the grid after a new completion. Calm mode and reduced motion skip it. Saved letters do not animate. The mark is not a button. |
| C1 | Done | Offline cache is `little-woof-shell-4`. Activating it deletes older caches, including a planted `little-woof-shell-3`. The page is marked `catchup-4`. A controller that is already installed reloads once. |
| C2 | Done | A grown-up’s picture opens Kids (the portal) and My account. A child’s picture opens sign-out only, with no portal link. `accounts-manage` still returns 403 when the role is child or empty. That function was not edited. |
| C3 | Done | Opening a letter speaks the letter name and then the letter sound. ◀ Listen does the same again. Find the picture does not replay either. Hear the letter again still works. See the clarification above. |
| C4 | Done | A wrong tap speaks the tapped picture’s word, waits 200ms, then one of the three approved clips chosen with `Math.random()` each time. A new tap cuts the word, the pause, and the clip. The three clips were not re-encoded. |
| C5 | Done | No hint outline, no “Try this picture”, and no grown-up control that turns hints on. A stored `hintAfter` value still round-trips and is never read by the game. All three pictures stay after a miss. |
| C6 | Done | The picture button is 50px with a 42px image, in line with the 50px sound and theme controls. The theme control stays after the picture. |
| C7 | Done | The profile menu closes on another screen and on an outside tap. |
| C8 | Done | “Open for mail!” and the round Sound mail sticker are gone. Nothing was put in their place. |
| D | Done | A correct answer is the only thing written into progress. `doneLetters()` is the union of Letter Post, Moonboat, and Ribbon Road for that player. Guests stay visit-only and do not read or write an account. Signed-in copy says “saved” instead of “this visit”. A progress reset still clears every world. |
| E | Done | The cheer starts in the correct-tap turn, before the card settle and the celebrate page. Measured below. No new clips. Hear the word again still plays the correct word on purpose. Cheers and the three retry clips are preloaded and listed in the offline cache. |

## Celebrate delay

Chrome headless, autoplay allowed. Time from the pointer down on the correct picture to `Audio.play` of the cheer file. The viewport does not change the wait. Before, the correct tap also spoke “apple”, then the reward animation (about 4.4s) and a nod, and only then the cheer.

| Layout | 1024×576 before | 768×1024 before | 1920×1080 before | 1024×576 after | 768×1024 after | 1920×1080 after |
| --- | --- | --- | --- | --- | --- | --- |
| Letter Post | 6377ms | 6394ms | 6395ms | 1ms | 1ms | 1ms |
| Moonboat | 6396ms | 6396ms | 6396ms | 1ms | 1ms | 1ms |
| Ribbon Road | 6380ms | 6378ms | 6395ms | 1ms | 1ms | 1ms |

Before, the first file was `lucy-word-a-apple.mp3` and the cheer was `lucy-cheer-2.mp3`. After, the first file is the cheer. The 1ms figure is the gap from pointer down to `play()`, in the same click.

## Database

No. Saved progress already means a correct answer: `earn()` is the only writer, and the game calls it only after a correct tap. Opening a letter does not write a letter. Sharing the done mark is the union of the three existing per-game maps. The existing reset already clears all three. No new table. No old migration edited. No deploy.

## Master account

Read-only, before and after this build. Not signed in as Brandy. No account created, deleted, or restored.

| Check | Before | After |
| --- | --- | --- |
| Profiles | 20 | 20 |
| `is_master` rows | 0 | 0 |
| login or display name Brandy | 0 | 0 |
| Auth user named Brandy | absent | absent |

Brandy was not created. Bradley’s test deletes and settings were not undone.

## Test logins

No new login was created. The live scripts tried the existing test grown-up `ada@littlewoof.test`. `accounts-manage` answered 401 “signed out for safety” before any child was created. `call_list_live` stopped on that 401 (it expected 403 for a non-master creating a grown-up). `accounts_sync` stopped on the same 401. Neither script deleted anyone. That function was not changed in this build.

## Tests

Passed:

- `tests/run_tests.py` 6/6, including the wiring guard that hints cannot play and the letter page still uses `voice(letterAudio())`
- `node tests/runtime_smoke.cjs` for all three layouts, including ◀ Listen speaking the name and the sound, and Find the picture adding no clip
- `node tests/grown_ups_runtime.cjs`, `risky_actions.cjs`, `accounts_merge.cjs`, `accounts_session.cjs`
- `node tests/catchup.cjs`: 1024×576 and 1366×768 fit in every theme, wrong tap is the tapped word plus one retry clip, cheer under 250ms, cache `little-woof-shell-4` replaces `little-woof-shell-3`
- Browser: `browser_smoke` 18, `motion_smoke` 12, `silk_smoke` including A–Z, `confetti_smoke` 18, `home_flow`, `grown_ups_smoke`, `portal_rules`

Not passed, and not caused by this diff: `call_list_live` and `accounts_sync`, both 401 from `accounts-manage` before creating a person.

## Screenshots

Files are in `/cursor/stores/self/media/catchup/`.

- Before, from `e911030`: `before-{post,space,silk}-1024x576-theme{0,1,2}.png`, plus Letter Post and Moonboat at 1366×768, 768×1024, and 1920×1080 in theme 0. The old Letter Post home at 1024×576 still shows “Open for mail!” and the letters sit below the fold.
- After: `after-{post,space,silk}-{1024x576,1366x768,768x1024,1920x1080}-theme{0,1,2}.png`
- Done marks: `after-badge-{post,space,silk}-theme{0,1,2}.png` at 1024×576, scrolled to the finished letter

## Notes

The done mark uses the green and white from the job, and the existing short ease already in the game styles. No new Lucy pictures and no new clips. `v4-silk-thread/config.js` is unchanged, so Ribbon Road’s road is the same. Letter Post and Moonboat still share one `app.js` and one `fun.js`.
