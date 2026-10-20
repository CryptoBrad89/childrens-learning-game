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

## Round 2 (review only)
### TL;DR

All requested screens were freshly captured at tablet 1180 × 820, Chromebook 1440 × 1080, whiteboard 1920 × 1080, and phone 390 × 844. Better Design returned completed geometry reviews. No app code, tests, or manifests changed. No fixes were made.

The most consequential observations are phone question answers below the first screen and a grown-up navigation loop from a child's settings. These are local observations, not checker findings. The checker's findings concern clipping, overflow, target sizes, uneven gaps, padding, and spacing tokens. Many warnings refer to intentional collection scrolling, decorative backgrounds, or hidden accessibility text, so their automated severity overstates their practical impact.

**19 Better Design calls were used in Round 2, all `inspect_spacing`, all completed.** The first 12 submitted 68 distinct rendered states. Seven smaller follow-ups recovered findings for screens hidden behind the service's 80-finding response cap. Some collection-heavy screens still exceed that cap. Every requested screen has returned findings, but this is not an exhaustive inventory of every geometry warning or a visual-design approval.

### Evidence and scope
The reviewed application source is branch `codex/home-flow-ribbon` at `e8fdd4498d1f5cb59e623d5a5c50c375a9539b73`. Captures use the saved read-only script from Round 1, `.job/design-capture-script.js`, SHA-256 `24597ee92e38836d679ad1d80ca55c6e266eac23b52a1400c2ea2d3c14f1711a`. The saved Round 1 JSON records the script-returning call; the reusable script itself is in `.job`. No script-discovery call was made.
The browser loaded current local source through the existing static server and Supabase protocol fixture. The fixture has one master, `test` / `ABCD1234`, and four temporary children, one for each width. No live accounts, profile values, or settings were changed. These captures establish rendering and local navigation, not live backend authorization or session-expiry behavior.

Each width covers child login; signed-out and child-signed-in layout pickers; Ribbon Road, Letter Post, and Moonboat home and B question screens; signed-out grown-up entry; master portal; expanded profile editor; expanded child creation; selected-child management; selected-child settings; child-session entry into the grown-up route; and the grown-up route reached after leaving a child's settings. There are 17 states per width, 68 total. Game questions use random distractors. Reduced motion was enabled to stabilize captures.

The child-session path enters `/grown-ups/` and redirects to the child's progress page, without exposing grown-up settings. The master path selects a child, opens **Settings for this child**, chooses **Lock and go to games**, then **Are you a grown-up?**. It returns to the same selected child's settings. Both resulting states were submitted at all four widths.

Screenshots and full DOM snapshots remain local under `.job/design-round2/`. Only this report is committed. The initial capture harness waited for a grown-up sign-in form while a child session correctly showed the child's progress page; that run was stopped, the harness corrected, and the complete capture rerun. No app change or checker retry resulted from that local harness correction.

### Every Better Design call

All calls used the same context below, `detail: full`, the original captured geometry, at most six states, no custom density, and the service's default spacing scale. No rejected MCP calls occurred in Round 2. Local shell and screenshot operations are not Better Design calls.
Context, 205 characters:

> Review only: Letters with Lucy, ages 3–4. Cream chrome; one master test/ABCD1234; simple admin; no public adult signup, groups/classrooms/codes; Ribbon Road default; retain kid sign-out and session expiry.
State suffixes are viewport widths in CSS pixels. `silk` means Ribbon Road, `post` means Letter Post, and `space` means Moonboat. Findings are returned entries, including duplicates across submissions. Truncated counts are reported by the checker, not estimates of unique additional issues.

| Call | Tool | Submitted states | Result | Returned / truncated |
| --- | --- | --- | --- | --- |
| 1 | `inspect_spacing` | `child-login-1180`; `layout-picker-signed-out-1180`; `silk-home-1180`; `silk-question-1180`; `post-home-1180`; `post-question-1180` | `completed` | 80 / 66 |
| 2 | `inspect_spacing` | `space-home-1180`; `space-question-1180`; `grownup-entry-1180`; `portal-1180`; `profile-editor-1180`; `child-creation-1180` | `completed` | 80 / 47 |
| 3 | `inspect_spacing` | `child-management-1180`; `per-child-settings-1180`; `layout-picker-signed-in-1180`; `grownup-area-child-session-redirect-1180`; `child-login-1440`; `layout-picker-signed-out-1440` | `completed` | 26 / 0 |
| 4 | `inspect_spacing` | `silk-home-1440`; `silk-question-1440`; `post-home-1440`; `post-question-1440`; `space-home-1440`; `space-question-1440` | `completed` | 80 / 90 |
| 5 | `inspect_spacing` | `grownup-entry-1440`; `portal-1440`; `profile-editor-1440`; `child-creation-1440`; `child-management-1440`; `per-child-settings-1440` | `completed` | 46 / 0 |
| 6 | `inspect_spacing` | `layout-picker-signed-in-1440`; `grownup-area-child-session-redirect-1440`; `child-login-1920`; `layout-picker-signed-out-1920`; `silk-home-1920`; `silk-question-1920` | `completed` | 23 / 0 |
| 7 | `inspect_spacing` | `post-home-1920`; `post-question-1920`; `space-home-1920`; `space-question-1920`; `grownup-entry-1920`; `portal-1920` | `completed` | 80 / 20 |
| 8 | `inspect_spacing` | `profile-editor-1920`; `child-creation-1920`; `child-management-1920`; `per-child-settings-1920`; `layout-picker-signed-in-1920`; `grownup-area-child-session-redirect-1920` | `completed` | 45 / 0 |
| 9 | `inspect_spacing` | `child-login-390`; `layout-picker-signed-out-390`; `silk-home-390`; `silk-question-390`; `post-home-390`; `post-question-390` | `completed` | 80 / 197 |
| 10 | `inspect_spacing` | `space-home-390`; `space-question-390`; `grownup-entry-390`; `portal-390`; `profile-editor-390`; `child-creation-390` | `completed` | 80 / 69 |
| 11 | `inspect_spacing` | `child-management-390`; `per-child-settings-390`; `layout-picker-signed-in-390`; `grownup-area-child-session-redirect-390`; `grownup-area-from-child-settings-1180`; `grownup-area-from-child-settings-1440` | `completed` | 34 / 0 |
| 12 | `inspect_spacing` | `grownup-area-from-child-settings-1920`; `grownup-area-from-child-settings-390` | `completed` | 17 / 0 |
| 13 | `inspect_spacing` | `post-question-1180`; `space-question-1180`; `grownup-entry-1180`; `post-home-1180` | `completed` | 80 / 16 |
| 14 | `inspect_spacing` | `portal-1180`; `profile-editor-1180`; `child-creation-1180`; `space-home-1180` | `completed` | 80 / 38 |
| 15 | `inspect_spacing` | `post-question-1440`; `space-question-1440`; `space-question-1920`; `space-home-1440` | `completed` | 80 / 11 |
| 16 | `inspect_spacing` | `grownup-entry-1920`; `portal-1920`; `silk-question-390`; `space-home-1920` | `completed` | 63 / 0 |
| 17 | `inspect_spacing` | `post-question-390`; `space-question-390`; `grownup-entry-390`; `silk-home-390` | `completed` | 80 / 50 |
| 18 | `inspect_spacing` | `portal-390`; `profile-editor-390`; `child-creation-390`; `post-home-390` | `completed` | 80 / 84 |
| 19 | `inspect_spacing` | `space-home-390` | `completed` | 80 / 44 |

Calls 1, 2, 4, 7, 9, and 10 reached the 80-entry cap. Their later screens were not treated as having no issues. Calls 13–19 put those screens first and at most one collection-heavy home last. Some homes still reach the cap, including Moonboat at 390 even when submitted alone. Identical requests were never retried blindly. No geometry was removed or rewritten to manufacture a smaller result. Across all submissions the service returned 1,214 entries: 1,054 serious, 160 moderate, zero critical. These counts include repeated findings, nested SVG descendants, and intentional clipping. They are not 1,214 distinct product defects.

The service also asks for width 1728. Round 2 follows the job's four specified sizes; no 1728 capture was submitted, and no claim of satisfying the service's generic width matrix is made. Each batch naturally reports other widths as missing. Coverage is assessed across the complete capture matrix, not from one batch.

### Findings ranked by practical impact

Ranking weighs what a 3–4-year-old or assisting grown-up can actually do. Automated severity is preserved in the full ledger below. Suggestions are proposals only.

