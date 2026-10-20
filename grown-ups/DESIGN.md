# Grown-ups' corner: design notes

**Design read:** a quiet back office behind Lucy's post office. It's a settings room
for any adult (teacher, parent, carer, childminder) and is used on tablets,
Chromebooks and interactive whiteboards, so it needs big touch targets, readable
type from across a room, and no hover-only actions. It keeps the chooser's paper
and ink colors, Nunito type and postal motifs, but turns everything down: one
accent, hairline rules, numbered sections, and none of the child UI's bounce.

Everything lives in `grown-ups/`. It works from `file://` and offline, and loads
no network resources.

## 1. Layout (Superdesign workflow, step 1)

Settings:

```
┌───────────────────────────────────────────────────────────────┐
│ ░░ band ░░  Grown-ups' corner          [Lock and go to games →]│
├──────────────┬────────────────────────────────────────────────┤
│ 01 Sound     │ 01  SOUND ─────────────────────────────────────│
│ 02 Letters   │ Lucy's voice ............................ [●○] │
│ 03 Help      │ Voice volume  [━━━━━━●────] 80 %  [Play sample]│
│ 04 Motion    │ Sound effects ........................... [●○] │
│ 05 Worlds    │ 02  LETTERS ───────────────────────────────────│
│ 06 About     │ [All 26] [Starter s a t p i n] [Vowels]        │
│              │ A B C D E F G … (26 × 60px toggles)            │
│ (sticky)     │ 03  HELP  (After 1 miss | After 2 | Don't)     │
│              │ 04  MOTION   Calm motion ................ [●○] │
│              │ 05  WORLDS & BUTTONS   3 world switches, kids' │
│              │     buttons switch                             │
│              │ 06  ABOUT THE GAME   short notes               │
│              │ [Reset all settings]            (SAVED stamp)  │
└──────────────┴────────────────────────────────────────────────┘
 Under 960px the index column hides and sections stack.
```

## 2. Theme (step 2)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#faf2df` | `#14233a` | page |
| `--sheet` | `#fffaf0` | `#1c2f4a` | rows, keys |
| `--ink` | `#253f65` | `#fff3d8` | text, on-state fills |
| `--muted` | `#536078` | `#c5d4de` | help text (5.7:1 / 8.9:1) |
| `--accent` | `#b8392c` | `#ffa58f` | one action, switch on-state |
| `--focus` | `#007a95` | `#83e4ee` | 4px focus ring |
| `--line` | ink at 18% | ink at 18% | hairlines |

Type: Nunito Sans Black for the display and headings, Bold for body text,
Comfortaa for the section numbers `01–06`. Labels are uppercase with
0.14em letter-spacing. Body text is 18–20px (larger on whiteboards), with a
line length of 60ch or less.

Background: Paper Shaders' *static mesh gradient* (ported to one WebGL2
draw call and rendered once, with no animation loop). It blends the three
worlds' colors (sky, candy pink, butter) with grain, so the band looks like
risograph paper. If WebGL is unavailable, the band falls back to a CSS
gradient.

## 3. Motion (step 3)

| Moment | Spec | Source |
| --- | --- | --- |
| Open settings | translateY 16px + opacity, 400ms `cubic-bezier(.22,1,.36,1)` | Better Design `panel-reveal` (no blur on large surfaces, per taste-motion) |
| Digit fills a slot | 8px pop-in, 300ms `cubic-bezier(.34,1.45,.64,1)` | Better Design `number-pop-in` |
| Wrong code | 480ms side wiggle, same curve as the game's wrong-card wiggle | game |
| Switch thumb | 200ms `cubic-bezier(.4,0,.2,1)` | Better Design `switch` |
| Help selector | sliding pill under the checked option, 300ms emphasized | motion-primitives `AnimatedBackground` |
| Reset dialog | opacity + scale .96→1, 200ms ease-out | motion-primitives `Dialog` |
| "Saved" | postmark stamp lands, 900ms, once per change | trickle `stamp` |
| Section rules | hairline draws left→right once, 600ms | trickle `underline-draw` |
| Lock button | fill expands out of the arrow circle on hover/focus/press, 450ms | Hyperiux `arrow-fill-button` |

The page has no loops. `prefers-reduced-motion` and the corner's own *Calm
motion* setting both remove all of it.

## 4. Account protection

Hosted settings require an authenticated grown-up account. There is no reading gate, PIN, or keypad. Local-file settings open directly. A Grown-up portal link returns to account management without reusing the selected child’s settings route.
