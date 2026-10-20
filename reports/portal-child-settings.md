# Child profiles, settings, and safe sign-out

## TL;DR

All six sections of `PORTAL-CHILD-SETTINGS-JOB.md` are implemented on `codex/home-flow-ribbon`. Linked grown-ups can rename children and edit all eight settings for one or several children. Child overrides sync across devices; reset restores inheritance. Both roles have visible sign-out controls. Children expire six hours after sign-in; grown-ups, including the master, expire after **30 minutes of inactivity**.

Implementation: `c302bec2c28c95a4e891244e2e6f0b93a2c804a7`. Only Supabase **ixjbgshhzeaosrzavssr** was used. The existing checkpoint tag `pre-child-settings-2026-10-19-codex` is pushed at `a205c786f31ee2dad7de44944c030ccc865216f7`. No changes were made to `main`. The chained master-edit job remains separate.

## Placement and behavior

- **Manage this child** contains the display-name and username form, plus a settings link. Renaming updates the profile and Auth login together; the old handle stops working. Edge checks the caller's role and guardian link. Direct client profile writes and service RPC calls are denied.
- The settings page is now **Game settings**. Select kids in the portal, then choose **Settings for selected kids**, or open a kid and choose their settings. Explicit child parameters and a visible names/login scope replace the old implicit owner and duplicate checklist. Only the master changes defaults; the master can edit any kid, while other grown-ups edit only linked kids. See [the portal review pass](portal-review-pass.md) for the current structure and permissions.
- Voice, volume, effects, calm motion, letters, help timing, worlds, and child controls all support child overrides. The confirmation names the children and changed fields. Mixed values remain mixed until touched; bulk writes contain only touched keys and run atomically. Reset removes overrides, including for several selected children.
- Settings resolve as game defaults plus sparse child overrides. Pending offline control changes apply locally, then sync through the existing operation outbox into those same overrides. Replaying an already accepted operation cannot undo a later reset. Hosted unsaved play uses game defaults; local-file unsaved play uses built-in defaults.
- A consistent header **Sign out** appears on the portal, child management, profile, and settings pages. The layout picker says **👋 Not me? Sign out**; every game has **👋 Sign out** and its existing layout/home route. Manual sign-out returns to child login. The outbox stays on the device until that child signs in and syncs again.

## Session enforcement

The database tracks native `auth.sessions` rows and `not_after` deadlines. Children have a fixed six-hour ceiling from `created_at`; refresh and activity cannot extend it. Grown-up activity renews a 30-minute lease, subject to any stricter operator deadline. Background sync does not count as activity. Existing sessions were capped during migration.

