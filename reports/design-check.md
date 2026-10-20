# Letters with Lucy design check

## TL;DR

Fixed missing spaces in Ribbon Road and Moonboat questions and in Moonboat's phone introduction. The existing browser suites now check the rendered sentences. Rebuilt the offline manifest.

**The Better Design review did not complete. Exactly 3 MCP calls were attempted.** Two requests hit limits absent from the advertised tool schema, and one returned the capture script. The service returned no design findings or approval. No fourth call was made. The fixes below come from local screenshots and browser checks, not Better Design findings.

Work stays on `codex/home-flow-ribbon`. The starting commit and rollback tag `pre-design-check-2026-10-19-codex` both resolve to `b2f26b2b2f0655d503bc81de1cf8396db9490020`. Live checks target only Supabase `ixjbgshhzeaosrzavssr`.

## Better Design calls

Listed the installed tools before choosing a checker. The full list is in [design-check-tools.json](design-check-tools.json). `inspect_spacing` accepts captured DOM geometry. `get_review_rules` returns rules rather than findings. `check_comprehension` checks text rather than rendered layout. The dashboard-specific tools do not fit the requested child games and account pages.

| Call | Tool and input | Returned result |
| --- | --- | --- |
| 1 | `inspect_spacing`, `detail: full`, whole-product context, no states | Validation error: `context` must have at most 280 characters. This limit was absent from the advertised schema. No capture or review occurred. |
| 2 | `inspect_spacing`, shortened context, `detail: full`, no states | `status: needs-capture`, with a read-only browser capture script. This measured nothing. |
| 3 | `inspect_spacing`, `detail: full`, 12 captured states covering every requested area and all five widths | Validation error: `states` must have at most 6 items. This limit was absent from the advertised schema. No review occurred. |

The request described ages 3–4, all three games, the grown-up flows, device sizes, and the locked rules. [The saved response](design-check-better-design.json) includes the exact third-call error and submitted state names. Both rejected attempts count toward the three-call cap. Credit charges are unknown.

The first retry corrected the explicit context error. There was no blind retry loop. After the second validation error, the call cap prevented another submission. This report does not represent the service as having reviewed the app.

## Findings and disposition

Better Design returned **zero findings**. There are no service findings to mark fixed, skipped, or not reproduced.

Local review found two issues:

| Finding | Status | Before | After |
| --- | --- | --- | --- |
| L1. Hidden line breaks remove a word separator in match questions. Affects Ribbon Road and Moonboat, including X's ending-sound question. | Fixed | `What startswith /b/?` and `What endswith /ks/?` | `What starts with /b/?` and `What ends with /ks/?` |
| L2. Moonboat hides its introduction's line break on phones without preserving a separator. | Fixed | `A whole skyof little sounds.` | `A whole sky of little sounds.` |

Both game engines now include a literal space before those line breaks. Ribbon Road uses Letter Post's engine. The fix preserves each layout's choice to show or hide the break. The gain is readable sentences for children and grown-ups. The only visible change is correct word spacing; the existing design direction remains intact.

No reported finding conflicted with the locked rules, and none was skipped or marked not reproduced. Home and grown-up chrome remain cream, Ribbon Road remains the default, and no groups, classrooms, or code flows were added. The existing game theme choices remain available.

## Before and after evidence

Captured the real app in Chrome at these CSS viewport sizes:

| Device | Size |
| --- | --- |
| Phone | 390 × 844 |
| Tablet landscape | 1180 × 820 |
| Chromebook | 1440 × 1080 |
| Additional checker-required desktop width | 1728 × 1080 |
| Interactive whiteboard | 1920 × 1080 |

Each width has 21 states: child login, focused login, layout picker, each game's home/listen/match/reward, grown-up entry, portal, profile editor, child creation, child management, and per-child settings. There are 105 captures before the fix and 105 after. These use the labelled local Supabase protocol fixture and real app rendering. They do not prove live backend behavior.

[The matrix](design-check-matrix.json) records the states and element counts. The heading-spacing assertion fails on all ten affected before captures and passes on all ten after captures. The local geometry check finds no horizontally off-screen non-radio, non-checkbox, non-range controls in those captures. Scrollable letter and collection regions remain intentional. This local check is not a Better Design measurement or visual approval.

Representative screenshots:

| State | Before | After |
| --- | --- | --- |
| Ribbon Road phone question | [Before](design-check-before/silk-match-390.png) | [After](design-check-after/silk-match-390.png) |
| Moonboat desktop question | [Before](design-check-before/space-match-1728.png) | [After](design-check-after/space-match-1728.png) |
| Moonboat phone introduction | [Before](design-check-before/space-home-390.png) | [After](design-check-after/space-home-390.png) |
| Child login | [Before](design-check-before/child-login-390.png) | [After](design-check-after/child-login-390.png) |
| Layout picker | [Before](design-check-before/layout-picker-1180.png) | [After](design-check-after/layout-picker-1180.png) |
| Profile editor | [Before](design-check-before/profile-editor-390.png) | [After](design-check-after/profile-editor-390.png) |
| Child settings | [Before](design-check-before/child-settings-1920.png) | [After](design-check-after/child-settings-1920.png) |

Matching comparisons use the same viewport and B round. Distractors are randomized by the game, so their pictures can differ. Representative screenshots are committed; the complete screenshot collection and raw DOM snapshots remain local working artifacts.

## Verification

Full suite results are recorded in `design-check-tests/`. Final results and hosted checks are added below after completion.

The first broad browser run began before the copy fix and test changes. It was stopped and superseded by all six existing browser shards on the final source. Its partial log is retained, not counted as a passing run. Local SQL and Edge suites do not mutate the remote database. The existing live suites create test accounts and exercise permissions, sync, profile editing, and child settings on the authorized project.

## Logins and always-latest links

The required master login is **`test` / `ABCD1234`**. Existing retained child and regular grown-up logins are in [portal-child-settings-test-logins.json](portal-child-settings-test-logins.json) and [portal-master-test-logins.json](portal-master-test-logins.json). The live suites refresh their test-login reports.

These preview URLs follow the working branch and show the latest pushed version. If the host shows its external-content notice, choose **Open the page**.

- [Child login and layout picker](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/index.html)
- [Grown-up portal and profile editor](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/accounts/index.html)
- [Per-child settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/grown-ups/index.html)
- [Ribbon Road](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/v4-silk-thread/index.html)
- [Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/codex/home-flow-ribbon/v3-moonboat/index.html)
- [Always-latest report](https://github.com/CryptoBrad89/childrens-learning-game/blob/codex/home-flow-ribbon/reports/design-check.md)

## Remaining limitation

The requested independent Better Design review is incomplete. The three-call cap remains respected. A future authorized attempt needs no script-discovery call if it reuses the returned script, a context of at most 280 characters, and at most six states per submission. No further calls are implied or scheduled by this report.
