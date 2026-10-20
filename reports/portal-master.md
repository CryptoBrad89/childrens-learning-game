# One master grown-up

## TL;DR

`test` / `ABCD1234` is the sole master on **ixjbgshhzeaosrzavssr**. Only this account can create or delete grown-ups or reset another grown-up's password. Regular grown-ups keep all child management and their own profile, password, progress, and settings controls. Deleting a grown-up keeps every child and their progress.

The database migration and accounts Edge version 4 are deployed. The implementation is pushed on `codex/home-flow-ribbon`; `main` was not changed. The pushed checkpoint tag `pre-portal-master-2026-10-19-codex` points to `e98b0868d9b98497782f4a5ff53aee6d761bd46c`.

## Decisions

- Master authority uses `profiles.is_master` and the existing account ID, `f41a99f8-2952-49d0-982c-70485b142e0d`. A partial unique index prevents a second master. Triggers prevent removing the seeded master, changing its role or ID, clearing its master flag, or truncating it away. Own profile and password edits remain available.
- Edge reads authority from the database after validating the Auth user. Legacy `register` also requires the master. Clients cannot write profiles or invoke the service-only provisioning RPC. That RPC independently requires the master to create a grown-up. RLS lets only the master read other grown-up profiles; child progress access still requires a guardian link.
- Deletion uses Auth Admin. A database trigger preserves children in the same transaction. Shared children keep their other guardians. Children with no remaining guardian become linked to the master. The trigger locks the permanent master row to serialize grown-up deletions.
- Delete confirmation names both the display name and username, focuses Cancel, and explains what happens to children. Long usernames wrap on phones. Delete and reset controls exclude the master, and Edge rejects attempts to target the master or a child.
- The initial rename log confirmed the required credentials. During this run the same live account changed to `brandy`, with a different password. Restored the job's required `test` / `ABCD1234` through the trusted operator path, preserving the account ID, display name, avatar, and original linked child. No password policy changed.
- Rebuilt the offline manifest so existing installs can receive the portal changes. The local migration filename matches Supabase's applied version, `20261019201539_portal_master.sql`.

## Test logins

| Account | Username | Password |
| --- | --- | --- |
| Master grown-up | `test` | `ABCD1234` |
| Regular grown-up | `master_regular_mvfp6t8w390` | `8345bc` |
| Child linked to that regular grown-up | `master_kid_mvfp6t8w390` | `7234ab` |
| Child reassigned to the master after deletion | `master_orphan_mvfp6t8w390` | `7234ab` |

[All retained test accounts](portal-master-test-logins.json) include both screen sizes. Fresh sign-ins for the master, regular grown-up, and child passed; lowercase `abcd1234` was rejected. [Final login evidence](portal-master-final-logins.json). `.job/portal-master-test-logins.json` contains the same retained credentials.

## Verification

[Check summary](portal-master-checks.tsv) records the passing suites and all 18 browser game cases.

- [Live master browser contract](portal-master-browser.log) passes at 390px and 1440px. It tests master, regular grown-up, child, and anonymous requests for creation, deletion, password reset, and legacy registration. It also covers direct RLS denial, self-protection, cancellation, focused Cancel, confirmed deletion, rejected old login and session, retained shared-child progress, and orphan reassignment.
- [Database tests](portal-master-database.log) execute the real migrations and RLS. They cover unique and permanent master status, profile edits, Auth cascades, direct write and RPC denial, and child preservation. [Edge tests](portal-master-edge.log) execute the deployed handler source and cover the permission matrix. Strict TypeScript checking passes.
- [Round-two browser contract](portal-master-round2.log) passes at both sizes, including regular grown-up profile edits, child linking, settings, reset and delete, live progress, and stale offline round rejection. [Portal fixture](portal-master-portal-fixture.log), [live portal](portal-master-portal-live.log), [sync fixture](portal-master-sync-fixture.log), and [live sync](portal-master-sync-live.log) pass.
- [Static checks](portal-master-static.log) pass 6/6. Existing game-suite results are recorded in [the suite log](portal-master-existing-suites.log) and the six browser shard logs: [0](portal-master-browser-shard-0.log), [1](portal-master-browser-shard-1.log), [2](portal-master-browser-shard-2.log), [3](portal-master-browser-shard-3.log), [4](portal-master-browser-shard-4.log), [5](portal-master-browser-shard-5.log). The original unsharded browser run was deliberately restarted as six supported shards; its interrupted exit is superseded by those complete results.
- Live database audit found exactly one master, zero children without a guardian, and the original master-child link intact. Disposable fixtures from superseded test attempts were removed; retained accounts are listed above.

