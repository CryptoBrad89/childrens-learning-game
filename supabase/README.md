# Supabase: accounts and sync

The database is built only from `migrations/`, applied in filename order:

| File | What it does |
| --- | --- |
| `20261019120000_accounts_schema.sql` | Tables: profiles, groups, group members, rounds, settings, stickers, link attempts. Row-level security on, no table access for the API roles. |
| `20261019120100_accounts_functions.sql` | The `lw_*` API functions (security definer, `search_path` pinned) and their grants; helpers in the private `lw_private` schema. |
| `20261019140000_any_grownup_groups.sql` | Plain groups with no class/home kind; no caps on groups or group size; every grown-up in a group can do everything there. |
| `20261019180000_simple_grownups_corner.sql` | The simple corner: no public grown-up sign-up (only a signed-in grown-up makes another, `lw_create_grownup`); no group, board or code functions (each grown-up has one hidden team instead); uploaded child photos (`profiles.picture`); nothing callable without signing in. **Not applied yet.** |

**The first grown-up.** With no public sign-up, the project owner makes the
first grown-up in the Supabase SQL editor, once:

```sql
select lw_private.make_grownup('sign-in-name', 'a-password', 'Their name');
```

That grown-up adds every other grown-up from the corner. Grown-ups who already
exist (for example `demo-grownup`) keep working.

There are no edge functions, and no auth settings need to change.
"Confirm email" can stay on: every account the game makes is created
already confirmed by the database (`lw_private.create_auth_user`), with a
sign-in address on the reserved `.invalid` domain, so no email is ever sent.

`rollback/20261019120100_accounts_down.sql` removes everything again, and
`rollback/20261019180000_simple_grownups_corner_down.sql` undoes only the
simple corner (back to public sign-up, groups and codes). They are not
migrations and must never be applied automatically.

Tests: `npm ci --prefix tests/db` once, then `node tests/accounts_db.mjs`
runs these migrations in PGlite (Postgres in WebAssembly) on a copy of
Supabase's auth tables and checks the API and its permissions.