| Rank | Finding, screens, and widths | Evidence and impact | Checker suggestion and proposed disposition |
| --- | --- | --- | --- |
| 1 | Phone question choices require scrolling. All three game questions, 390. Local observation alongside checker sibling-gap findings. | In Ribbon Road, the first answer starts at y=705 and the third at y=953 on an 844-high screen. The account strip occupies roughly y=163–421. A child cannot initially see all three choices, so may choose before seeing the correct picture. | Checker says to use one gap token and remove competing child margins. Proposed fix: reduce the persistent account block during rounds and fit the prompt plus all three answers into the phone viewport. Keep child sign-out visible. This proposal comes from the screenshot and geometry, not a checker diagnosis of the account strip. |
| 2 | Grown-up entry loops back into the selected child's settings. All four widths. Local navigation observation. | Master opens a child's settings, leaves for games, then opens the grown-up link. The selected child remains the settings owner, and the same child's settings opens again. A grown-up seeking the portal has no direct portal link on that settings page. | Checker has no navigation suggestion because it measures geometry. Proposed fix: add a clear cream-chrome **Grown-up portal** link inside child settings and make the entry destination explicit while preserving the selected child's identity. Do not add signup, codes, groups, or another master. |
| 3 | Small visible settings inputs. Per-child settings and entry from child settings, 390, 1180, 1440, 1920. Checker `spacing/touch-target`. | Checker reports 24 × 24 inputs against 44 × 44. This matters on tablets and whiteboards, but the scope radios are already inside large labels: 358 × 106.86 at 390 and 801.63 × 95.41 at 1180. The warning alone does not prove a small effective hit area. | Checker says to enlarge the interactive hit area to at least 44 × 44. Proposed fix: verify whole-label activation for scope and child choices before changing layout; enlarge only any effective hit area that remains small. Do not make simple admin more complex. |
| 4 | Collection and game-layer clipping or horizontal overflow. Game homes at all four widths; question background layers and hidden announcers at all four widths. Checker `spacing/clipped-content` and `spacing/viewport-overflow`. | Examples include Ribbon Road's 1180-wide background reaching x=-177 to 1357, collection items beyond the viewport, clipped Letter Post letter spans, and Moonboat collection cells. A genuinely inaccessible letter or collection item would block discovery; decorative layers and scrollable collections do not establish that defect. | Checker says to constrain elements to the viewport, remove conflicting fixed sizes, allow wrapping, or intentionally scroll overflow. Proposed fix: verify that every letter and collection item remains reachable, then fix only real clipping. Keep intentional decorative crop and collection scrolling. Preserve the hidden live region `#announcer`; its 1px clipping is intentional accessibility behavior. |
| 5 | Inconsistent sibling gaps and inferred density. Game homes/questions, picker states, portal, profile editor, creation, management, and child settings. Recorded at each applicable width in the ledger. | Checker finds shell gaps of 16, 24, and 0px; question gaps such as 20 versus 853.88px at 1180; and 28px sections versus a suggested 32px. Some comparisons cross different layout roles, and density is inferred by the service rather than declared by the app. This is polish unless content is obscured. | Checker says to set one parent gap token and remove competing margins, use 32px section gaps and 20px card padding for comfortable density. Proposed fix: group comparable controls first and tune gaps to child reach and clarity. Do not shrink generous child targets just to match inferred desktop density. |
| 6 | Asymmetric horizontal padding. Grown-up entry, portal, profile editor, child creation, management, progress, and child settings, all four widths. Checker `spacing/asymmetric-horizontal-inset`. | The **Back to the games** and **Lock and go to games** buttons use 24px left and 70px right padding. The right side contains an arrow. The duplicated label in the finding comes from the button's layered visual treatment. | Checker says to equalize padding unless asymmetry is intentional. Proposed fix: preserve space for the arrow and assess the visible label's optical balance. Equal padding is not automatically an improvement here. |
| 7 | Off-scale spacing. Every requested screen family across all four widths. Checker `spacing/off-scale-value`. | Values such as 2, 6, 10, 18, 20, 28, 36, and 40px differ from the tool's default scale. Centered auto margins and fluid dimensions also appear in its lists. This is consistency advice, not evidence of child confusion. | Checker says to replace values with the nearest spacing token. Proposed fix: use a documented project scale for repeated gaps, retaining intentional fluid centering and existing brand direction. Do not mechanically round every computed margin. |

The scope-radio label measurements come from the same raw snapshots submitted to the checker. Hidden icon names in profile and child avatar choices use `.sr-only`; their clipping warnings are not evidence that visible avatar icons are missing. Full rows retain those warnings for auditability.

### Locked-rule conflicts and limits

No returned finding explicitly asks for dark-blue chrome, a second master, public grown-up signup, groups, classrooms, codes, a different default world, removal of child sign-out, or relaxed session expiry. All ranked proposals preserve cream chrome, one master `test` / `ABCD1234`, simple admin, and Ribbon Road as default.

Every completed response adds a generic instruction to call `find-design-system` and offer new style choices. That is outside this review-only job and could displace the locked cream design direction. It was not followed. No design-system discovery or restyling call was made. Likewise, changing all clipping mechanically would damage hidden accessibility labels and live announcements. Those blanket applications are explicitly rejected.

Geometry inspection cannot establish copy comprehension, color contrast, educational suitability, remote permissions, or session-expiry correctness. No claim of independent approval for those areas is made. The complete requested rendered-state matrix was reviewed, but service truncation leaves some lower-priority collection warnings unreturned. No score is represented as visual approval.

### Complete returned-finding ledger

Every returned finding has its own row with original call-local ID, screen, width, severity, message, and suggested fix. Repeated rows are intentional: this preserves every call's result. The ranking above groups these entries by user impact. Evidence values printed inside messages are the service's measurements. All findings include a fix, so no fallback proposal was needed for a checker finding. The two navigation and phone-layout observations above are explicitly local additions.

<details>
<summary>Call 1: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | child-login @ 1180 | moderate | child-login-1180 uses 10 off-scale spacing values across 12 elements: 2px, 6px, 10px, 18px, 20px, 28px, 36px, 40px, 181px, 320px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | layout-picker-signed-out @ 1180 | moderate | layout-picker-signed-out-1180 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 40px, 151px, 226px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | Ribbon Road home @ 1180 | moderate | silk-home-1180 uses 14 off-scale spacing values across 78 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 50px, 54px, 75px, 109.94px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-4 | Ribbon Road home @ 1180 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-5 | Ribbon Road home @ 1180 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Ribbon Road home @ 1180 | serious | div:nth-of-type(1)@3 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Ribbon Road home @ 1180 | serious | T, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@308 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@309 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@310 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@311 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@312 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Ribbon Road home @ 1180 | serious | U, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@314 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@315 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@316 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@317 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@318 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Ribbon Road home @ 1180 | serious | V, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@320 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@321 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@322 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@323 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@324 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Ribbon Road home @ 1180 | serious | W, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@326 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@327 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@328 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@329 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@330 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Ribbon Road home @ 1180 | serious | X, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@332 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@333 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@334 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@335 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@336 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Ribbon Road home @ 1180 | serious | Y, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@338 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@339 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@340 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@341 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@342 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Ribbon Road home @ 1180 | serious | Z, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Ribbon Road home @ 1180 | serious | span:nth-of-type(1)@344 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Ribbon Road home @ 1180 | serious | svg:nth-of-type(1)@345 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Ribbon Road home @ 1180 | serious | path:nth-of-type(1)@346 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Ribbon Road home @ 1180 | serious | b:nth-of-type(1)@347 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Ribbon Road home @ 1180 | serious | span:nth-of-type(2)@348 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Ribbon Road question @ 1180 | moderate | silk-question-1180 uses 12 off-scale spacing values across 23 elements: 1px, 2.34px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 804.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-50 | Ribbon Road question @ 1180 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-51 | Ribbon Road question @ 1180 | serious | div:nth-of-type(1)@40 has inconsistent sibling gaps: 20px, 824.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-52 | Ribbon Road question @ 1180 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-53 | Ribbon Road question @ 1180 | serious | div:nth-of-type(1)@3 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Ribbon Road question @ 1180 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-55 | Letter Post home @ 1180 | moderate | post-home-1180 uses 10 off-scale spacing values across 107 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 29.5px, 40.5px, 70.8px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-56 | Letter Post home @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-57 | Letter Post home @ 1180 | serious | p:nth-of-type(1)@56 has inconsistent sibling gaps: 66.91px, 12px, 54.05px, 12px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-58 | Letter Post home @ 1180 | serious | div:nth-of-type(1)@67 has inconsistent sibling gaps: 88.95px, 132.05px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-59 | Letter Post home @ 1180 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-60 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@99 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-61 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@104 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-62 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@109 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-63 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@114 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-64 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@119 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-65 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@124 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-66 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@129 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-67 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@134 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-68 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@139 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-69 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@144 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-70 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@149 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-71 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@154 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-72 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@159 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-73 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@164 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-74 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@169 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-75 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@174 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-76 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@179 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-77 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@184 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-78 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@189 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-79 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@194 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-80 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@199 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |

</details>

