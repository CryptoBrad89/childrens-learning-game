# Portal review: repeat-back for Bradley

This is one portal restructure covering the original review and the permissions follow-up. I reread `PORTAL-REVIEW-JOB.md` and `PORTAL-REVIEW-FOLLOWUP.md`. The follow-up wins wherever they conflict. Section 11 is answered **yes**: Brandy must see and manage every kid. The earlier plan to leave that decision open is obsolete.

This document records my understanding and proposed choices. The implementation in the working tree is unfinished. I will wait for go before continuing. In this turn I have only read the instructions and working state and written this report.

## 1. What I understand I am building

A simple cream-colored portal organized around people and tasks. Kids and Grown-ups each own their content, My account holds the signed-in person's profile, password and progress, and Game settings always says whose settings will change. Grown-ups management is master-only. Kid management includes individual actions and useful bulk actions.

The findings are the problems to resolve. The review's proposed layouts, wording and backend shapes are suggestions. Every finding must receive an evidence-backed status in the final report; unfinished work must not be called fixed.

| Finding | What I intend to deliver |
| --- | --- |
| F1: Misleading “Grown-ups' corner” | Call it Game settings in portal navigation, the settings page and the game account menu. Make its purpose clear. |
| F2: Hidden settings target | Choose targets explicitly through a kid action or selected kids, with explicit URL parameters and a visible names/login scope label. Opening general Game settings must never silently inherit the last kid viewed. |
| F3: Tabs leak content and forget the view | Each view controls its whole content area. A kid page and its destructive actions disappear when switching to Grown-ups. Remember the current view across reloads. |
| F4: Kid deletion is buried | Opening a kid leads to that person's management page, replacing the list. Keep actions visible and labelled instead of burying Delete in a closed progress accordion. Include an obvious route back to Kids and deletion from the selection bar. |
| F5: No bulk delete | Add selectable kids and non-master grown-ups, counts, clear/select controls and bulk Delete. Confirm with every selected name and login, explain the consequences, and require typing the account count. Report successes and failures by person. Keep bulk kid settings and add bulk progress reset and master-only transfer. |
| F6: Person actions are scattered | Put profile, password reset, settings, assignments and destructive actions at the relevant person. Remove the independent password-reset dropdown workflow. My account owns self-service profile/password changes. |
| F7: Any grown-up can change everyone's defaults | Only the master can change global defaults. Enforce that in the Edge handler and database function, with a clear UI explanation for other grown-ups. |
| F8: Duplicate/wrong copy | Remove the misleading welcome banner, oversized identity card, duplicate self-profile entry and inconsistent section numbering. Use accurate per-view help and one home-page portal link. Preserve kid-facing game text. |
| F9: Long indistinguishable lists | Search by display name and login; keep logins visible. In the master's kid list, search also matches assigned grown-ups so Brandy can find all kids under a person. |
| F10: Grown-ups cannot view their progress | Show the signed-in grown-up's own progress through My account. Preserve grown-up game sign-in and recorded play. |
| F11: No unlink or avatar editing | Allow editing a kid's icon/uploaded picture after creation. Show linked grown-ups and provide unlink under the permissions below. Preserve the kid and progress when unlinking, including a last-link safeguard. |
| F12: Master cannot reach all kids | Resolve the gap now: Brandy sees every child profile and can manage any kid without first becoming linked. Apply this to reads, individual actions and bulk actions, including database access rules. |
| F13: Small UI defects | Explain how selection unlocks actions, keep dialog cancellation visible on a phone, and put long logins on a separate wrapping line rather than in oversized titles. |

### Permissions model

These are server rules, including database reads and callable database functions, not just hidden buttons. The server determines master status from trusted account data. Client-supplied roles or actor IDs must not grant access.

| Action | Brandy, the master | Other grown-ups |
| --- | --- | --- |
| See kid lists and progress | Every kid, even without a guardian link | Only linked kids |
| Create a kid | Yes | Yes; new kid links to its creator |
| Edit kid name, login and avatar | Any kid | Linked kids only |
| Reset kid password or progress | Any kid | Linked kids only |
| Change per-kid settings or delete a kid | Any kid, individually or in bulk | Linked kids only, including allowed bulk actions |
| Find/link an existing kid or share a kid | Master only; can assign any kid to grown-ups | No access to other people's kids or the existing-child linking workflow |
| Unlink | Any kid's grown-up links | Own link only, on a linked kid |
| Transfer kids between grown-ups | Master only, one kid or a selection | Denied |
| List/create/edit/delete/reset another grown-up | Master only; protected master account is excluded from destructive management | Denied |
| Change global game defaults | Master only | Denied |
| Own profile, password and game progress | Self-service exists, but this job must never exercise writes on Brandy | Self-service through My account |

