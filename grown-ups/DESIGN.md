# Grown-ups' corner: design notes

**Design read (portal rethink, 2026-10-19):** one journey, not two worlds. A
grown-up reaches the corner from "Are you a grown-up?" on the children's
sign-in, so the corner keeps that card's cream paper, ink outlines, offset
shadows, Nunito Black headings and one red button. It is a simple admin for
grown-ups to manage their children: no "playing as" or sync banners, no
groups, no codes, no dark-blue back office. It is used on tablets,
Chromebooks and whiteboards, so every target is at least 60px (72px on
whiteboards) and nothing depends on hover.

Everything lives in `grown-ups/`, on top of `accounts/front-door.css` (the
children's sign-in styles), and works offline once loaded.

## 1. Layout

Sign-in: the children's sign-in card, same size and place, new words.

```
 (paw) Letters with Lucy                         ← top left, as on every screen
            ┌────────────────────────────────────┐
            │ (Lucy) Hello, grown-up!            │
            │ Sign in to look after your children│
            │ SIGN-IN NAME  [                  ] │
            │ PASSWORD      [          ] [Show]  │
            │ ○○○○○○ 6 more                      │
            │ ☐ Stay signed in on this device    │
            │ [        Sign in        ]  (red)   │
            │ [   Back to the games   ]          │
            │ New here? A grown-up who already   │
            │ has an account adds you.           │
            └────────────────────────────────────┘
```

There is no "New account" option: grown-up accounts are only made inside the
corner, by a grown-up who is signed in. The card opens in the same place,
at the same size, with the same pop as the children's, so only the words
change.

The reading gate (§3) is the same card with the number words and keypad.

The corner, after sign-in: a column of cream cards, in the order a grown-up
needs them.

```
 (paw) Letters with Lucy                    [Sign out and go to the games]
 Grown-ups' corner
 Hello, Sam. Add children, choose their settings…
 ┌ Children ─────────────────────────────────── [+ Add a child] ┐
 │ ┌──────────────┐ ┌──────────────┐                            │
 │ │(photo) Mia   │ │(fox) Leo     │   one card per child,      │
 │ │mia-k4x       │ │leo-ftu       │   picture first            │
 │ │2 rounds · …  │ │…             │                            │
 │ │[Settings & progress][Name & picture][Password][Remove]     │
 │ [Add a child who already has an account] [Print sign-in cards]│
 └──────────────────────────────────────────────────────────────┘
 ┌ Settings ──────────────────────── For [All children (2) ▾] ──┐
 │ Sound · Letters · Help when stuck · Motion · Games           │
 └──────────────────────────────────────────────────────────────┘
 ┌ Progress ┐  a table for all children; letters and stickers for one
 ┌ Grown-ups ─────────────────────────────── [+ Add a grown-up] ┐
 ┌ This device ┐  show my children's pictures on the sign-in; who played here
 ┌ You ┐  change my password, sign out
```

Phone: one column; child cards stack; header buttons go full width.

## 2. Theme

The games page's tokens, light only (a device in dark mode still gets the
cream corner, so the step from the children's sign-in never changes color):
paper `#faf2df` with the dotted pattern, sheet `#fffaf0`, ink `#253f65`,
muted `#536078`, red `#c74234` for the one main action per card and switch
on-states, focus `#007a95`, danger `#a3322a`. Cards: 3px ink border, 30px
radius, 7px offset ink shadow, the same as the sign-in card and the layout
cards. Type: Nunito Sans Black headings, Bold body, Comfortaa for sign-in
names.

## 3. Child gate

The gate is a reading check rather than a dexterity check. It shows three
different digits written as words ("seven, two, five"), and the adult taps them
on a 1–9 keypad. Three- and four-year-olds can't read number words yet. A random
tapper has a 1 in 504 chance per attempt, every miss brings a new set of
numbers, and every third miss pauses the keypad for 10 seconds. Easy runs like
1-2-3 or 9-8-7 are never asked. Physical number keys also work, for
Chromebooks. It only guards re-entry for a grown-up who chose to stay signed
in on their own device.

## 4. People

- **Children** are the grown-up's own list. Add a child: name, a picture
  (one of the game's drawn word pictures on six soft tones, or **Upload a
  picture**: any photo, cut to a 160 × 160 square in the browser and sent as
  a small JPEG), and a password of six characters or more. The sign-in name
  is made from the name plus three characters.
- **Remove** asks how: take the child off our list (the account is kept) or
  delete the account for good.
- **Grown-ups** added here look after the same children and can add
  children and grown-ups too. Removing one keeps their account.
- **No groups or codes.** Behind the scenes each grown-up has one team in
  the database; it is never shown.
- **This device:** "Show my children's pictures on the sign-in" puts their
  pictures on a shared device's sign-in (each child still types a password);
  "Who played on this device" can forget someone here.
- Errors follow taste-ux-copy's what + why + fix.

## 5. Motion

| Moment | Spec | Source |
| --- | --- | --- |
| Corner cards arrive | translateY 14px + opacity, 420ms emphasized, 60ms stagger | Better Design `panel-reveal` |
| Sign-in and form cards | opacity + scale .96 → 1, 260ms pop | motion-primitives `Dialog` (the children's sign-in rule) |
| Digit fills a slot | 8px pop-in, 300ms pop | Better Design `number-pop-in` |
| Wrong code | 480ms side wiggle | game |
| Switch thumb | 200ms standard | Better Design `switch` |
| Help selector | sliding pill under the checked option, 300ms | motion-primitives `AnimatedBackground` |
| "Saved" | postmark stamp lands once per change | trickle `stamp` |

No loops. `prefers-reduced-motion` and the corner's own *Calm motion* setting
remove all of it.