<details>
<summary>Call 2: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Moonboat home @ 1180 | moderate | space-home-1180 uses 14 off-scale spacing values across 76 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 29.5px, 38.44px, 40.5px, 49.16px, 55px, 59px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Moonboat home @ 1180 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 18px, 22px, 55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@62 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@67 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-6 | Moonboat home @ 1180 | serious | L, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@274 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@275 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@276 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Moonboat home @ 1180 | serious | M, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@280 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@281 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@282 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@283 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@284 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Moonboat home @ 1180 | serious | N, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@286 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@287 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@288 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@289 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@290 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Moonboat home @ 1180 | serious | O, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@292 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@293 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@294 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@295 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@296 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 1180 | serious | P, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@298 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@299 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@300 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@301 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@302 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 1180 | serious | Q, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@304 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@305 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@306 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@307 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@308 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 1180 | serious | R, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@310 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@311 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@312 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@313 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@314 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 1180 | serious | S, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@316 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@317 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@318 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@319 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@320 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 1180 | serious | T, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@322 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@323 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@324 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@325 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@326 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 1180 | serious | U, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@328 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@329 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@330 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@331 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@332 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 1180 | serious | V, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@334 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@335 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@336 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@337 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@338 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 1180 | serious | W, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@340 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@341 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@342 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@343 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@344 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 1180 | serious | X, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@346 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@347 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@348 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@349 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 3: 26 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | child-management @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | child-management @ 1180 | moderate | child-management-1180 uses 10 off-scale spacing values across 76 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 35.4px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | child-management @ 1180 | serious | span:nth-of-type(2)@127 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-4 | child-management @ 1180 | serious | span:nth-of-type(2)@130 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | child-management @ 1180 | serious | span:nth-of-type(2)@133 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | child-management @ 1180 | serious | span:nth-of-type(2)@136 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | child-management @ 1180 | serious | span:nth-of-type(2)@139 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | child-management @ 1180 | serious | span:nth-of-type(2)@142 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | per-child-settings @ 1180 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-10 | per-child-settings @ 1180 | moderate | per-child-settings-1180 uses 11 off-scale spacing values across 83 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-11 | per-child-settings @ 1180 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-12 | per-child-settings @ 1180 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-13 | per-child-settings @ 1180 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-14 | layout-picker-signed-in @ 1180 | moderate | layout-picker-signed-in-1180 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 40px, 151px, 226px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-15 | grownup-area-child-session-redirect @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-16 | grownup-area-child-session-redirect @ 1180 | moderate | grownup-area-child-session-redirect-1180 uses 9 off-scale spacing values across 28 elements: 6px, 10px, 18px, 20px, 22px, 28px, 35.4px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-17 | child-login @ 1440 | moderate | child-login-1440 uses 11 off-scale spacing values across 12 elements: 2px, 6px, 10px, 18px, 20px, 28px, 36px, 67.34px, 170px, 181px, 450px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-18 | layout-picker-signed-out @ 1440 | moderate | layout-picker-signed-out-1440 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 151px, 170px, 226px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-19 | child-management @ 1180 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-20 | child-management @ 1180 | moderate | Card padding is 35.4px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-21 | per-child-settings @ 1180 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-22 | per-child-settings @ 1180 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-23 | layout-picker-signed-in @ 1180 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-24 | grownup-area-child-session-redirect @ 1180 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-25 | grownup-area-child-session-redirect @ 1180 | moderate | Card padding is 35.4px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-26 | layout-picker-signed-out @ 1440 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |

</details>

<details>
<summary>Call 4: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Ribbon Road home @ 1440 | moderate | silk-home-1440 uses 15 off-scale spacing values across 78 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 50px, 54px, 75px, 109.94px, 156px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Ribbon Road home @ 1440 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Ribbon Road home @ 1440 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-4 | Ribbon Road home @ 1440 | serious | div:nth-of-type(1)@3 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-5 | Ribbon Road home @ 1440 | serious | X, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-6 | Ribbon Road home @ 1440 | serious | Y, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Ribbon Road home @ 1440 | serious | span:nth-of-type(1)@338 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Ribbon Road home @ 1440 | serious | svg:nth-of-type(1)@339 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Ribbon Road home @ 1440 | serious | path:nth-of-type(1)@340 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Ribbon Road home @ 1440 | serious | b:nth-of-type(1)@341 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Ribbon Road home @ 1440 | serious | span:nth-of-type(2)@342 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Ribbon Road home @ 1440 | serious | Z, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Ribbon Road home @ 1440 | serious | span:nth-of-type(1)@344 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Ribbon Road home @ 1440 | serious | svg:nth-of-type(1)@345 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Ribbon Road home @ 1440 | serious | path:nth-of-type(1)@346 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Ribbon Road home @ 1440 | serious | b:nth-of-type(1)@347 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Ribbon Road home @ 1440 | serious | span:nth-of-type(2)@348 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Ribbon Road question @ 1440 | moderate | silk-question-1440 uses 14 off-scale spacing values across 23 elements: 1px, 2.34px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 86px, 156px, 1064.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-19 | Ribbon Road question @ 1440 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-20 | Ribbon Road question @ 1440 | serious | div:nth-of-type(1)@40 has inconsistent sibling gaps: 20px, 1084.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-21 | Ribbon Road question @ 1440 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-22 | Ribbon Road question @ 1440 | serious | div:nth-of-type(1)@3 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Ribbon Road question @ 1440 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | Letter Post home @ 1440 | moderate | post-home-1440 uses 11 off-scale spacing values across 107 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 36px, 86.4px, 164px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-25 | Letter Post home @ 1440 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-26 | Letter Post home @ 1440 | serious | p:nth-of-type(1)@56 has inconsistent sibling gaps: 66.91px, 12px, 54.05px, 12px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-27 | Letter Post home @ 1440 | serious | div:nth-of-type(1)@67 has inconsistent sibling gaps: 143.65px, 182.95px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-28 | Letter Post home @ 1440 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-29 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@99 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-30 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@104 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-31 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@109 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-32 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@114 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-33 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@119 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-34 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@124 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-35 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@129 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-36 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@134 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-37 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@139 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-38 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@144 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-39 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@149 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-40 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@154 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-41 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@159 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-42 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@164 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-43 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@169 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-44 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@174 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-45 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@179 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-46 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@184 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-47 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@189 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-48 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@194 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-49 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@199 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-50 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@204 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-51 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@209 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-52 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@214 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-53 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@219 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-54 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@224 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-55 | Letter Post home @ 1440 | serious | V, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Letter Post home @ 1440 | serious | W, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@366 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Letter Post home @ 1440 | serious | svg:nth-of-type(1)@367 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Letter Post home @ 1440 | serious | path:nth-of-type(1)@368 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Letter Post home @ 1440 | serious | b:nth-of-type(1)@369 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Letter Post home @ 1440 | serious | span:nth-of-type(2)@370 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Letter Post home @ 1440 | serious | X, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@372 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Letter Post home @ 1440 | serious | svg:nth-of-type(1)@373 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Letter Post home @ 1440 | serious | path:nth-of-type(1)@374 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Letter Post home @ 1440 | serious | b:nth-of-type(1)@375 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Letter Post home @ 1440 | serious | span:nth-of-type(2)@376 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Letter Post home @ 1440 | serious | Y, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@378 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Letter Post home @ 1440 | serious | svg:nth-of-type(1)@379 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Letter Post home @ 1440 | serious | path:nth-of-type(1)@380 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Letter Post home @ 1440 | serious | b:nth-of-type(1)@381 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Letter Post home @ 1440 | serious | span:nth-of-type(2)@382 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Letter Post home @ 1440 | serious | Z, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Letter Post home @ 1440 | serious | span:nth-of-type(1)@384 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Letter Post home @ 1440 | serious | svg:nth-of-type(1)@385 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Letter Post home @ 1440 | serious | path:nth-of-type(1)@386 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Letter Post home @ 1440 | serious | b:nth-of-type(1)@387 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Letter Post home @ 1440 | serious | span:nth-of-type(2)@388 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Letter Post question @ 1440 | moderate | post-question-1440 uses 13 off-scale spacing values across 25 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 36px, 40px, 164px, 271.39px, 1080.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |

</details>

<details>
<summary>Call 5: 46 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | grownup-entry @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | grownup-entry @ 1440 | moderate | grownup-entry-1440 uses 9 off-scale spacing values across 14 elements: 6px, 10px, 14px, 20px, 22px, 28px, 36px, 57.6px, 70px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | portal @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-4 | portal @ 1440 | moderate | portal-1440 uses 10 off-scale spacing values across 30 elements: 6px, 10px, 18px, 20px, 22px, 28px, 36px, 57.6px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-5 | profile-editor @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-6 | profile-editor @ 1440 | moderate | profile-editor-1440 uses 11 off-scale spacing values across 45 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 57.6px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-7 | profile-editor @ 1440 | serious | span:nth-of-type(2)@40 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | profile-editor @ 1440 | serious | span:nth-of-type(2)@43 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | profile-editor @ 1440 | serious | span:nth-of-type(2)@46 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | profile-editor @ 1440 | serious | span:nth-of-type(2)@49 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | profile-editor @ 1440 | serious | span:nth-of-type(2)@52 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-12 | profile-editor @ 1440 | serious | span:nth-of-type(2)@55 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-13 | child-creation @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-14 | child-creation @ 1440 | moderate | child-creation-1440 uses 11 off-scale spacing values across 48 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 57.6px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-15 | child-creation @ 1440 | serious | span:nth-of-type(2)@76 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | child-creation @ 1440 | serious | span:nth-of-type(2)@79 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | child-creation @ 1440 | serious | span:nth-of-type(2)@82 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | child-creation @ 1440 | serious | span:nth-of-type(2)@85 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-19 | child-creation @ 1440 | serious | span:nth-of-type(2)@88 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-20 | child-creation @ 1440 | serious | span:nth-of-type(2)@91 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-21 | child-management @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-22 | child-management @ 1440 | moderate | child-management-1440 uses 12 off-scale spacing values across 78 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 57.6px, 70px, 72px, 80px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-23 | child-management @ 1440 | serious | span:nth-of-type(2)@134 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | child-management @ 1440 | serious | span:nth-of-type(2)@137 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-25 | child-management @ 1440 | serious | span:nth-of-type(2)@140 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-26 | child-management @ 1440 | serious | span:nth-of-type(2)@143 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-27 | child-management @ 1440 | serious | span:nth-of-type(2)@146 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-28 | child-management @ 1440 | serious | span:nth-of-type(2)@149 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-29 | per-child-settings @ 1440 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-30 | per-child-settings @ 1440 | moderate | per-child-settings-1440 uses 12 off-scale spacing values across 84 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 57.6px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-31 | per-child-settings @ 1440 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-32 | per-child-settings @ 1440 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-33 | per-child-settings @ 1440 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-34 | per-child-settings @ 1440 | moderate | input:nth-of-type(1)@56 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-35 | grownup-entry @ 1440 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-36 | grownup-entry @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-37 | portal @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-38 | portal @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-39 | profile-editor @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-40 | profile-editor @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-41 | child-creation @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-42 | child-creation @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-43 | child-management @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-44 | child-management @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-45 | per-child-settings @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-46 | per-child-settings @ 1440 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |

