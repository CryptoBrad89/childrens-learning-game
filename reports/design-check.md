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

[The matrix](design-check-matrix.json) records the states and element counts. The heading-spacing assertion fails on all ten affected before captures and passes on all ten after captures. A separate real-browser comparison serves the rollback commit's original JavaScript without changing working files: nine of thirteen text checks reproduce the bug before the fix, and all thirteen pass afterward. See [copy-before-after.log](design-check-tests/copy-before-after.log). The local geometry check finds no horizontally off-screen non-radio, non-checkbox, non-range controls in those captures. Scrollable letter and collection regions remain intentional. This local check is not a Better Design measurement or visual approval.

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

All 22 existing CJS test entry points pass, including both fixture and live modes of the account and portal suites. Static checks pass 6/6. The strict Edge TypeScript check also passes. [Final results](design-check-tests/final-results.json) link each check to its log.

| Checks | Evidence and result |
| --- | --- |
| Static assets, audio hashes, content, themes | [6/6 strict checks](design-check-tests/static-final.log) pass. |
| Runtime and grown-up setting renderers | [Game runtime](design-check-tests/runtime_smoke-final.log) and [settings runtime](design-check-tests/grown_ups_runtime-final.log) pass. |
| Broad game journeys | [All six shards](design-check-tests/browser-shards.json) pass all 18 game, viewport, and theme cases, including the new text assertions. |
| Motion, Ribbon Road, confetti, grown-up controls | [Motion](design-check-tests/motion_smoke.log), [Ribbon Road](design-check-tests/silk_smoke.log), [confetti](design-check-tests/confetti_smoke.log), and [grown-up browser](design-check-tests/grown_ups_smoke.log) suites pass. |
| Home, child selection, fixture portal and sync | [Home](design-check-tests/home_flow.log), [selection](design-check-tests/accounts_selection.log), [portal](design-check-tests/portal_flow.log), and [sync](design-check-tests/accounts_sync.log) pass. |
| SQL, session limits, Edge permissions, strict types | All six database and Edge suites and strict TypeScript pass. Individual logs are in the final results. |
| Live permissions, profile editing, portal, sync, child settings | [Master](design-check-tests/portal_master.log), [profile editor](design-check-tests/portal_master_edit.log), [portal regression](design-check-tests/portal_round2.log), [live portal](design-check-tests/portal_flow-live.log), [live sync](design-check-tests/accounts_sync-live.log), and [child settings](design-check-tests/child_settings_browser.log) pass. |
| Pushed hosted implementation | [Account checks](design-check-tests/child_settings_hosted.log) pass at 390 and 1440. [Copy checks](design-check-tests/hosted-copy.log) pass at 390 and 1920 in all three games, including X. |

The [final hosted audit](design-check-tests/final-master.json) at 2026-10-20 02:52:59 UTC confirms that `test` / `ABCD1234` signs in, exactly one grown-up is the master, and portal chrome stays cream with a dark device preference. Live profile tests restore the master's complete original profile. No migrations or Edge deployment were needed.

The first broad browser run began before the copy fix and test changes. It was stopped and superseded by all six existing browser shards on the final source. Its partial log is retained, not counted as a passing run. Local SQL and Edge suites do not mutate the remote database. The existing live suites create test accounts and exercise permissions, sync, profile editing, and child settings on the authorized project.

## Logins and always-latest links

The required master login is **`test` / `ABCD1234`**. Existing retained child and regular grown-up logins are in [portal-child-settings-test-logins.json](portal-child-settings-test-logins.json) and [portal-master-test-logins.json](portal-master-test-logins.json). The live suites refresh their test-login reports. Newly verified child logins, all with password `7234ab`, are `settings_renamed_mvg37ajm390`, `settings_jane_mvg37ajm390`, `settings_renamed_mvg3822l1440`, and `settings_jane_mvg3822l1440`. The master can open their progress and settings.

[The verified implementation commit](https://github.com/CryptoBrad89/childrens-learning-game/commit/d47f43308e253254b96ebefcadd154ceb93e7ec0) contains the two text repairs. A [pinned preview](https://raw.githack.com/CryptoBrad89/childrens-learning-game/d47f43308e253254b96ebefcadd154ceb93e7ec0/index.html) preserves that implementation.

These preview URLs follow the working branch. The shorter branch URLs served cached old JavaScript during verification. The explicit `refs/heads` URLs below load successfully, and [both game engines match the pushed source byte for byte](design-check-tests/always-latest.json). The host advertises a 60-second cache, so branch previews can briefly lag a push. The pinned preview above identifies the verified build. If the host shows its external-content notice, choose **Open the page**.

- [Child login and layout picker](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/index.html)
- [Grown-up portal and profile editor](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/accounts/index.html)
- [Per-child settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/grown-ups/index.html)
- [Ribbon Road](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v4-silk-thread/index.html)
- [Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v3-moonboat/index.html)
- [Always-latest report](https://github.com/CryptoBrad89/childrens-learning-game/blob/codex/home-flow-ribbon/reports/design-check.md)

## Remaining limitation

The requested independent Better Design review is incomplete. The three-call cap remains respected. A future authorized attempt needs no script-discovery call if it reuses the returned script, a context of at most 280 characters, and at most six states per submission. No further calls are implied or scheduled by this report.