Restrictive RLS policies reject expired sessions, `sync_batch` checks the session predicate, and Edge validates the caller's session before service-role work. Native deadlines also limit Auth refresh. A client timer handles offline expiry and navigation, with a safety note. Child expiry retains pending writes; grown-up expiry goes to grown-up sign-in. Other tabs receive updated deadlines. The app uses its own localStorage token store and does not set authentication cookies. Already issued Auth JWTs are not instantly erased; protected game data and administrative actions additionally validate the server session, as described in [Supabase's session documentation](https://supabase.com/docs/guides/auth/sessions).

The security advisor flags intentional authenticated SECURITY DEFINER access for `session_status` and the existing `sync_batch`, a private deny-all session table with no client policies, and the existing disabled leaked-password protection. The session RPC binds its lookup to `auth.uid()` and the JWT's session ID. The private table has no client grants.

## Repairs during resume

The first browser failure was a real password mismatch on the master account. Restored the required `test` / `ABCD1234` password on the existing master ID, preserving its display name, picture, and links. Fresh hosted sign-in and a final database check confirm it.

The next failure exposed the new form's `data-child` cache marker colliding with the portal's child-only visibility selector. Renamed that marker. Also preserved existing in-game setting controls through the new server settings model, offline startup, shared-device guest entry, and child sign-out from the progress page. Older browser checks now follow the requested sign-out navigation and wait for asynchronous visible results. Failed intermediate runs were superseded by complete passing runs below.

## Test logins

| Account | Username | Password |
| --- | --- | --- |
| Master grown-up | `test` | `ABCD1234` |
| Sally renamed 390 | `settings_renamed_mvg063te390` | `7234ab` |
| Jane 390 | `settings_jane_mvg063te390` | `7234ab` |
| Sally renamed 1440 | `settings_renamed_mvg06q6x1440` | `7234ab` |
| Jane 1440 | `settings_jane_mvg06q6x1440` | `7234ab` |

[Retained settings accounts](portal-child-settings-test-logins.json) include an unlinked grown-up for denial checks. Sally has custom settings; Jane uses defaults after the reset check. Both belong to the master and can be selected together. [Regular linked-grown-up sync accounts](portal-child-settings-sync-logins.json) and [master regression accounts](portal-child-settings-master-logins.json) are also retained. Original master-report credentials remain unchanged.

## Verification

- [Database](portal-child-settings-child_settings_database.log), [session database](portal-child-settings-session_limits_database.log), and [Edge](portal-child-settings-child_settings_edge.log): real migrations, rename/uniqueness, role and guardian denial, precedence/reset, all eight fields, atomic sparse bulk, outbox projection/retry, fixed child cap, adult inactivity renewal, exact expiry, revoked sessions, and RLS/RPC enforcement.
- [Live child-settings browser](portal-child-settings-browser.log): 390px and 1440px; rename and rejected old handle; child/unlinked denial; all eight settings; mixed bulk; two devices; defaults/guest/reset; visible sign-out on all grown-up surfaces; child picker/game sign-out; queued offline rounds surviving child and grown-up sign-out on the same device; progress recovery; both expiry routes and safety notes.
- [Hosted preview](portal-child-settings-hosted.log): 390px and 1440px, fresh master login, visible child and own profile fields, actual server overrides, header/picker/game sign-out, no overflow or browser errors. Screenshots: [phone](portal-child-settings-hosted-390.png), [desktop](portal-child-settings-hosted-1440.png).
- Existing [database](portal-child-settings-accounts_database.log), [Edge](portal-child-settings-accounts_database_edge.log), [master browser](portal-child-settings-master.log), [round-two browser](portal-child-settings-round2.log), [portal fixture](portal-child-settings-portal-fixture.log), [live portal](portal-child-settings-portal-live.log), [sync fixture](portal-child-settings-sync-fixture.log), [live sync](portal-child-settings-sync-live.log), and [home flow](portal-child-settings-home.log), and [linked-child selection](portal-child-settings-selection.log) pass.
- [Static checks](portal-child-settings-static.log): 6/6. [Strict TypeScript](portal-child-settings-typescript.log), [settings runtime](portal-child-settings-grown_ups_runtime.log), [settings browser](portal-child-settings-grown_ups_smoke.log), [runtime](portal-child-settings-runtime_smoke.log), [Ribbon Road](portal-child-settings-silk_smoke.log), [motion](portal-child-settings-motion_smoke.log), and [confetti](portal-child-settings-confetti_smoke.log) pass. All 18 broad game cases pass across shards [0](portal-child-settings-game-0.log), [1](portal-child-settings-game-1.log), [2](portal-child-settings-game-2.log), [3](portal-child-settings-game-3.log), [4](portal-child-settings-game-4.log), and [5](portal-child-settings-game-5.log).

The offline manifest was rebuilt. Final live audit: one master, zero children without a guardian, required master credentials valid.

## Preview links

- [Grown-up portal](https://raw.githack.com/CryptoBrad89/childrens-learning-game/c302bec2c28c95a4e891244e2e6f0b93a2c804a7/accounts/index.html)
- [Child login and layout picker](https://raw.githack.com/CryptoBrad89/childrens-learning-game/c302bec2c28c95a4e891244e2e6f0b93a2c804a7/index.html)
- [Settings](https://raw.githack.com/CryptoBrad89/childrens-learning-game/c302bec2c28c95a4e891244e2e6f0b93a2c804a7/grown-ups/index.html)

These pin the pushed implementation. If the preview host shows its external-content notice, choose **Open the page**.