</details>

<details>
<summary>Call 6: 23 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | layout-picker-signed-in @ 1440 | moderate | layout-picker-signed-in-1440 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 151px, 170px, 226px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | grownup-area-child-session-redirect @ 1440 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-3 | grownup-area-child-session-redirect @ 1440 | moderate | grownup-area-child-session-redirect-1440 uses 11 off-scale spacing values across 29 elements: 6px, 10px, 18px, 20px, 22px, 28px, 36px, 57.6px, 70px, 72px, 80px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-4 | child-login @ 1920 | moderate | child-login-1920 uses 11 off-scale spacing values across 12 elements: 2px, 6px, 10px, 18px, 20px, 28px, 36px, 67.34px, 181px, 410px, 690px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-5 | layout-picker-signed-out @ 1920 | moderate | layout-picker-signed-out-1920 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 151px, 226px, 410px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-6 | Ribbon Road home @ 1920 | moderate | silk-home-1920 uses 18 off-scale spacing values across 77 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 50px, 54px, 75px, 80px, 110px, 129.94px, 176px, 220px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-7 | Ribbon Road home @ 1920 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-8 | Ribbon Road home @ 1920 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | Ribbon Road home @ 1920 | serious | div:nth-of-type(1)@3 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Ribbon Road question @ 1920 | moderate | silk-question-1920 uses 15 off-scale spacing values across 22 elements: 1px, 2.34px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 28px, 44px, 106px, 176px, 220px, 1104.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-11 | Ribbon Road question @ 1920 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-12 | Ribbon Road question @ 1920 | serious | div:nth-of-type(1)@40 has inconsistent sibling gaps: 20px, 1124.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-13 | Ribbon Road question @ 1920 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | Ribbon Road question @ 1920 | serious | div:nth-of-type(1)@3 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Ribbon Road question @ 1920 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | layout-picker-signed-in @ 1440 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-17 | grownup-area-child-session-redirect @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-18 | grownup-area-child-session-redirect @ 1440 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-19 | layout-picker-signed-out @ 1920 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-20 | Ribbon Road home @ 1920 | moderate | Section gap is 54px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-21 | Ribbon Road home @ 1920 | moderate | Card padding is 32px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-22 | Ribbon Road question @ 1920 | moderate | Section gap is 25px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-23 | Ribbon Road question @ 1920 | moderate | Card padding is 12px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |

</details>

<details>
<summary>Call 7: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Letter Post home @ 1920 | moderate | post-home-1920 uses 15 off-scale spacing values across 107 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 35.44px, 38px, 40px, 42px, 60px, 110px, 338px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Letter Post home @ 1920 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Letter Post home @ 1920 | serious | p:nth-of-type(1)@56 has inconsistent sibling gaps: 66.91px, 12px, 54.05px, 12px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Letter Post home @ 1920 | serious | div:nth-of-type(1)@67 has inconsistent sibling gaps: 197.39px, 231.31px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-5 | Letter Post home @ 1920 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@99 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@104 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@109 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@114 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@119 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@124 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-12 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@129 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-13 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@134 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@139 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-15 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@144 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@149 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@154 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@159 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-19 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@164 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-20 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@169 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-21 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@174 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-22 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@179 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-23 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@184 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@189 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-25 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@194 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-26 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@199 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-27 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@204 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-28 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@209 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-29 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@214 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-30 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@219 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-31 | Letter Post home @ 1920 | serious | span:nth-of-type(1)@224 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-32 | Letter Post question @ 1920 | moderate | post-question-1920 uses 14 off-scale spacing values across 24 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 40px, 42px, 60px, 338px, 375.8px, 1428.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-33 | Letter Post question @ 1920 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-34 | Letter Post question @ 1920 | serious | div:nth-of-type(1)@38 has inconsistent sibling gaps: 20px, 1448.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-35 | Letter Post question @ 1920 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-36 | Letter Post question @ 1920 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-37 | Moonboat home @ 1920 | moderate | space-home-1920 uses 17 off-scale spacing values across 77 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 35px, 42px, 45px, 60px, 65.94px, 75px, 80px, 168.69px, 338px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-38 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-39 | Moonboat home @ 1920 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 18px, 22px, 75px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-40 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@62 has inconsistent sibling gaps: 11px, 2px, 26px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-41 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@62 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-42 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@67 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 1920 | serious | T, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@322 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@323 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@324 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@325 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@326 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 1920 | serious | U, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@328 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@329 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@330 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@331 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@332 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 1920 | serious | V, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@334 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@335 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@336 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@337 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@338 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 1920 | serious | W, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@340 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@341 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@342 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@343 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@344 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 1920 | serious | X, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@346 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@347 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@348 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@349 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@350 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 1920 | serious | Y, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@352 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@353 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@354 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@355 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@356 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 1920 | serious | Z, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@358 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 8: 45 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | profile-editor @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | profile-editor @ 1920 | moderate | profile-editor-1920 uses 11 off-scale spacing values across 43 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 70px, 72px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | profile-editor @ 1920 | serious | span:nth-of-type(2)@40 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-4 | profile-editor @ 1920 | serious | span:nth-of-type(2)@43 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | profile-editor @ 1920 | serious | span:nth-of-type(2)@46 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | profile-editor @ 1920 | serious | span:nth-of-type(2)@49 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | profile-editor @ 1920 | serious | span:nth-of-type(2)@52 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | profile-editor @ 1920 | serious | span:nth-of-type(2)@55 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | child-creation @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-10 | child-creation @ 1920 | moderate | child-creation-1920 uses 11 off-scale spacing values across 46 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 70px, 72px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-11 | child-creation @ 1920 | serious | span:nth-of-type(2)@83 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-12 | child-creation @ 1920 | serious | span:nth-of-type(2)@86 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-13 | child-creation @ 1920 | serious | span:nth-of-type(2)@89 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | child-creation @ 1920 | serious | span:nth-of-type(2)@92 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-15 | child-creation @ 1920 | serious | span:nth-of-type(2)@95 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | child-creation @ 1920 | serious | span:nth-of-type(2)@98 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | child-management @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-18 | child-management @ 1920 | moderate | child-management-1920 uses 12 off-scale spacing values across 72 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 36px, 70px, 72px, 80px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-19 | child-management @ 1920 | serious | span:nth-of-type(2)@141 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-20 | child-management @ 1920 | serious | span:nth-of-type(2)@144 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-21 | child-management @ 1920 | serious | span:nth-of-type(2)@147 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-22 | child-management @ 1920 | serious | span:nth-of-type(2)@150 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-23 | child-management @ 1920 | serious | span:nth-of-type(2)@153 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | child-management @ 1920 | serious | span:nth-of-type(2)@156 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-25 | per-child-settings @ 1920 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-26 | per-child-settings @ 1920 | moderate | per-child-settings-1920 uses 12 off-scale spacing values across 83 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-27 | per-child-settings @ 1920 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-28 | per-child-settings @ 1920 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-29 | per-child-settings @ 1920 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-30 | per-child-settings @ 1920 | moderate | input:nth-of-type(1)@56 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-31 | per-child-settings @ 1920 | moderate | input:nth-of-type(1)@59 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-32 | layout-picker-signed-in @ 1920 | moderate | layout-picker-signed-in-1920 uses 10 off-scale spacing values across 15 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px, 151px, 226px, 410px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-33 | grownup-area-child-session-redirect @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-34 | grownup-area-child-session-redirect @ 1920 | moderate | grownup-area-child-session-redirect-1920 uses 11 off-scale spacing values across 25 elements: 6px, 10px, 18px, 20px, 22px, 28px, 36px, 70px, 72px, 80px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-35 | profile-editor @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-36 | profile-editor @ 1920 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-37 | child-creation @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-38 | child-creation @ 1920 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-39 | child-management @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-40 | child-management @ 1920 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-41 | per-child-settings @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-42 | per-child-settings @ 1920 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-43 | layout-picker-signed-in @ 1920 | moderate | Section gap is 24px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-44 | grownup-area-child-session-redirect @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-45 | grownup-area-child-session-redirect @ 1920 | moderate | Card padding is 36px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |

</details>

