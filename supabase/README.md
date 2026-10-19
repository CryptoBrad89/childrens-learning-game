# Accounts backend

The migrations `migrations/20261019060259_accounts_sync.sql` and `migrations/20261019175141_portal_admin_avatars.sql` are applied to project `ixjbgshhzeaosrzavssr`, and `functions/accounts/index.ts` is deployed as `accounts` version 2. For a deliberate redeployment to this same project, use `supabase functions deploy accounts --project-ref ixjbgshhzeaosrzavssr`. Never target another project. The CLI reads `config.toml`: JWT gateway verification is disabled because the function validates every action itself using Auth `/user` and a database-grown-up role lookup. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` inside the Edge runtime. Never copy the service key into frontend configuration.

No Auth setting change is required: the Edge function creates confirmed synthetic email identities using the Auth Admin API. Handles map to `<handle>@accounts.littlewoof.invalid`. Every password is passed verbatim with only a six-character minimum. On interrupted creation, the same signed-in administrator repeats the same handle and password; the function verifies the password and immutable Auth app metadata before finishing provisioning. A definite failed provisioning attempt removes the orphan Auth identity only after confirming no profile exists.

The `accounts` POST actions are `create-grownup`, `create-child`, `link-child`, and `reset-child-password`. Every action needs a signed-in grown-up bearer token, checked against Auth and the database role. Legacy `register` requests use the same permission check. There is no public administrator signup. Initial administrator bootstrap is available only to a trusted service operator; ordinary users cannot call `provision_account`.

Creation accepts `handle`, `password`, `display_name`. Child creation also accepts `avatar`: one of the six UI icons or a PNG/JPEG/WebP data URL of at most 150,000 characters. The UI converts any browser-decodable uploaded picture to a JPEG with a longest side of 256 pixels. Avatars live in the RLS-protected child profile and are written only by the service role. Repeating interrupted creation with the same administrator and credentials also completes the avatar write. Linking accepts the child's `handle` and `password`; resetting accepts `child_id` and `password`. Creation/linking return `{profile}`; reset returns `{ok:true}`. Errors return `{error}`. Groups and codes have no portal controls; existing group data remains stored for compatibility.

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
