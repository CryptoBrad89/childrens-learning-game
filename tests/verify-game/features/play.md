# Listen and picture matching

## Sub-features

Letter entrance, sound replay, three picture choices, wrong-card wiggle and fading red glow, correct-card bounce before reward, Lucy breathing, interruptible word and retry feedback without hints, X's ending sound, and reduced-motion behavior.

## How to get to it (user POV)

Choose a letter on home, listen or tap the letter again, then tap the main continue button to choose a matching picture.

## Driving it with Playwright

Click `[data-letter="B"]`; await `body[data-screen="listen"]`. Click `.listen-letter` to replay. Click `[data-action="match"]`; await `body[data-screen="match"]`. Click `.choice:not([data-answer="B"])`; wait until speech ends, then inspect `.tried` and feedback. Wrong taps remain available during audio so a new tap can interrupt. The broader smoke clicks both wrong choices and verifies that no `.hint` or `.hint-tag` appears. Click `[data-answer="B"]` to reach celebrate. Repeat for J, X, and Z using the broader smoke; X must say its sound ends the word. Capture listen/match states. Run both motion preferences and toggle `page.emulateMedia({reducedMotion:'reduce'})` during replay to prove active motion stops.

## Gotchas

Choices shuffle, so use `data-answer`, not positions. Voice clips and finite effects are awaited by the production app; await route/effect state. Clicking the real mute control accelerates the harness without replacing audio or learning logic. Separate unmuted audio coverage remains in the existing browser smoke.

The motion helper also verifies an outgoing screen fades before replacement and Escape during a pending transition keeps the latest route. Wrong feedback and correct-card motion are inspected before the route changes.