<details>
<summary>Call 9: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | child-login @ 390 | moderate | child-login-390 uses 6 off-scale spacing values across 12 elements: 2px, 6px, 10px, 18px, 20px, 101px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | layout-picker-signed-out @ 390 | moderate | layout-picker-signed-out-390 uses 7 off-scale spacing values across 14 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | Ribbon Road home @ 390 | moderate | silk-home-390 uses 11 off-scale spacing values across 73 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 34.94px, 55px, 204px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-4 | Ribbon Road home @ 390 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-5 | Ribbon Road home @ 390 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Ribbon Road home @ 390 | serious | div:nth-of-type(1)@3 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Ribbon Road home @ 390 | serious | H, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@228 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@229 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@230 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@231 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@232 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Ribbon Road home @ 390 | serious | I, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@234 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@235 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@236 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@237 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@238 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Ribbon Road home @ 390 | serious | J, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@240 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@241 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@242 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@243 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@244 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Ribbon Road home @ 390 | serious | K, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@246 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@247 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@248 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@249 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@250 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Ribbon Road home @ 390 | serious | L, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@252 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@253 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@254 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@255 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@256 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Ribbon Road home @ 390 | serious | M, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@258 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@259 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@260 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@261 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@262 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Ribbon Road home @ 390 | serious | N, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@264 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@265 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@266 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@267 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@268 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Ribbon Road home @ 390 | serious | O, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@270 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@271 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@272 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@273 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@274 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Ribbon Road home @ 390 | serious | P, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@276 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@277 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@278 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@279 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@280 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Ribbon Road home @ 390 | serious | Q, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@282 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@283 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@284 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@285 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@286 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Ribbon Road home @ 390 | serious | R, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@288 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@289 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@290 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@291 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@292 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Ribbon Road home @ 390 | serious | S, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@294 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@295 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@296 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@297 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@298 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Ribbon Road home @ 390 | serious | T, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@300 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 10: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Moonboat home @ 390 | moderate | space-home-390 uses 8 off-scale spacing values across 94 elements: 1px, 6px, 10px, 14px, 18px, 20px, 27px, 30px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Moonboat home @ 390 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Moonboat home @ 390 | serious | div:nth-of-type(2)@53 has inconsistent sibling gaps: 16.42px, 4px, 18px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Moonboat home @ 390 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Moonboat home @ 390 | serious | div:nth-of-type(2)@53 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Moonboat home @ 390 | serious | div:nth-of-type(2)@58 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Moonboat home @ 390 | serious | G, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Moonboat home @ 390 | serious | span:nth-of-type(1)@235 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@236 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Moonboat home @ 390 | serious | path:nth-of-type(1)@237 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Moonboat home @ 390 | serious | H, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Moonboat home @ 390 | serious | span:nth-of-type(1)@241 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@242 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Moonboat home @ 390 | serious | path:nth-of-type(1)@243 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Moonboat home @ 390 | serious | b:nth-of-type(1)@244 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Moonboat home @ 390 | serious | span:nth-of-type(2)@245 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Moonboat home @ 390 | serious | I, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Moonboat home @ 390 | serious | span:nth-of-type(1)@247 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@248 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Moonboat home @ 390 | serious | path:nth-of-type(1)@249 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Moonboat home @ 390 | serious | b:nth-of-type(1)@250 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Moonboat home @ 390 | serious | span:nth-of-type(2)@251 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Moonboat home @ 390 | serious | J, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 390 | serious | span:nth-of-type(1)@253 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@254 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 390 | serious | path:nth-of-type(1)@255 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 390 | serious | b:nth-of-type(1)@256 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 390 | serious | span:nth-of-type(2)@257 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 390 | serious | K, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 390 | serious | span:nth-of-type(1)@259 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@260 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 390 | serious | path:nth-of-type(1)@261 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 390 | serious | b:nth-of-type(1)@262 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 390 | serious | span:nth-of-type(2)@263 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 390 | serious | L, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 390 | serious | span:nth-of-type(1)@265 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@266 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 390 | serious | path:nth-of-type(1)@267 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 390 | serious | b:nth-of-type(1)@268 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 390 | serious | span:nth-of-type(2)@269 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 390 | serious | M, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 390 | serious | span:nth-of-type(1)@271 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@272 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 390 | serious | path:nth-of-type(1)@273 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 390 | serious | b:nth-of-type(1)@274 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 390 | serious | span:nth-of-type(2)@275 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 390 | serious | N, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 390 | serious | span:nth-of-type(1)@277 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@278 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 390 | serious | path:nth-of-type(1)@279 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 390 | serious | b:nth-of-type(1)@280 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 390 | serious | span:nth-of-type(2)@281 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 390 | serious | O, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 390 | serious | span:nth-of-type(1)@283 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@284 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 390 | serious | path:nth-of-type(1)@285 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 390 | serious | b:nth-of-type(1)@286 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 390 | serious | span:nth-of-type(2)@287 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 390 | serious | P, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 390 | serious | span:nth-of-type(1)@289 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@290 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 390 | serious | path:nth-of-type(1)@291 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 390 | serious | b:nth-of-type(1)@292 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 390 | serious | span:nth-of-type(2)@293 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 390 | serious | Q, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 390 | serious | span:nth-of-type(1)@295 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@296 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 390 | serious | path:nth-of-type(1)@297 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 390 | serious | b:nth-of-type(1)@298 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 390 | serious | span:nth-of-type(2)@299 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 390 | serious | R, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 390 | serious | span:nth-of-type(1)@301 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@302 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 390 | serious | path:nth-of-type(1)@303 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 390 | serious | b:nth-of-type(1)@304 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 390 | serious | span:nth-of-type(2)@305 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 390 | serious | S, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 390 | serious | span:nth-of-type(1)@307 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@308 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 390 | serious | path:nth-of-type(1)@309 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 11: 34 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | child-management @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | child-management @ 390 | moderate | child-management-390 uses 9 off-scale spacing values across 71 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | child-management @ 390 | serious | span:nth-of-type(2)@149 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-4 | child-management @ 390 | serious | span:nth-of-type(2)@152 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | child-management @ 390 | serious | span:nth-of-type(2)@155 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | child-management @ 390 | serious | span:nth-of-type(2)@158 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | child-management @ 390 | serious | span:nth-of-type(2)@161 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | child-management @ 390 | serious | span:nth-of-type(2)@164 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | per-child-settings @ 390 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-10 | per-child-settings @ 390 | moderate | per-child-settings-390 uses 11 off-scale spacing values across 77 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-11 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@23 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-12 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@28 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-13 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@33 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-14 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@36 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-15 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@39 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-16 | per-child-settings @ 390 | moderate | input:nth-of-type(1)@42 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-17 | layout-picker-signed-in @ 390 | moderate | layout-picker-signed-in-390 uses 7 off-scale spacing values across 14 elements: 2px, 10px, 14px, 18px, 20px, 28px, 30px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-18 | grownup-area-child-session-redirect @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-19 | grownup-area-child-session-redirect @ 390 | moderate | grownup-area-child-session-redirect-390 uses 8 off-scale spacing values across 23 elements: 6px, 10px, 18px, 20px, 22px, 28px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-20 | grownup-area-from-child-settings @ 1180 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-21 | grownup-area-from-child-settings @ 1180 | moderate | grownup-area-from-child-settings-1180 uses 11 off-scale spacing values across 83 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-22 | grownup-area-from-child-settings @ 1180 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-23 | grownup-area-from-child-settings @ 1180 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-24 | grownup-area-from-child-settings @ 1180 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-25 | grownup-area-from-child-settings @ 1440 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-26 | grownup-area-from-child-settings @ 1440 | moderate | grownup-area-from-child-settings-1440 uses 12 off-scale spacing values across 84 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 57.6px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-27 | grownup-area-from-child-settings @ 1440 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-28 | grownup-area-from-child-settings @ 1440 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-29 | grownup-area-from-child-settings @ 1440 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-30 | grownup-area-from-child-settings @ 1440 | moderate | input:nth-of-type(1)@56 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-31 | grownup-area-from-child-settings @ 1180 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-32 | grownup-area-from-child-settings @ 1180 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |
| spacing-33 | grownup-area-from-child-settings @ 1440 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-34 | grownup-area-from-child-settings @ 1440 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |

</details>

<details>
<summary>Call 12: 17 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | grownup-area-from-child-settings @ 1920 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | grownup-area-from-child-settings @ 1920 | moderate | grownup-area-from-child-settings-1920 uses 12 off-scale spacing values across 83 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | grownup-area-from-child-settings @ 1920 | moderate | input:nth-of-type(1)@43 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-4 | grownup-area-from-child-settings @ 1920 | moderate | input:nth-of-type(1)@48 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-5 | grownup-area-from-child-settings @ 1920 | moderate | input:nth-of-type(1)@53 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-6 | grownup-area-from-child-settings @ 1920 | moderate | input:nth-of-type(1)@56 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-7 | grownup-area-from-child-settings @ 1920 | moderate | input:nth-of-type(1)@59 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-8 | grownup-area-from-child-settings @ 390 | serious | Lock and go to gamesLock and go to games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-9 | grownup-area-from-child-settings @ 390 | moderate | grownup-area-from-child-settings-390 uses 11 off-scale spacing values across 77 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 40px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-10 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@23 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-11 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@28 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-12 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@33 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-13 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@36 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-14 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@39 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-15 | grownup-area-from-child-settings @ 390 | moderate | input:nth-of-type(1)@42 measures 24x24px, below the recommended 44x44px touch target. | Increase the interactive hit area to at least 44x44px without relying on the visible icon size. |
| spacing-16 | grownup-area-from-child-settings @ 1920 | moderate | Section gap is 28px; the comfortable density sets 32px (8 steps). | Use var(--layout-section-gap) or 2rem. |
| spacing-17 | grownup-area-from-child-settings @ 1920 | moderate | Card padding is 6px; the comfortable density sets 20px (5 steps). | Use var(--layout-card-padding) or 1.25rem. |

</details>

