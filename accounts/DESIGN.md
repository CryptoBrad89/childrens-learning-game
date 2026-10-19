# Home flow and stickers: design notes

**Design read** (design-taste §0): the chooser's storybook paper for
three- and four-year-olds on shared Chromebooks, tablets and whiteboards, with
a grown-up usually helping. Pictures before words, one big target per person,
the same ink-outlined sticker cards and hard offset shadows as the world cards
(design-taste `playful-color`, which is what the chooser already is). No
emoji anywhere: avatars are the game's own word pictures, sticker marks are
drawn or typographic.

## Layout (Superdesign step 1)

Home flow: splash, then the sign-in dialog as the first interactive thing,
then the layout picker. "Letters with Lucy" and its tagline sit top left on
every screen.

```
 ① Splash (once per visit, ~1.4s; 0.5s and still with reduced motion)
┌──────────────────────────────────────────────────────────────┐
│ ░░ Paper Shaders mesh-gradient paper ░░░░░░░░░░░░░░░░░░░░░░░ │
│                         (Lucy)                               │
│                  L e t t e r s  w i t h  L u c y             │  ← trickle char-stagger
│               LITTLE SOUNDS. BIG DISCOVERIES.                │
└──────────────────────────────────────────────────────────────┘
   A <video> placed in #splash later plays to its end instead.

 ② Sign-in dialog (modal; Escape doesn't close it)
┌ (paw) Letters with Lucy ─────────────────────────────────────┐
│            ┌────────────────────────────────────┐            │
│            │ (Lucy) Hello! Who's playing?       │            │
│            │  Sign in to keep your stars …      │            │
│            │ ┌ Played here before? Tap your ┐   │ only when  │
│            │ │ (cat) Mia  (fox) Leo  …       │   │ there are  │
│            │ └───────────────────────────────┘   │ pictures   │
│            │ SIGN-IN NAME [ like mia-k4x     ]  │            │
│            │ PASSWORD     [ ••••••   ][Show]   │            │
│            │ ●●●●●● Ready                       │            │
│            │ □ Stay signed in on this device    │            │
│            │ [        Let's play         ]  red │  primary   │
│            │ [    Play without saving    ]      │  secondary │
│            │        Are you a grown-up?         │  small link│
│            └────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘

 ③ Picker
┌ (paw) Letters with Lucy ─────────────────────────────────────┐
│ (Lucy)  Play with Lucy / Pick a game, then let's go.          │
│ ┌ (cat) Mia · All saved   ◎◎◎ stickers        [✓ I'm done] ┐ │
│ or: ┌ You're playing without saving.  Stars, stickers and   ┐ │
│     │ settings won't be kept after this visit. [Sign in]    │ │
│ ┌──────────┐ ┌──────────┐ ╔══════════╗ ← Ribbon Road: ring,   │
│ │Letter    │ │Moonboat  │ ║Ribbon    ║   "Start here" sticker,│
│ │Post      │ │          │ ║Road      ║   focused, so Enter     │
│ └──────────┘ └──────────┘ ╚══════════╝   starts it             │
└──────────────────────────────────────────────────────────────┘
```

- The dialog holds no group, board or class codes. Picture tiles come from
  people who played on this device and from children a grown-up chose to show
  here ("Show my children's pictures on the sign-in" in the grown-ups'
  corner). A child with an uploaded photo shows that photo.
- "Play without saving" is one click. The picker then says plainly, in a
  `role="status"` bar, that nothing will be kept, and each world's footer
  repeats "Playing without saving".
- The grown-up link is a plain underlined link, smaller than both buttons,
  and says only "Are you a grown-up?".
- Picking a layout goes straight into that game.

Phone: two picture tiles per row in the dialog. Every target is at least 60px
(tests check it).

## Theme (step 2)

Reuses the chooser's tokens: paper `#faf2df`, sheet `#fffaf0`, ink
`#253f65`, muted `#536078`, accent `#c74234` (only on "Let's play"), sky
`#b9dce6` for a tapped picture tile, focus `#007a95`. Six soft tones behind
avatars (sky, butter, candy pink, mint, peach, lilac) come from the worlds'
palettes. Status dots: green saved, amber waiting, grey offline, accent when a
sign-in is needed. Type: Nunito Sans Black, as the chooser.

## Motion (step 3)

| Moment | Spec | Source |
| --- | --- | --- |
| Strip / unsaved bar enter | translateY 14px + fade, 420ms `cubic-bezier(.22,1,.36,1)` | the chooser's own `arrive` |
| Person tiles | same, staggered 45ms each | motion-primitives `AnimatedGroup` stagger |
| Tile press | translateY 4px, shadow collapses | playful-color chunky CTA |
| Sign-in dialog | scale .96 → 1, 260ms pop | motion-primitives `Dialog` |
| Splash wordmark | letters slide up 0.4em, 38ms apart, 600ms `cubic-bezier(.16,1,.3,1)` | trickle `char-stagger` (slide) |
| Splash portrait | pops in with a tilt, 520ms | the chooser's `hello` |
| "Start here" sticker | pops on the default layout, 320ms | playful-color sticker |
| Password dots | scale 1.12 pop as each fills | ui-layouts dotted indicator + Better Design `number-pop-in` |
| Sticker toast (in worlds) | drops in with a 3° tilt, rests, leaves; 4.2s once | trickle `stamp` (a sticker landing) |

All finite, transform and opacity only. Reduced motion and the grown-ups'
Calm motion turn every one of them off.

## Accessibility (taste-accessibility checklist)

One `h1` per page; the dialog's "Who's playing?" is an `h2`; dialogs are native
`<dialog>` with `showModal()` (focus moves in and returns). Every input has a
label; errors are text in a `role="alert"` line beside the form, never color
alone; password dots are described, not announced on every key. Avatars are
decorative inside named buttons.
