# Front door and stickers: design notes

**Design read** (design-taste §0): the chooser's storybook paper for
three- and four-year-olds on shared Chromebooks, tablets and whiteboards, with
a grown-up usually helping. Pictures before words, one big target per person,
the same ink-outlined sticker cards and hard offset shadows as the world cards
(design-taste `playful-color`, which is what the chooser already is). No
emoji anywhere: avatars are the game's own word pictures, sticker marks are
drawn or typographic.

## Layout (Superdesign step 1)

"Who's playing?" sits between Lucy's hello and the world cards; the worlds
appear once someone is playing (or chooses "Play without saving").

```
┌──────────────────────────────────────────────────────────────┐
│ (Lucy)  CHILDREN'S LEARNING GAME                             │
│         Play with Lucy                                       │
│                    Who's playing?                            │
│                   Tap your picture.                          │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   people who played    │
│   │ (cat)│ │ (fox)│ │ (sun)│ │(duck)│   on this device;      │
│   │ Mia ●│ │ Leo  │ │ Ava  │ │ Sam  │   ● = play waiting     │
│   └──────┘ └──────┘ └──────┘ └──────┘   to upload            │
│  [Sunflower Class] [Open a class board] [Sign in with a name]│
│                 Play without saving                          │
│                                          (For grown-ups)     │
└──────────────────────────────────────────────────────────────┘
 Class board: same grid, every child in the class; "Back".
 Password step (dialog): (cat) Mia / "Grown-up: type Mia's password."
   [••••••][Show]  ●●●●●● Ready   □ Stay signed in (home tablet)
   [Not me]                                   [Let's play]
 Playing strip above the worlds:
   (cat) Mia  ● All saved     [stickers ◎◎◎ +2]      [✓ I'm done]
```

Phone: two tiles per row. Whiteboard (≥1600px): 120px pictures, 24px names.
Every target is at least 60px (tests check it).

## Theme (step 2)

Reuses the chooser's tokens: paper `#faf2df`, sheet `#fffaf0`, ink
`#253f65`, muted `#536078`, accent `#c74234` (only on "Let's play"), sky
`#b9dce6` for saved class boards, focus `#007a95`. Six soft tones behind
avatars (sky, butter, candy pink, mint, peach, lilac) come from the worlds'
palettes. Status dots: green saved, amber waiting, grey offline, accent when a
sign-in is needed. Type: Nunito Sans Black, as the chooser.

## Motion (step 3)

| Moment | Spec | Source |
| --- | --- | --- |
| Who's playing / board / strip enter | translateY 14px + fade, 420ms `cubic-bezier(.22,1,.36,1)` | the chooser's own `arrive` |
| Person tiles | same, staggered 45ms each | motion-primitives `AnimatedGroup` stagger |
| Tile press | translateY 4px, shadow collapses | playful-color chunky CTA |
| Password dialog | scale .96 → 1, 260ms pop | motion-primitives `Dialog` |
| Password dots | scale 1.12 pop as each fills | ui-layouts dotted indicator + Better Design `number-pop-in` |
| Sticker toast (in worlds) | drops in with a 3° tilt, rests, leaves; 4.2s once | trickle `stamp` (a sticker landing) |

All finite, transform and opacity only. Reduced motion and the grown-ups'
Calm motion turn every one of them off.

## Accessibility (taste-accessibility checklist)

One `h1` per page; "Who's playing?" is an `h2`; dialogs are native
`<dialog>` with `showModal()` (focus moves in and returns). Every input has a
label; errors are text in a `role="alert"` line beside the form, never color
alone; password dots are described, not announced on every key. Avatars are
decorative inside named buttons.