<details>
<summary>Call 13: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Letter Post question @ 1180 | moderate | post-question-1180 uses 11 off-scale spacing values across 25 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 29.5px, 40px, 197.3px, 833.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Letter Post question @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Letter Post question @ 1180 | serious | div:nth-of-type(1)@38 has inconsistent sibling gaps: 20px, 853.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Letter Post question @ 1180 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Letter Post question @ 1180 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Moonboat question @ 1180 | moderate | space-question-1180 uses 12 off-scale spacing values across 22 elements: 1px, 6px, 10px, 13.44px, 18px, 20px, 26px, 28px, 29.5px, 40.5px, 80px, 833.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-7 | Moonboat question @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-8 | Moonboat question @ 1180 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 20px, 853.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-9 | Moonboat question @ 1180 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | grownup-entry @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-11 | grownup-entry @ 1180 | moderate | grownup-entry-1180 uses 8 off-scale spacing values across 13 elements: 6px, 10px, 14px, 20px, 22px, 28px, 35.4px, 70px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-12 | Letter Post home @ 1180 | moderate | post-home-1180 uses 10 off-scale spacing values across 107 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 29.5px, 40.5px, 70.8px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-13 | Letter Post home @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-14 | Letter Post home @ 1180 | serious | p:nth-of-type(1)@56 has inconsistent sibling gaps: 66.91px, 12px, 54.05px, 12px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-15 | Letter Post home @ 1180 | serious | div:nth-of-type(1)@67 has inconsistent sibling gaps: 88.95px, 132.05px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-16 | Letter Post home @ 1180 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@99 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@104 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-19 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@109 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-20 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@114 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-21 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@119 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-22 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@124 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-23 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@129 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@134 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-25 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@139 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-26 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@144 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-27 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@149 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-28 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@154 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-29 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@159 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-30 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@164 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-31 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@169 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-32 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@174 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-33 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@179 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-34 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@184 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-35 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@189 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-36 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@194 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-37 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@199 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-38 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@204 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-39 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@209 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-40 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@214 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-41 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@219 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-42 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@224 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-43 | Letter Post home @ 1180 | serious | R, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Letter Post home @ 1180 | serious | S, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@342 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@343 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@344 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@345 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@346 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Letter Post home @ 1180 | serious | T, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@348 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@349 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@350 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@351 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@352 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Letter Post home @ 1180 | serious | U, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@354 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@355 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@356 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@357 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@358 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Letter Post home @ 1180 | serious | V, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@360 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@361 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@362 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@363 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@364 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Letter Post home @ 1180 | serious | W, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@366 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@367 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@368 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@369 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@370 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Letter Post home @ 1180 | serious | X, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Letter Post home @ 1180 | serious | span:nth-of-type(1)@372 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Letter Post home @ 1180 | serious | svg:nth-of-type(1)@373 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Letter Post home @ 1180 | serious | path:nth-of-type(1)@374 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Letter Post home @ 1180 | serious | b:nth-of-type(1)@375 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Letter Post home @ 1180 | serious | span:nth-of-type(2)@376 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Letter Post home @ 1180 | serious | Y, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 14: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | portal @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | portal @ 1180 | moderate | portal-1180 uses 9 off-scale spacing values across 28 elements: 6px, 10px, 18px, 20px, 22px, 28px, 35.4px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | profile-editor @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-4 | profile-editor @ 1180 | moderate | profile-editor-1180 uses 10 off-scale spacing values across 43 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 35.4px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-5 | profile-editor @ 1180 | serious | span:nth-of-type(2)@40 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | profile-editor @ 1180 | serious | span:nth-of-type(2)@43 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | profile-editor @ 1180 | serious | span:nth-of-type(2)@46 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | profile-editor @ 1180 | serious | span:nth-of-type(2)@49 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | profile-editor @ 1180 | serious | span:nth-of-type(2)@52 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | profile-editor @ 1180 | serious | span:nth-of-type(2)@55 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | child-creation @ 1180 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-12 | child-creation @ 1180 | moderate | child-creation-1180 uses 10 off-scale spacing values across 46 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 35.4px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-13 | child-creation @ 1180 | serious | span:nth-of-type(2)@69 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | child-creation @ 1180 | serious | span:nth-of-type(2)@72 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-15 | child-creation @ 1180 | serious | span:nth-of-type(2)@75 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | child-creation @ 1180 | serious | span:nth-of-type(2)@78 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | child-creation @ 1180 | serious | span:nth-of-type(2)@81 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | child-creation @ 1180 | serious | span:nth-of-type(2)@84 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-19 | Moonboat home @ 1180 | moderate | space-home-1180 uses 14 off-scale spacing values across 76 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 29.5px, 38.44px, 40.5px, 49.16px, 55px, 59px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-20 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-21 | Moonboat home @ 1180 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 18px, 22px, 55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-22 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@62 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-23 | Moonboat home @ 1180 | serious | div:nth-of-type(2)@67 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 1180 | serious | L, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@274 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@275 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@276 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 1180 | serious | M, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@280 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@281 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@282 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@283 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@284 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 1180 | serious | N, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@286 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@287 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@288 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@289 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@290 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 1180 | serious | O, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@292 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@293 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@294 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@295 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@296 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 1180 | serious | P, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@298 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@299 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@300 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@301 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@302 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 1180 | serious | Q, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@304 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@305 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@306 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@307 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@308 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 1180 | serious | R, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@310 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@311 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@312 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@313 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@314 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 1180 | serious | S, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@316 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@317 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@318 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@319 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@320 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 1180 | serious | T, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@322 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@323 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@324 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@325 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 1180 | serious | span:nth-of-type(2)@326 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 1180 | serious | U, ready to explore extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 1180 | serious | span:nth-of-type(1)@328 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 1180 | serious | svg:nth-of-type(1)@329 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 1180 | serious | path:nth-of-type(1)@330 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 1180 | serious | b:nth-of-type(1)@331 extends outside the 1180px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 15: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Letter Post question @ 1440 | moderate | post-question-1440 uses 13 off-scale spacing values across 25 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 36px, 40px, 164px, 271.39px, 1080.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Letter Post question @ 1440 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Letter Post question @ 1440 | serious | div:nth-of-type(1)@38 has inconsistent sibling gaps: 20px, 1100.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Letter Post question @ 1440 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Letter Post question @ 1440 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Moonboat question @ 1440 | moderate | space-question-1440 uses 14 off-scale spacing values across 22 elements: 1px, 6px, 10px, 13.44px, 18px, 20px, 26px, 28px, 30px, 36px, 80px, 84px, 164px, 1080.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-7 | Moonboat question @ 1440 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-8 | Moonboat question @ 1440 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 20px, 1100.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-9 | Moonboat question @ 1440 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | Moonboat question @ 1920 | moderate | space-question-1920 uses 15 off-scale spacing values across 21 elements: 1px, 6px, 10px, 13.44px, 18px, 20px, 26px, 28px, 30px, 42px, 60px, 80px, 258px, 338px, 1428.88px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-11 | Moonboat question @ 1920 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-12 | Moonboat question @ 1920 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 20px, 1448.88px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-13 | Moonboat question @ 1920 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | Moonboat home @ 1440 | moderate | space-home-1440 uses 15 off-scale spacing values across 76 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 28px, 30px, 36px, 38.44px, 55px, 72px, 125.2px, 164px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-15 | Moonboat home @ 1440 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-16 | Moonboat home @ 1440 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 18px, 22px, 55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-17 | Moonboat home @ 1440 | serious | div:nth-of-type(2)@62 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | Moonboat home @ 1440 | serious | div:nth-of-type(2)@67 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Moonboat home @ 1440 | serious | O, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@292 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@293 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@294 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@295 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@296 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 1440 | serious | P, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@298 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@299 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@300 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@301 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@302 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 1440 | serious | Q, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@304 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@305 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@306 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@307 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@308 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 1440 | serious | R, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@310 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@311 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@312 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@313 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@314 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 1440 | serious | S, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@316 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@317 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@318 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@319 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@320 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 1440 | serious | T, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@322 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@323 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@324 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@325 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@326 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 1440 | serious | U, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@328 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@329 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@330 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@331 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@332 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 1440 | serious | V, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@334 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@335 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@336 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@337 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@338 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 1440 | serious | W, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@340 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@341 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@342 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@343 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@344 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 1440 | serious | X, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@346 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 1440 | serious | svg:nth-of-type(1)@347 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 1440 | serious | path:nth-of-type(1)@348 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 1440 | serious | b:nth-of-type(1)@349 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 1440 | serious | span:nth-of-type(2)@350 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 1440 | serious | Y, ready to explore extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 1440 | serious | span:nth-of-type(1)@352 extends outside the 1440px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 16: 63 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | grownup-entry @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | grownup-entry @ 1920 | moderate | grownup-entry-1920 uses 9 off-scale spacing values across 12 elements: 6px, 10px, 14px, 20px, 22px, 28px, 36px, 70px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | portal @ 1920 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-4 | portal @ 1920 | moderate | portal-1920 uses 10 off-scale spacing values across 28 elements: 6px, 10px, 18px, 20px, 22px, 28px, 36px, 70px, 72px, 210px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-5 | Ribbon Road question @ 390 | moderate | silk-question-390 uses 11 off-scale spacing values across 18 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 30px, 126.55px, 204px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-6 | Ribbon Road question @ 390 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-7 | Ribbon Road question @ 390 | serious | div:nth-of-type(1)@33 has inconsistent sibling gaps: 10px, 136.55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-8 | Ribbon Road question @ 390 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | Ribbon Road question @ 390 | serious | div:nth-of-type(1)@3 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Ribbon Road question @ 390 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | Moonboat home @ 1920 | moderate | space-home-1920 uses 17 off-scale spacing values across 77 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 26px, 35px, 42px, 45px, 60px, 65.94px, 75px, 80px, 168.69px, 338px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-12 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-13 | Moonboat home @ 1920 | serious | div:nth-of-type(1)@34 has inconsistent sibling gaps: 18px, 22px, 75px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-14 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@62 has inconsistent sibling gaps: 11px, 2px, 26px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-15 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@62 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | Moonboat home @ 1920 | serious | div:nth-of-type(2)@67 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Moonboat home @ 1920 | serious | T, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@322 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@323 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@324 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@325 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@326 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Moonboat home @ 1920 | serious | U, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@328 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@329 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@330 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@331 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@332 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 1920 | serious | V, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@334 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@335 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@336 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@337 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@338 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 1920 | serious | W, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@340 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@341 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@342 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@343 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@344 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 1920 | serious | X, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@346 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@347 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@348 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@349 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@350 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 1920 | serious | Y, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@352 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@353 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@354 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@355 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@356 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 1920 | serious | Z, ready to explore extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 1920 | serious | span:nth-of-type(1)@358 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 1920 | serious | svg:nth-of-type(1)@359 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 1920 | serious | path:nth-of-type(1)@360 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 1920 | serious | b:nth-of-type(1)@361 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 1920 | serious | span:nth-of-type(2)@362 extends outside the 1920px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | grownup-entry @ 1920 | moderate | Section gap is 24px; the spacious density sets 48px (12 steps). | Use var(--layout-section-gap) or 3rem. |
| spacing-60 | grownup-entry @ 1920 | moderate | Card padding is 36px; the spacious density sets 24px (6 steps). | Use var(--layout-card-padding) or 1.5rem. |
| spacing-61 | portal @ 1920 | moderate | Section gap is 28px; the spacious density sets 48px (12 steps). | Use var(--layout-section-gap) or 3rem. |
| spacing-62 | portal @ 1920 | moderate | Card padding is 36px; the spacious density sets 24px (6 steps). | Use var(--layout-card-padding) or 1.5rem. |
| spacing-63 | Moonboat home @ 1920 | moderate | Card padding is 8.08px; the spacious density sets 24px (6 steps). | Use var(--layout-card-padding) or 1.5rem. |

