# Supabase: accounts and sync

The database is built only from `migrations/`, applied in filename order:

| File | What it does |
| --- | --- |
| `20261019120000_accounts_schema.sql` | Tables: profiles, groups, group members, rounds, settings, stickers, link attempts. Row-level security on, no table access for the API roles. |
| `20261019120100_accounts_functions.sql` | The `lw_*` API functions (security definer, `search_path` pinned) and their grants; helpers in the private `lw_private` schema. |
| `20261019140000_any_grownup_groups.sql` | Plain groups with no class/home kind; no caps on groups or group size; every grown-up in a group can do everything there. |
| `20261019180000_simple_grownups_corner.sql` | The simple corner: no public grown-up sign-up (only a signed-in grown-up makes another, `lw_create_grownup`); no group, board or code functions (each grown-up has one hidden team instead); uploaded child photos (`profiles.picture`); nothing callable without signing in. |
| `20261021010000_risky_actions.sql` | Risky actions check the signed-in grown-up's own password in the database (`lw_private.password_problem`): delete, take off the list, remove grown-ups, reset children's progress, set children's passwords, add a grown-up, change a child's name. The versions without a password are dropped. Ten wrong passwords in 15 minutes pause that grown-up's risky actions. Bulk versions take any number of ids. No cap on settings edits per call. Progress resets (`profiles.progress_from`) make uploads of older play be ignored. |

**The first grown-up.** With no public sign-up, the project owner makes the
first grown-up in the Supabase SQL editor, once:

```sql
select lw_private.make_grownup('sign-in-name', 'a-password', 'Their name');
```

That grown-up adds every other grown-up from the corner. Grown-ups who already
exist (for example `demo-grownup`) keep working.

There are no edge functions. One Auth setting matters: **Require current
password when updating** (Authentication → Sign In / Providers → Email) should
be on. Without it, a signed-in person can change their own password through
Supabase Auth's own `/auth/v1/user` endpoint without knowing the current one.
The game never uses that endpoint (passwords change through `lw_change_password`
and `lw_set_children_password`, which check in the database), so turning it on
doesn't affect signing in or the corner.
"Confirm email" can stay on: every account the game makes is created
already confirmed by the database (`lw_private.create_auth_user`), with a
sign-in address on the reserved `.invalid` domain, so no email is ever sent.

`rollback/20261019120100_accounts_down.sql` removes everything again,
`rollback/20261019180000_simple_grownups_corner_down.sql` undoes only the
simple corner (back to public sign-up, groups and codes), and
`rollback/20261021010000_risky_actions_down.sql` undoes only the password
check and bulk functions (run it before the simple-corner rollback). They are not
migrations and must never be applied automatically.

Tests: `npm ci --prefix tests/db` once, then `node tests/accounts_db.mjs`
runs these migrations in PGlite (Postgres in WebAssembly) on a copy of
Supabase's auth tables and checks the API and its permissions.
