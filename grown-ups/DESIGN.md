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

Gate (first screen; the settings stay hidden until it is passed):

```
┌───────────────────────────────────────────────────────────────┐
│ ░░ static paper-shader band ░░░░░░░░░░░░░░░░░░░░░░░ (postmark) │
│ FOR GROWN-UPS                                                 │
│ Grown-ups' corner                                             │
├──────────────────────────────┬────────────────────────────────┤
│ A quick check that a         │   ┌────┐┌────┐┌────┐  slots    │
│ grown-up is here.            │   └────┘└────┘└────┘           │
│                              │   ┌────┬────┬────┐             │
│ Tap the numbers              │   │ 1  │ 2  │ 3  │  80px keys  │
│  seven · two · five          │   │ 4  │ 5  │ 6  │             │
│                              │   │ 7  │ 8  │ 9  │             │
│ Why the check? …             │   └────┴────┴────┘             │
│ [← Back to the games]        │   status line (aria-live)      │
└──────────────────────────────┴────────────────────────────────┘
 Phone: one column, keypad below the words.
```

Settings (after the gate):

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
| Gate → settings | translateY 16px + opacity, 400ms `cubic-bezier(.22,1,.36,1)` | Better Design `panel-reveal` (no blur on large surfaces, per taste-motion) |
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

## 4. Child gate

The gate is a reading check rather than a dexterity check. It shows three
different digits written as words ("seven, two, five"), and the adult taps them
on a 1–9 keypad. Three- and four-year-olds can't read number words yet. A random
tapper has a 1 in 504 chance per attempt, every miss brings a new set of
numbers, and every third miss pauses the keypad for 10 seconds. Easy runs like
1-2-3 or 9-8-7 are never asked. Physical number keys also work, for
Chromebooks. This is child-proofing, not security: settings are ordinary local
storage.

## 5. Real sign-in (accounts build)

**Design read** (design-taste §0): the same quiet back office, now with a front
desk. Grown-ups sign in once per visit on shared Chromebooks; on their own
phone they can stay signed in, and the reading gate from §4 becomes the
re-entry check. Same tokens as §2, one accent, no new colors except three
status dots (green saved, amber waiting, grey offline).

Sign-in (replaces the gate on first visit; Superdesign step 1, layout):

```
┌───────────────────────────────────────────────────────────────┐
│ ░░ static paper-shader band ░░░░░░░░░░░░░░░░░░░░░░░ (postmark) │
│ FOR GROWN-UPS  Grown-ups' corner              [Back to games →]│
├──────────────────────────────┬────────────────────────────────┤
│ Sign in, grown-ups.          │ ( Sign in | New account )  pill│
│ Settings, progress and       │ SIGN-IN NAME  [ms-lee        ] │
│ stickers belong to each      │ PASSWORD      [••••••  ][Show] │
│ child and follow them …      │ ●●●●○○  2 more                 │
│ (offline note when offline)  │ Stay signed in on this device ⊙│
│                              │ [ Sign in ]   status line       │
└──────────────────────────────┴────────────────────────────────┘
```

- Password rule shown as six dots that fill as you type (ui-layouts
  `pass-strength-dotted-indicator`, cut down to the owner's single rule: six
  characters; no strength meter, because strength rules are ruled out).
- Show/Hide toggle from ui-layouts `showhide-pass`, as a real button with
  `aria-pressed`.
- Sign in / New account uses the existing sliding pill (motion-primitives
  `AnimatedBackground`, same as the Help selector).
- Errors follow taste-ux-copy's what + why + fix, next to the form
  ("That sign-in name and password don't match. Check both and try again.").

## 6. Children, "Settings for", progress, sync

```
│ 01 CHILDREN ───────────────────────────────────────────────── │
│ ┌ CLASS · you own this ─────────────── Board code  PH77CA ──┐ │
│ │ Sunflower Class                       Invite code NC3U-3PQD│ │
│ │ (cat) Mia   mia-k4x  2 rounds · 2 letters · 1 sticker      │ │
│ │       [Settings][Password][Edit][Remove][Delete]           │ │
│ │ Grown-ups  Ms Lee (owner), Mr Patel                        │ │
│ │ [Add a child][Add a child who has an account][Print cards] │ │
│ └────────────────────────────────────────────────────────────┘ │
│ [New class] [New home] [Join with an invite code]             │
│ ┌ SETTINGS FOR [Everyone in Sunflower Class (24) ▾] ── sticky ┐│
│ │ Changes go to all 24 children. Shown: Ava's settings.      ││
│ 02 SOUND … 06 WORLDS & BUTTONS  (unchanged from §1)            │
│ 07 PROGRESS   per world: 26 letter squares, filled when played │
│               sticker shelf; a table for a whole class         │
│ 08 SYNC & THIS DEVICE  ● All saved · people on this device     │
│ 09 ABOUT                                                       │
```

- "Settings for" is a native `<select>` with optgroups per class/home
  (taste-accessibility: a native select beats a custom one), sticky so it is
  always clear whose settings are changing. Only the fields a grown-up
  touches are written, so editing a whole class never overwrites one child's
  other choices.
- Group cards are the one bordered surface (design-taste §5: depth from
  structure, hairlines inside). Codes are set in Comfortaa with wide tracking,
  like the section numbers, so they read as "type this".
- Pictures for children reuse the game's own word art (`art.js`) on six soft
  tones; nothing new is drawn for characters.
- Printed sign-in cards: one card per child (picture, name, sign-in name,
  board code) via print CSS; the password is never printed.

## 7. Motion added

| Moment | Spec | Source |
| --- | --- | --- |
| Password dot fills | scale 1 → 1.12, 220ms `--ease-pop` | Better Design `number-pop-in` (as the gate slots) |
| Sign in / New account | sliding pill, 300ms emphasized | motion-primitives `AnimatedBackground` |
| Form dialogs | opacity + scale .96 → 1, 200ms | motion-primitives `Dialog` (existing rule) |
| "Saved" | the postmark stamp from §3, once per change | trickle `stamp` |

No loops. Reduced motion and Calm motion remove all of it.
