# Call-list repeat-back

I read `CALL-LIST-JOB.md` fresh, including the revised layout approval rule. I inspected all three screenshots, all 11 approved Lucy images, and the asset README. This report is the only file I am writing this turn. Implementation remains held until Bradley gives the go. I have not accessed Supabase, run application tests, committed, or pushed.

## What I understand the four items to require

### 1. Six Lucy profile pictures

The six generic emoji choices become six pictures of the existing Lucy character. These are the built-in alternatives to uploading a personal photo. Photo uploads remain available. This applies to the profile choices for kids and grown-ups, and the selected picture must display consistently in account lists, profile views, and the game account menu.

I would use these six approved sources:

| Source | Planned crop and reason |
| --- | --- |
| `01-garden-b-1.jpg` | Lucy's smiling face and ears, with a little garden background. This is the locked reference Lucy. |
| `03-nap-1.jpg` | Her sleeping face and nearby paws. The closer face makes this stronger at small sizes than nap 2. |
| `07-seedream-letterpost-mailbox.png` | Her face beside a small amount of the red mailbox, only where it fits without shrinking her face. |
| `09-seedream-celebrate-leap.png` | Her happy face and flying ears, with some confetti if the round mask allows it. |
| `10-seedream-classroom-wave.png` | Her face and raised paw where possible. The scene is an image source, not a classroom feature. |
| `11-seedream-headtilt-nudge.png` | Her tilted face and ears. Its close framing makes it particularly suitable for an avatar. |

I also inspected garden 2, nap 2, both trots, and the Moonboat sleeping image. They remain approved spares. I would keep the suggested six unless actual small circular previews show a weak or indistinguishable crop. The front-facing `06-trot-2.jpg` is my first spare for an awake portrait; `08-seedream-moonboat-sleep.png` is the sleeping alternative.

After approval, I would create square, compressed derivatives from these files, leaving the source images intact. I would check the face positioning through the actual circular mask at the smallest display size. I would bundle the derivatives locally and include them in offline caching. No new image generation or remote image service is needed. The README's earlier handoff hold does not authorize implementation now; this revised job supplies the sources for planning.

I would first check the existing avatar storage contract, then choose the smallest compatible representation. Existing uploaded pictures must survive. Replacing the choices must not require a bulk rewrite of saved profiles or a change to Brandy's saved picture. Existing emoji values can display through a Lucy fallback without silently saving changes to those accounts.

### 2. The three screenshots

In `1-signout-overlap.png`, the floating Sign out pill covers the upper progress button. A second identical progress button appears below a row divider. I would put portal sign-out in a header flow that reserves its own space and wraps at narrow widths. The current shared account navigation gives it fixed positioning, so I would address that cause rather than add page padding guesses.

I would trace both progress buttons to their owners before removing anything. The screenshot alone cannot establish whether they are duplicate actions for one child or valid actions on two different child rows. Each child should retain one clearly associated progress action. Any redundant action for the same child should go.

In `2-portal-header.png`, Brandy's My account control sits above Kids, Grown-ups, and Game settings. Kids has a navy selected state; Game settings has purple text while the other unselected control uses navy. I would give the link consistent navy text in its normal and visited states at every width, retaining clear selected, hover, and keyboard-focus states. I would preserve My account access and the current visibility permissions for the tabs.

In `3-delete-dialog.png`, the action buttons appear before the selected account and typed-count confirmation. I would order the dialog as title, consequences, selected accounts, confirmation field, feedback, then Cancel and Permanently delete. The delete button must remain disabled until the exact count is entered. Its position and sticky styling must not lift it above the information needed to approve deletion.

“Additional administrator” is the displayed account name in this screenshot, not sufficient evidence of a second role. I would preserve the actual display name and username, avoid introducing role distinctions, and ensure the account identity wraps legibly. I would explain the existing fallback in plain language, such as “Kids without another linked grown-up stay linked to Brandy, the master account.” The deletion behavior and permissions stay as built: deleting a grown-up preserves kids and their progress.

### 3. Every grown-up can reset their own game progress

This includes the master. The purpose is to let someone start testing the game from the beginning without changing their login, profile, password, settings, or linked kids.

My proposed home is an always-visible **Reset my game progress…** action beside the grown-up's own progress summary in **My account**, outside the collapsed profile and password editors. The current code already selects the signed-in grown-up as the progress owner when My account opens. It shows that progress there, but the reset control I found belongs to the master’s editor for other grown-ups and is hidden for a master target. I have not verified backend self-reset support this turn.

From a game, I would make the existing **Profile and progress** account-menu link open `accounts/index.html#account` for a grown-up. That gives a short path to the same reset action rather than a separate destructive control inside gameplay. Kids would retain their appropriate progress destination and sign-out access.

The confirmation would identify the signed-in grown-up and explain what progress is erased. The request must target the authenticated grown-up, even if that grown-up previously viewed a child. I would verify server authorization, reset persistence, and local progress synchronization after approval so stale queued progress cannot restore the cleared rounds. If backend work is necessary, I would scope it to self-reset and preserve the existing rules for managing anyone else.

