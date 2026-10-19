# Supabase: accounts and sync

The database is built only from `migrations/`, applied in filename order:

| File | What it does |
| --- | --- |
| `20261019120000_accounts_schema.sql` | Tables: profiles, groups (classes and homes), group members, rounds, settings, stickers, link attempts. Row-level security on, no table access for the API roles. |
| `20261019120100_accounts_functions.sql` | The `lw_*` API functions (security definer, `search_path` pinned) and their grants; helpers in the private `lw_private` schema. |

There are no edge functions, and no auth settings need to change.
"Confirm email" can stay on: every account the game makes is created
already confirmed by the database (`lw_private.create_auth_user`), with a
sign-in address on the reserved `.invalid` domain, so no email is ever sent.

`rollback/20261019120100_accounts_down.sql` removes everything again. It is
not a migration and must never be applied automatically.

Tests: `npm ci --prefix tests/db` once, then `node tests/accounts_db.mjs`
runs these migrations in PGlite (Postgres in WebAssembly) on a copy of
Supabase's auth tables and checks the API and its permissions.