Non-master requests for unlinked kids return 403 or a per-person `not-linked` result. Master requests skip guardian-link requirements for every relevant kid action. Linking/listing linkable existing kids becomes master-only. Existing session validation remains in force.

Transfer must be one deliberate operation that moves assignments, keeping the kid's ID, login, settings and progress. It needs a server transaction rather than a browser sequence that can stop between unlink and link. Both individual and bulk transfers need master/non-master tests. Proposed shared-kid semantics are listed under questions below.

### Kid assignment display

Every kid row in Brandy's list will visibly say **Linked to:** followed by every assigned grown-up. Brandy appears as **You**; other grown-ups appear as display name plus login. Shared kids show all assignments. This stays readable directly in the row at 390 px, with no tap, tooltip or hidden column required. The kid page shows the same assignments. Search matches assigned grown-up names and, as a useful extension, their logins.

## 2. Hard guards in my own words

1. Work on `codex/home-flow-ribbon`. Before the first commit, check local HEAD and both named remote references against `448ef96`; stop and report a mismatch. Never change `main` or the rollback branch and never force-push. After go, deliver small commits and push them as work proceeds. The earlier check passed, and the current local references still all resolve to `448ef96d1d8e1c3068649ecaeee81dba50b6b68d`. Fetching a local remote-tracking reference did not change the remote rollback branch.
2. Keep the real master account untouched: login `brandy`, display name Brandy. No rename, profile change, password change, deletion or temporary test mutation followed by restoration. Read its identity through read-only queries. Test privileged behavior with fixtures and disposable targets, without mutating the real master. The read-only check already returned `brandy` / Brandy and `is_master=true`.
3. Do not delete any account that existed before this job, including old test accounts. Bradley will do that cleanup himself. Only accounts created during this job may be cleaned up, identified by exact recorded IDs. No cleanup by name prefix or broad query.
4. Implement the answered master scope: all kids visible to and manageable by the master, with assignments shown. Other grown-ups remain limited to their own linked kids. Cover it with server tests. Do not preserve the earlier “decision pending” behavior.
5. Keep cream chrome, no public grown-up signup, no groups/classrooms/codes, one generic grown-up role, exactly one master, Ribbon Road as the default, kid sign-out, 30-minute grown-up sessions and 6-hour kid sessions. Grown-up credentials must keep working in the game. Do not add a “Playing as” box. Do not change kid-facing game wording, audio or Lucy art.
6. Add new migrations only; do not rewrite existing migration files. Deploy Edge changes only to Supabase project `ixjbgshhzeaosrzavssr`. Preserve the existing single-ID action contracts.
7. Treat `/workspace/lucy-portal-audit/` as read-only evidence. Do not alter its screenshots, code map or review files.
8. Inspect the inherited modified report JSONs and PNGs. Include them only if verified accurate; otherwise restore them when work resumes. Do not present inherited artifacts as fresh evidence.
9. Update affected tests along with the implementation. Add review coverage and master/non-master checks for every action, including transfer. Run the full maintained suites after completion, adapting unsafe historical live tests first so they cannot violate the account/data guards.
10. Finish `reports/portal-review-pass.md` with a TL;DR, F1–F13 statuses and reasons for deviations, permissions table, commits, before/after screenshots at 390/768/1440 px, actual test results, read-only master identity before/after, test logins used and always-latest raw.githack links. Leave the final log line to the runner.
11. Current hold: this turn changes only this requested repeat-back report. No implementation edits, migration execution, deployment, commit or push until Bradley says go.

## 3. Proposed differences from the recommendations

- **Keep Game settings as its own clearly labelled page.** Reuse the existing editor and child-change review flow, reached from portal navigation and explicit person/selection actions. The review suggests an in-place tab; a separate page can solve F1/F2 without duplicating the editor. It must still show its scope, offer clear return navigation and never rely on the previous progress owner.
- **Keep one kid-selection surface.** Select kids in the portal; show their names in Game settings and link back to choose a different set. Remove the editor's second checklist so two selections cannot disagree.
- **Use the existing grown-up editor dialog as the person editor.** Add password/reset and delete there, with the name and login separated and an always-reachable close control. This keeps a direct person-centered flow without introducing another route. Its phone layout must be proven.
- **Reuse stable element IDs and useful form wrappers where practical.** This limits unnecessary test churn, but hidden/collapsed wrappers must not reintroduce the buried actions reported in F4/F6. The current open kid accordion is an unfinished intermediate state, not a settled final design.
- **Allow partial success for bulk deletion.** Reject malformed requests before any deletion: empty lists, duplicates, non-UUIDs and more than 100 IDs. Check all target permissions first, then delete allowed targets sequentially and return a result for each ID. This lets Bradley see exactly what happened and preserves the existing orphan-link behavior for grown-up deletion.
- **Bulk progress reset may call the existing single-kid action sequentially.** Keep one confirm and per-person results. It does not require a separate batch endpoint if the existing contract is sufficient. Transfer is different: each move must be transactional on the server.
- **Do not build bulk password reset as part of this pass.** The review mentions its absence, but its concrete bulk workflows are settings, progress reset and deletion; the follow-up adds transfer. Each person's password reset will be easy to find. Sharing/linking remains master-only as Bradley now requires.
- **A separate grown-up filter is optional.** Assignment-aware search is required and will be built; a second filter is only useful if search is insufficient in phone testing.

