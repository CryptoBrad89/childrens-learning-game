# Account notebook design

The notebook extends the existing grown-ups' corner: the same cream paper, ink outlines, locally bundled Nunito and Comfortaa, red action buttons, postmark and static Paper Shaders band. It remains a separate page so the familiar grown-ups' settings, door and layout remain intact. The signed-in identity stays above a separate, explicit notebook owner; opening a linked child's notebook does not change who is playing. Sign-out explains that pending play stays with its original login.

All tools below were read as local reference snapshots from `/workspace/clg/tools/design`. No design service, extension, package installation or live Better Design connection was used.

| Reference | Actual use |
| --- | --- |
| `superdesign/README.md` | Used its wireframe-first workflow: compared a combined account/settings page with a separate notebook and retained the notebook, preserving the established settings page. The final hierarchy is identity, progress, then progressive-disclosure management forms. No extension was run. |
| `design-taste/skills/playful-color/SKILL.md` | Applied chunky controls, cream ground, heavy display lettering and ink outlines. Existing brand tokens and shader take precedence over that genre pack's proposed palette and no-gradient rule. |
| `better-design/skills/better-design/SKILL.md`, `components/tactile-minimal/components/ui/stagger-fade-in.tsx` | Read-only reference. Preserved the existing design system and separated signup and signin with explicit labels. Adapted short panel entrance to 8px/300ms without blur or stagger. No MCP guidance or review results are claimed. |
| `ui-layouts/apps/ui-layout/registry/components/grid/normal-grid.tsx` | Adapted its two-column-to-one-column layout pattern for forms and child management. Used normal CSS grid instead of React/masonry, preserving reading order. |
| `Hyperiux/registry/effects/buttons/arrow-fill-button/index.tsx` | Reused the existing grown-ups' corner adaptation of its fill-and-arrow interaction for the games return link, including keyboard focus and touch active behavior. |
| `motion-primitives/app/docs/animated-background/animated-tabs.tsx` | Adapted the brief 0.3-second background transition for notebook navigation, using the established CSS easing rather than installing React/Motion. |
| `trickle/registry/default/underline-draw/underline-draw.tsx` | Reused the existing section-rule drawing adaptation, driven entirely by CSS. |
| `shaders/packages/shaders/README.md`, existing `grown-ups/paper-shader.js` | Reused the existing static WebGL2 paper band, which falls back to the CSS brand gradient. No animation loop or additional shader dependency. |

`canvas-ui` and `cursify` were excluded by the owner. No other design repository was skipped.

Controls are at least 60 CSS pixels high; inputs have visible labels, passwords use only a six-character creation minimum, focus outlines remain visible, and result/status messages use text nodes and live regions. Forms prevent repeated submission while pending and clear password inputs after every request. Layout collapses at 760px, respects system dark mode and reduced motion, and inherits the grown-ups' corner calm-motion preference. No screenshots were taken.

Stable browser-test hooks: `signin-form`, `register-form`, `create-child-form`, `link-child-form`, `reset-password-form`, `create-class-form`, `assign-class-form`, `sync-now`, `sign-out`, `back-to-me`, `account-status`, `sync-status`, `round-count`, `letter-total`, `achievements`, `children-list`, `owner-label`. Every form uses named native fields and a `.form-result` live region.

Additional hooks: `own-password-form`, `classes-list`, `offline-status`. Class lists show the current linked child names; own-password changes are separate from grown-ups resetting a linked child's password.

Verification: `node --check accounts/ui.js` passed. A Chromium/Playwright browser check at 390×844 with a controlled account API passed sign-in, roster loading, progress, hostile display-name text safety, owner switching and return to self, mobile horizontal fit, password clearing, and sign-out. This checks UI behavior; live backend and two-device checks are covered separately by the build report. No screenshots were taken.