</details>

<details>
<summary>Call 17: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Letter Post question @ 390 | moderate | post-question-390 uses 10 off-scale spacing values across 16 elements: 1px, 2.15px, 6px, 10px, 14px, 18px, 22px, 120px, 126.55px, 190px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Letter Post question @ 390 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Letter Post question @ 390 | serious | div:nth-of-type(1)@31 has inconsistent sibling gaps: 10px, 136.55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Letter Post question @ 390 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Letter Post question @ 390 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Moonboat question @ 390 | moderate | space-question-390 uses 10 off-scale spacing values across 18 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 115px, 126.55px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-7 | Moonboat question @ 390 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-8 | Moonboat question @ 390 | serious | div:nth-of-type(1)@27 has inconsistent sibling gaps: 10px, 136.55px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-9 | Moonboat question @ 390 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | Moonboat question @ 390 | serious | #announcer clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | grownup-entry @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-12 | grownup-entry @ 390 | moderate | grownup-entry-390 uses 7 off-scale spacing values across 11 elements: 6px, 10px, 14px, 20px, 22px, 28px, 70px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-13 | Ribbon Road home @ 390 | moderate | silk-home-390 uses 11 off-scale spacing values across 73 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 30px, 34.94px, 55px, 204px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-14 | Ribbon Road home @ 390 | serious | div:nth-of-type(2)@5 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-15 | Ribbon Road home @ 390 | serious | div:nth-of-type(1)@2 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | Ribbon Road home @ 390 | serious | div:nth-of-type(1)@3 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Ribbon Road home @ 390 | serious | H, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@228 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@229 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@230 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@231 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@232 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Ribbon Road home @ 390 | serious | I, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@234 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@235 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@236 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@237 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@238 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Ribbon Road home @ 390 | serious | J, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@240 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@241 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@242 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@243 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@244 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Ribbon Road home @ 390 | serious | K, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@246 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@247 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@248 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@249 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@250 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Ribbon Road home @ 390 | serious | L, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@252 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@253 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@254 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@255 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@256 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Ribbon Road home @ 390 | serious | M, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@258 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@259 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@260 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@261 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@262 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Ribbon Road home @ 390 | serious | N, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@264 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@265 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@266 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@267 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@268 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Ribbon Road home @ 390 | serious | O, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@270 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@271 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@272 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@273 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@274 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Ribbon Road home @ 390 | serious | P, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@276 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@277 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@278 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@279 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@280 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Ribbon Road home @ 390 | serious | Q, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@282 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@283 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@284 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Ribbon Road home @ 390 | serious | b:nth-of-type(1)@285 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Ribbon Road home @ 390 | serious | span:nth-of-type(2)@286 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Ribbon Road home @ 390 | serious | R, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Ribbon Road home @ 390 | serious | span:nth-of-type(1)@288 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Ribbon Road home @ 390 | serious | svg:nth-of-type(1)@289 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Ribbon Road home @ 390 | serious | path:nth-of-type(1)@290 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 18: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | portal @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-2 | portal @ 390 | moderate | portal-390 uses 8 off-scale spacing values across 28 elements: 6px, 10px, 18px, 20px, 22px, 28px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-3 | profile-editor @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-4 | profile-editor @ 390 | moderate | profile-editor-390 uses 9 off-scale spacing values across 43 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-5 | profile-editor @ 390 | serious | span:nth-of-type(2)@41 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | profile-editor @ 390 | serious | span:nth-of-type(2)@44 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-7 | profile-editor @ 390 | serious | span:nth-of-type(2)@47 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-8 | profile-editor @ 390 | serious | span:nth-of-type(2)@50 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-9 | profile-editor @ 390 | serious | span:nth-of-type(2)@53 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-10 | profile-editor @ 390 | serious | span:nth-of-type(2)@56 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-11 | child-creation @ 390 | serious | Back to the gamesBack to the games has asymmetric horizontal padding: 24px left and 70px right. | Use the same spacing token on both horizontal edges, unless the asymmetry is intentional and documented. |
| spacing-12 | child-creation @ 390 | moderate | child-creation-390 uses 9 off-scale spacing values across 46 elements: 6px, 10px, 14px, 18px, 20px, 22px, 28px, 70px, 72px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-13 | child-creation @ 390 | serious | span:nth-of-type(2)@91 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-14 | child-creation @ 390 | serious | span:nth-of-type(2)@94 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-15 | child-creation @ 390 | serious | span:nth-of-type(2)@97 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-16 | child-creation @ 390 | serious | span:nth-of-type(2)@100 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-17 | child-creation @ 390 | serious | span:nth-of-type(2)@103 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-18 | child-creation @ 390 | serious | span:nth-of-type(2)@106 clips horizontal and vertical content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-19 | Letter Post home @ 390 | moderate | post-home-390 uses 8 off-scale spacing values across 97 elements: 1px, 6px, 10px, 14px, 18px, 20px, 22px, 190px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-20 | Letter Post home @ 390 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-21 | Letter Post home @ 390 | serious | p:nth-of-type(1)@40 has inconsistent sibling gaps: 84.17px, 23.44px, 72.91px, 23.44px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-22 | Letter Post home @ 390 | serious | div:nth-of-type(1)@51 has inconsistent sibling gaps: 43.69px, 75.27px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-23 | Letter Post home @ 390 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-24 | Letter Post home @ 390 | serious | span:nth-of-type(1)@83 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-25 | Letter Post home @ 390 | serious | span:nth-of-type(1)@88 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-26 | Letter Post home @ 390 | serious | span:nth-of-type(1)@93 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-27 | Letter Post home @ 390 | serious | span:nth-of-type(1)@98 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-28 | Letter Post home @ 390 | serious | span:nth-of-type(1)@103 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-29 | Letter Post home @ 390 | serious | span:nth-of-type(1)@108 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-30 | Letter Post home @ 390 | serious | span:nth-of-type(1)@113 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-31 | Letter Post home @ 390 | serious | span:nth-of-type(1)@118 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-32 | Letter Post home @ 390 | serious | span:nth-of-type(1)@123 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-33 | Letter Post home @ 390 | serious | span:nth-of-type(1)@128 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-34 | Letter Post home @ 390 | serious | span:nth-of-type(1)@133 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-35 | Letter Post home @ 390 | serious | span:nth-of-type(1)@138 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-36 | Letter Post home @ 390 | serious | span:nth-of-type(1)@143 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-37 | Letter Post home @ 390 | serious | span:nth-of-type(1)@148 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-38 | Letter Post home @ 390 | serious | span:nth-of-type(1)@153 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-39 | Letter Post home @ 390 | serious | span:nth-of-type(1)@158 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-40 | Letter Post home @ 390 | serious | span:nth-of-type(1)@163 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-41 | Letter Post home @ 390 | serious | span:nth-of-type(1)@168 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-42 | Letter Post home @ 390 | serious | span:nth-of-type(1)@173 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-43 | Letter Post home @ 390 | serious | span:nth-of-type(1)@178 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-44 | Letter Post home @ 390 | serious | span:nth-of-type(1)@183 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-45 | Letter Post home @ 390 | serious | span:nth-of-type(1)@188 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-46 | Letter Post home @ 390 | serious | span:nth-of-type(1)@193 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-47 | Letter Post home @ 390 | serious | span:nth-of-type(1)@198 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-48 | Letter Post home @ 390 | serious | span:nth-of-type(1)@203 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-49 | Letter Post home @ 390 | serious | span:nth-of-type(1)@208 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-50 | Letter Post home @ 390 | serious | G, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Letter Post home @ 390 | serious | H, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Letter Post home @ 390 | serious | span:nth-of-type(1)@260 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Letter Post home @ 390 | serious | svg:nth-of-type(1)@261 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Letter Post home @ 390 | serious | path:nth-of-type(1)@262 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Letter Post home @ 390 | serious | b:nth-of-type(1)@263 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Letter Post home @ 390 | serious | span:nth-of-type(2)@264 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Letter Post home @ 390 | serious | I, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Letter Post home @ 390 | serious | span:nth-of-type(1)@266 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Letter Post home @ 390 | serious | svg:nth-of-type(1)@267 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Letter Post home @ 390 | serious | path:nth-of-type(1)@268 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Letter Post home @ 390 | serious | b:nth-of-type(1)@269 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Letter Post home @ 390 | serious | span:nth-of-type(2)@270 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Letter Post home @ 390 | serious | J, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Letter Post home @ 390 | serious | span:nth-of-type(1)@272 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Letter Post home @ 390 | serious | svg:nth-of-type(1)@273 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Letter Post home @ 390 | serious | path:nth-of-type(1)@274 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Letter Post home @ 390 | serious | b:nth-of-type(1)@275 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Letter Post home @ 390 | serious | span:nth-of-type(2)@276 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Letter Post home @ 390 | serious | K, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Letter Post home @ 390 | serious | span:nth-of-type(1)@278 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Letter Post home @ 390 | serious | svg:nth-of-type(1)@279 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Letter Post home @ 390 | serious | path:nth-of-type(1)@280 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Letter Post home @ 390 | serious | b:nth-of-type(1)@281 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Letter Post home @ 390 | serious | span:nth-of-type(2)@282 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Letter Post home @ 390 | serious | L, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Letter Post home @ 390 | serious | span:nth-of-type(1)@284 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Letter Post home @ 390 | serious | svg:nth-of-type(1)@285 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Letter Post home @ 390 | serious | path:nth-of-type(1)@286 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Letter Post home @ 390 | serious | b:nth-of-type(1)@287 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Letter Post home @ 390 | serious | span:nth-of-type(2)@288 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