The broader master permissions, transfer, master-only existing-child linking and assignment-aware search are now requirements from Bradley, not discretionary deviations.

## 4. What is already uncommitted

No task commit or push has happened. No migration has been applied and no Edge function has been deployed by this run. No account has been created, changed or deleted by this run. The master database query was read-only.

My partial implementation edits are in:

- `accounts/index.html`: compact My account entry; view navigation; searches and selection bars; child avatar controls; person-local password slots; expanded grown-up editor; bulk confirmation name lists and typed counts.
- `accounts/ui.js`: view/hash handling; search and selection state; per-person password placement; bulk delete/progress-reset wiring; child avatar handling; linked-grown-up listing/unlink UI.
- `accounts/style.css`: selection-bar and dialog layout changes. These have not received browser validation.
- `accounts/boot.js`: game account-menu label changed to Game settings.
- `grown-ups/index.html` and `grown-ups/grown-ups.js`: Game settings naming; explicit child parameters; visible scope; removal of the duplicate checklist; non-master defaults restrictions.
- `index.html`: removal of one duplicate portal link.
- `supabase/functions/accounts/index.ts`: draft bulk-delete handlers, master-only defaults/bulk grown-up deletion checks, linked-grown-up listing/unlink handling and child avatar updates.
- `supabase/migrations/20261020154722_portal_review.sql`: an **empty**, untracked migration placeholder created by the CLI. It contains no SQL and has not run. The database permission and unlink implementation is still missing.

These edits started before the permissions follow-up. They still contain obsolete linked-only checks for the master. The all-kids master list, visible row assignments, assignment-aware search, master sharing/transfer, master bypasses throughout the database and Edge actions, and master-only existing-child linking have **not** been implemented. The unlink handler references a database function that does not exist yet. Do not deploy this intermediate tree.

Only JavaScript syntax checks have been run on the edited portal/settings scripts. The required behavior tests, full suites, screenshots and final report remain undone. Existing tests still need updates for the new flows.

Inherited changes, present before my implementation edits:

- Test login JSONs: `reports/accounts-test-logins.json`, `reports/portal-child-settings-test-logins.json`, `reports/portal-master-edit-logins.json`, `reports/portal-master-test-logins.json`.
- PNGs: `reports/portal-child-settings-hosted-390.png`, `reports/portal-master-edit-1440.png`, `reports/portal-master-edit-390.png`.
- `tests/accounts_selection.cjs`: different default test credentials.
- `tests/run_fixlist.py`: extra hosted/live suites added to the runner.
- Numerous untracked job files, audit/working directories, previous reports, logs, screenshots and helper scripts were already present. They are not evidence of completed work in this run and will not be swept into a commit.

I have inspected the inherited change list and test diffs, but have not validated the inherited report contents/screenshots. They remain untouched pending verification. Implementation helper scripts were also created under `/tmp`; they are not repository deliverables.

## 5. Questions and proposed interpretations

1. **Transfer of a shared kid:** the follow-up defines transfer as moving a kid from one grown-up to another. My proposed meaning is: choose a source and destination, add/keep the destination link and remove the source link in one transaction, preserving unrelated grown-up links. Bulk transfer applies that move to selected kids. If a selected kid is not linked to the chosen source, report that kid as skipped rather than change another assignment. This avoids silently removing other grown-ups from a shared kid. Please correct this if transfer should instead replace every existing assignment.
2. **Unlinking the last grown-up:** I propose the review's safeguard: keep/rehome the kid with the master. Removing the master's only remaining link cannot leave the kid unassigned; show a clear explanation rather than claim that link was removed. Transfer to another grown-up can move it cleanly.
3. **Other grown-ups' progress:** I read the follow-up as requiring Brandy to reset any kid's progress and manage every other grown-up's account, while F10 requires each grown-up to see their own progress. It does not explicitly require Brandy to reset another grown-up's game progress. That extra action is not in the current plan unless “the same” was intended to include it.
4. **All-kid visibility:** there is no remaining question about this. Brandy sees and manages all kids; regular grown-ups only see their linked kids. I will update both server authorization and database access rules, rather than merely widening the list in the browser.

Waiting for Bradley's go. All existing implementation edits are preserved.