[Phone confirmation](portal-master-confirm-390.png) and [desktop controls](portal-master-controls-1440.png) were visually inspected. The additional screenshots cover [desktop confirmation](portal-master-confirm-1440.png) and [phone controls](portal-master-controls-390.png).

The security advisor reports only the existing [authenticated sync function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No new advisory appeared.

## Preview links

- [Grown-up portal](https://raw.githack.com/CryptoBrad89/childrens-learning-game/5368e4cc9071834f7d8bfc871868b86732157b0c/accounts/index.html)
- [Game home and child sign-in](https://raw.githack.com/CryptoBrad89/childrens-learning-game/5368e4cc9071834f7d8bfc871868b86732157b0c/index.html)
- [Grown-up settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/5368e4cc9071834f7d8bfc871868b86732157b0c/grown-ups/index.html)

The preview URLs pin the pushed implementation commit. The host first shows an external-content notice; choose **Open the page**. Hosted Chromium checks pass for master and regular grown-up sign-ins at 390px and 1440px, with the correct controls and no page errors or overflow. [Hosted verification log](portal-master-hosted.log). The full destructive-action contracts use the same app from a local static server against the deployed Supabase project.

## Master profile editing follow-up (2026-10-19)

The confirmed defect was stale UI. On the original hosted `c302bec` preview, the master could save its own name, username and icon, but the grown-ups list loaded only once per account ID. It kept the previous identity after saving, omitted pictures, and had no edit controls. [Hosted reproduction](portal-master-edit-reproduce.log). I could not reproduce a backend refusal: the Edge action, RLS and master-protection trigger allowed self edits. An old pinned preview keeps its old UI; use the new preview below.

The list now shows pictures and explicit edit controls, including **Edit my profile** on the master's row, and refreshes after saves. Other grown-ups open a named editor with display name, unique username, icon and upload controls. The master-only Edge action and service-only SQL transaction independently check authority. Profile and Auth username changes commit together; the old username stops working. Regular grown-ups retain self edits. Children, anonymous visitors and forged RPC calls are refused. Master authority stays tied to the account ID. The offline manifest was rebuilt.

Edge version 6 and migration `20261020021345_master_profile_edits.sql` are deployed only to `ixjbgshhzeaosrzavssr`. The implementation is pushed on `codex/home-flow-ribbon`; `main` was not changed. [New hosted portal](https://raw.githack.com/CryptoBrad89/childrens-learning-game/f214c9e14c00482023328cbabf50753743a98f26/accounts/index.html). Choose **Open the page** if the host shows its notice.

[Local browser](portal-master-edit-browser.log) and [hosted browser](portal-master-edit-hosted.log) contracts pass at 390px and 1440px, including real master edits, fresh renamed logins, exact restoration and the permission matrix. Run `node tests/portal_master_edit.cjs`; set `PORTAL_PREVIEW` to the hosted base URL to check that build. [SQL](portal-master-edit-database.log), [Edge](portal-master-edit-edge.log), [child settings](portal-master-edit-child-browser.log), [existing master](portal-master-edit-existing-master.log), and [round-two](portal-master-edit-round2.log) suites pass. [All checks](portal-master-edit-checks.tsv), [phone editor](portal-master-edit-390.png), and [desktop editor](portal-master-edit-1440.png). Final database audit found exactly one master, no children without guardians, and no anonymous or authenticated execution grant on the new RPC.

Master login remains **test / ABCD1234**, display name **Brandy**, with the original uploaded picture preserved byte-for-byte. [Fresh hosted login and exact profile comparison](portal-master-edit-final-login.json). During testing the live username independently changed to `brandy`; I restored the required `test` handle while preserving the name and picture. The password was never changed. [Retained grown-up and child test logins](portal-master-edit-logins.json) use `7234ab`. Existing child-settings reports and logins remain intact.
