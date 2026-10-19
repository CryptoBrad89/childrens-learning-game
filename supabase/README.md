# Accounts backend

The migration `migrations/20261019060259_accounts_sync.sql` is applied to project `ixjbgshhzeaosrzavssr`, and `functions/accounts/index.ts` is deployed as `accounts` version 1. For a deliberate redeployment to this same project, use `supabase functions deploy accounts --project-ref ixjbgshhzeaosrzavssr`. Never target another project. The CLI reads `config.toml`: JWT gateway verification must be disabled because registration is public. The function validates protected actions using Auth `/user` and a database-grown-up role lookup. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` inside the Edge runtime. Never copy the service key into frontend configuration.

No Auth setting change is required: the Edge function creates confirmed synthetic email identities using the Auth Admin API. Handles map to `<handle>@accounts.littlewoof.invalid`. Every password is passed verbatim with only a six-character minimum. On an interrupted registration, repeat the same handle and password; the function verifies the password and immutable Auth app metadata before finishing provisioning. A definite failed provisioning attempt removes the orphan Auth identity only after confirming no profile exists.

The `accounts` POST actions are `register`, `create-child`, `link-child`, and `reset-child-password`. Registration and child creation accept `handle`, `password`, `display_name`; child creation additionally accepts optional `class_id` belonging to the caller and atomically creates its membership; linking accepts the child's `handle` and `password`; resetting accepts `child_id` and `password`. Protected actions need a grown-up bearer token. Creation/linking return `{profile}`; reset returns `{ok:true}`. Errors return `{error}`.

Clients append UUID-addressed round and setting events through `sync_batch(p_owner,p_events)`. A batch of up to 100 events commits atomically and returns `{acknowledged:[id]}`. An identical retry is acknowledged without inserting again; conflicting reuse of a UUID fails the batch. Pull `operations` for the person in ascending `seq` order with pagination. Rebuild progress and achievements from rounds; reduce each setting field in server sequence order. Full pulls handle transactions committed in a different order from identity sequence allocation. Clients cannot supply server sequence or timestamp columns, or update/delete events.

All exposed tables have RLS and explicit grants. Person access is self or a linked guardian; class management belongs to its grown-up owner and memberships require an existing guardian relationship. Profile/guardian creation is available only to the Edge service role. The private caller-derived policy helpers avoid recursive RLS without trusting editable user metadata. Account role is stored in `profiles`; retry provenance uses server-written Auth `app_metadata`.

Run local SQL and Edge transport tests without credentials:

```sh
npm install --prefix .job/db-tools --no-audit --no-fund @electric-sql/pglite@0.3.14 typescript@5.9.3
node tests/accounts_database.cjs
node tests/accounts_database_edge.cjs
```

The SQL test executes the actual migration in PostgreSQL WASM with simulated Supabase roles and `auth.uid()`. It covers RLS, immutable writes, duplicate delivery, conflicts, batch rollback and class permissions. The Edge test executes the real handler with transport doubles; live Auth/Edge deployment still needs a real project smoke test. Neither script applies anything remotely.

For a strict Edge TypeScript check using the same pinned TypeScript test tool, create `.job/db-tools/deno.d.ts` with this minimal runtime declaration:

```ts
declare const Deno: {env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
```

Then run:

```sh
.job/db-tools/node_modules/.bin/tsc --noEmit --strict --target ES2022 --module ESNext --lib ES2022,DOM .job/db-tools/deno.d.ts supabase/functions/accounts/index.ts
```