<details>
<summary>Call 19: 80 returned findings</summary>

| ID | Screen @ width | Severity | Checker finding | Suggested fix |
| --- | --- | --- | --- | --- |
| spacing-1 | Moonboat home @ 390 | moderate | space-home-390 uses 8 off-scale spacing values across 94 elements: 1px, 6px, 10px, 14px, 18px, 20px, 27px, 30px. | Replace the measured values with the nearest project spacing token. Active scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. |
| spacing-2 | Moonboat home @ 390 | serious | div:nth-of-type(2)@3 has inconsistent sibling gaps: 16px, 24px, 0px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-3 | Moonboat home @ 390 | serious | div:nth-of-type(2)@53 has inconsistent sibling gaps: 16.42px, 4px, 18px. | Set one row or column gap token on the parent and remove competing child margins. |
| spacing-4 | Moonboat home @ 390 | serious | div:nth-of-type(1)@2 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-5 | Moonboat home @ 390 | serious | div:nth-of-type(2)@53 clips horizontal content. | Remove the conflicting fixed size, allow wrapping, or make overflow intentionally scrollable. |
| spacing-6 | Moonboat home @ 390 | serious | div:nth-of-type(2)@58 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-7 | Moonboat home @ 390 | serious | G, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-8 | Moonboat home @ 390 | serious | span:nth-of-type(1)@235 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-9 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@236 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-10 | Moonboat home @ 390 | serious | path:nth-of-type(1)@237 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-11 | Moonboat home @ 390 | serious | H, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-12 | Moonboat home @ 390 | serious | span:nth-of-type(1)@241 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-13 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@242 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-14 | Moonboat home @ 390 | serious | path:nth-of-type(1)@243 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-15 | Moonboat home @ 390 | serious | b:nth-of-type(1)@244 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-16 | Moonboat home @ 390 | serious | span:nth-of-type(2)@245 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-17 | Moonboat home @ 390 | serious | I, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-18 | Moonboat home @ 390 | serious | span:nth-of-type(1)@247 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-19 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@248 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-20 | Moonboat home @ 390 | serious | path:nth-of-type(1)@249 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-21 | Moonboat home @ 390 | serious | b:nth-of-type(1)@250 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-22 | Moonboat home @ 390 | serious | span:nth-of-type(2)@251 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-23 | Moonboat home @ 390 | serious | J, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-24 | Moonboat home @ 390 | serious | span:nth-of-type(1)@253 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-25 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@254 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-26 | Moonboat home @ 390 | serious | path:nth-of-type(1)@255 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-27 | Moonboat home @ 390 | serious | b:nth-of-type(1)@256 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-28 | Moonboat home @ 390 | serious | span:nth-of-type(2)@257 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-29 | Moonboat home @ 390 | serious | K, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-30 | Moonboat home @ 390 | serious | span:nth-of-type(1)@259 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-31 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@260 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-32 | Moonboat home @ 390 | serious | path:nth-of-type(1)@261 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-33 | Moonboat home @ 390 | serious | b:nth-of-type(1)@262 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-34 | Moonboat home @ 390 | serious | span:nth-of-type(2)@263 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-35 | Moonboat home @ 390 | serious | L, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-36 | Moonboat home @ 390 | serious | span:nth-of-type(1)@265 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-37 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@266 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-38 | Moonboat home @ 390 | serious | path:nth-of-type(1)@267 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-39 | Moonboat home @ 390 | serious | b:nth-of-type(1)@268 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-40 | Moonboat home @ 390 | serious | span:nth-of-type(2)@269 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-41 | Moonboat home @ 390 | serious | M, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-42 | Moonboat home @ 390 | serious | span:nth-of-type(1)@271 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-43 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@272 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-44 | Moonboat home @ 390 | serious | path:nth-of-type(1)@273 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-45 | Moonboat home @ 390 | serious | b:nth-of-type(1)@274 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-46 | Moonboat home @ 390 | serious | span:nth-of-type(2)@275 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-47 | Moonboat home @ 390 | serious | N, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-48 | Moonboat home @ 390 | serious | span:nth-of-type(1)@277 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-49 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@278 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-50 | Moonboat home @ 390 | serious | path:nth-of-type(1)@279 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-51 | Moonboat home @ 390 | serious | b:nth-of-type(1)@280 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-52 | Moonboat home @ 390 | serious | span:nth-of-type(2)@281 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-53 | Moonboat home @ 390 | serious | O, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-54 | Moonboat home @ 390 | serious | span:nth-of-type(1)@283 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-55 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@284 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-56 | Moonboat home @ 390 | serious | path:nth-of-type(1)@285 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-57 | Moonboat home @ 390 | serious | b:nth-of-type(1)@286 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-58 | Moonboat home @ 390 | serious | span:nth-of-type(2)@287 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-59 | Moonboat home @ 390 | serious | P, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-60 | Moonboat home @ 390 | serious | span:nth-of-type(1)@289 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-61 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@290 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-62 | Moonboat home @ 390 | serious | path:nth-of-type(1)@291 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-63 | Moonboat home @ 390 | serious | b:nth-of-type(1)@292 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-64 | Moonboat home @ 390 | serious | span:nth-of-type(2)@293 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-65 | Moonboat home @ 390 | serious | Q, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-66 | Moonboat home @ 390 | serious | span:nth-of-type(1)@295 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-67 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@296 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-68 | Moonboat home @ 390 | serious | path:nth-of-type(1)@297 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-69 | Moonboat home @ 390 | serious | b:nth-of-type(1)@298 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-70 | Moonboat home @ 390 | serious | span:nth-of-type(2)@299 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-71 | Moonboat home @ 390 | serious | R, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-72 | Moonboat home @ 390 | serious | span:nth-of-type(1)@301 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-73 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@302 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-74 | Moonboat home @ 390 | serious | path:nth-of-type(1)@303 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-75 | Moonboat home @ 390 | serious | b:nth-of-type(1)@304 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-76 | Moonboat home @ 390 | serious | span:nth-of-type(2)@305 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-77 | Moonboat home @ 390 | serious | S, ready to explore extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-78 | Moonboat home @ 390 | serious | span:nth-of-type(1)@307 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-79 | Moonboat home @ 390 | serious | svg:nth-of-type(1)@308 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |
| spacing-80 | Moonboat home @ 390 | serious | path:nth-of-type(1)@309 extends outside the 390px viewport. | Constrain the element to the viewport and verify the same content at narrow and wide breakpoints. |

</details>

### Always-latest links and delivery

Only `reports/design-check.md` is included in the Round 2 commit on `codex/home-flow-ribbon`. Main was not changed. The always-latest application links still follow the reviewed branch; branch previews may briefly lag a push because of hosting caches. The reviewed source commit above pins the actual capture target.

- [Child login and layout picker](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/index.html)
- [Grown-up portal and profile editor](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/accounts/index.html)
- [Per-child settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/grown-ups/index.html)
- [Ribbon Road](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v4-silk-thread/index.html)
- [Letter Post](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v1-letter-post/index.html)
- [Moonboat](https://raw.githack.com/CryptoBrad89/childrens-learning-game/refs/heads/codex/home-flow-ribbon/v3-moonboat/index.html)
- [Always-latest report, Round 2](https://github.com/CryptoBrad89/childrens-learning-game/blob/codex/home-flow-ribbon/reports/design-check.md#round-2-review-only)

Round 2 total: **19 Better Design calls**, with no script-discovery calls and no rejected requests. All 68 requested rendered states have returned findings. Captures completed without browser page errors. Report verification checks the state coverage, call limit compliance, returned finding counts, and report-only diff. App test suites were not rerun because this job changes only the report.