Providing Brandy with the feature does not authorize me to reset her account. I would prove master self-reset using local fixtures or an isolated test environment, never by executing it against Brandy.

### 4. Preserve Bradley's manual test changes

The live state at implementation time is the starting point. Deleted grown-ups and kids stay deleted. Changed passwords and settings stay changed. Earlier snapshots and reports are evidence, not seed data to replay. I would make no restoration or cleanup of existing live records. Any necessary backend change must preserve Bradley's edits.

## Layout-system approval

The protected system includes Ribbon Road, Letter Post, Moonboat, the picker, and all code or data defining a layout. Before changing any of it, I must explain why, name the exact proposed changes, and wait for Bradley's approval. General implementation approval does not automatically waive that rule. Portal, kid-page, dialog, and button work outside the layout system can proceed after the job go-ahead without a separate approval.

I do not expect to need changes to layout definitions, game art, gameplay, the picker, or the default layout. I do expect a narrow change to `accounts/navigation.js`, which renders account UI inside all three layouts. My conservative reading is that changing this game-facing integration needs layout approval too.

The proposed change is to render the chosen Lucy picture in the existing account avatar and make the grown-up's existing Profile and progress link lead directly to My account. The reason is consistent profile pictures and easy access to self-reset from a game. I would retain the existing menu placement and game controls. Any avatar sizing rule would be limited to that account UI. I would also add the six image derivatives to the offline manifest so the pictures remain available offline.

This is an approval proposal, not permission to edit those files now. If inspection later shows a need to change a layout file, picker code, layout data, or additional shared game behavior, I would give Bradley the exact additional scope and wait before making it. Portal fixes alone do not justify an unapproved layout change.

## Guards I will carry into implementation

- Before the first commit, verify local HEAD, `origin/codex/home-flow-ribbon`, and `origin/rollback/pre-call-list-2026-10-20-codex` all resolve to `d87c220`. Stop and report a mismatch. The local references currently all resolve to `d87c2201c97e619168a7be326fee35acc996ea8c`; this was a local read, not a fresh remote check. Recheck against the remote before implementation commits.
- Work on `codex/home-flow-ribbon`. Never change `main` or a rollback branch, and never force-push. After approval, make small commits and push as work passes checks. No commits or pushes in this turn.
- Protect username `brandy`, display name Brandy. Never rename, edit, delete, change the password, reset progress, or restore that account for testing. Inspect it only with read-only queries when that work is authorized. The final before-and-after comparison must also be read-only.
- Never delete or restore pre-existing live grown-ups or kids. Never undo Bradley's password or setting changes. Remove only disposable accounts created for this job, and only by their exact IDs.
- Keep cream chrome throughout. No public grown-up signup. No groups, classrooms, or codes. Keep one generic grown-up role, exactly one master, and the portal review's master and non-master permissions. Self-reset is the explicit requested addition, not a reason to broaden management of others.
- Keep Ribbon Road as default, kids' sign-out, 30-minute grown-up sessions, six-hour kid sessions, and grown-up logins working in the game. Do not introduce a Playing as box.
- If backend changes are needed later, add new migrations without editing old ones. Deploy Edge function changes only to project `ixjbgshhzeaosrzavssr`. No Supabase access or changes in this turn.
- Leave Brandy's separate request outside this job. Preserve all unrelated working-tree files.

## Planned execution and proof after approval

I would confirm the branch and rollback gate, inspect existing avatar and reset contracts, and capture the affected screens before changes. Then I would implement the six choices and portal fixes, followed by self-reset and its authorization checks. Game-facing account-menu work would wait for the layout approval described above.

I would update or add tests for every item and run the full suites. Coverage would include all six choices, uploads and offline pictures, progress-button ownership, sign-out spacing, visited-link color, dialog order and count gating, self-reset for regular and master fixtures, and preservation of unrelated data and permissions. I would review live-test scripts before running them so no suite modifies Brandy or pre-existing accounts. Hosted checks would run at 390, 768, and 1440 pixels, with keyboard and narrow-screen checks for dialogs and account controls.

The final `reports/call-list-pass.md` would include a TL;DR, a per-item done / not a bug / deferred table, changes and design departures with reasons, commits, before-and-after screenshots including all six profile options, test results, read-only master comparisons, test logins, and always-latest raw.githack links. A guard-blocked check would be reported explicitly rather than represented as passed.

## Where I would use my own judgment and questions

I would keep the proposed six images, prioritize faces over whole scenes, and put self-reset beside personal progress. I would verify the apparent duplicate buttons before removing a valid child's action. I would fix dialog reading order while preserving the actual account name, deletion semantics, and permission model.

The only approval question beyond the job go-ahead is whether Bradley approves the specific shared game account-menu changes described above. I have no other blocking product questions. Backend self-reset support and the apparent duplicate progress actions are implementation facts to verify after approval, not assumptions that require Bradley to investigate.

Work stops here pending Bradley's go-ahead.
