# Accounts backend

All migrations through `migrations/20261020021345_master_profile_edits.sql` are applied to project `ixjbgshhzeaosrzavssr`. `functions/accounts/index.ts` is deployed as `accounts` version 6. For a deliberate redeployment to this same project, use `supabase functions deploy accounts --project-ref ixjbgshhzeaosrzavssr`. Never target another project. The CLI reads `config.toml`: JWT gateway verification is disabled because the function validates every action itself using Auth `/user` and a database-grown-up role lookup. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` inside the Edge runtime. Never copy the service key into frontend configuration.

No Auth setting change is required: the Edge function creates confirmed synthetic email identities using the Auth Admin API. Handles map to `<handle>@accounts.littlewoof.invalid`. Every password is passed verbatim with only a six-character minimum. On interrupted creation, the same signed-in administrator repeats the same handle and password; the function verifies the password and immutable Auth app metadata before finishing provisioning. A definite failed provisioning attempt removes the orphan Auth identity only after confirming no profile exists.

The `accounts` POST actions are `create-grownup`, `create-child`, `link-child`, and `reset-child-password`. Every action needs a signed-in grown-up bearer token, checked against Auth and the database role. `create-grownup` and legacy `register` additionally require the sole master. There is no public administrator signup. Ordinary users cannot call `provision_account`. After master bootstrap, the service-only provisioning RPC also requires the master actor to create a grown-up.

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

The master is identified by `profiles.is_master`. Read its live username before login tests; never rename it to match a test fixture. `profiles.is_master` is stored in the database and survives username, password, picture, and display-name changes. A partial unique index permits at most one master. A trigger prevents deleting, demoting, changing the ID or role, or truncating away the seeded master, including Auth deletion cascades. Clients have no profile write grants. The master-only RLS policy permits reading other grown-up profiles without exposing unrelated children or their progress.

Only the master can call `list-grownups`, `delete-grownup`, and `reset-grownup-password`. Delete and reset take `grownup_id` and reject the master, children, and missing profiles. Delete also requires `confirm: "delete-grownup"`; reset takes `password`. Auth Admin performs deletion and password changes. The database deletion trigger preserves children and adds the master as guardian only when the deleted grown-up was their last guardian. It locks the permanent master row to serialize grown-up deletions. All other child and own-account actions remain available to regular grown-ups.

Run `node tests/portal_master.cjs` for live Auth, Edge, RLS, phone, and desktop checks. The helper creates disposable deletion targets and retains regular grown-ups and children in `reports/portal-master-test-logins.json`. Local SQL and Edge tests cover master protection and the master, regular grown-up, child, and anonymous permission matrix. Live sync and portal suites use the master login from that report.

Only the master can call `edit-grownup-profile` with `grownup_id`, `handle`, `display_name`, and `avatar`. `list-grownups` includes each profile picture. The service-only `edit_other_grownup_profile` RPC checks the actor is either the target grown-up or the master, then changes the profile and Auth username in one transaction. `edit-profile` always targets the caller, even if another account ID is supplied. Master authority remains tied to the account ID.

Run `node tests/portal_master_edit.cjs` for the live profile-editing browser contract at phone and desktop sizes. Set `PORTAL_PREVIEW` to a hosted preview base URL to test that build. The test checks the master read-only and edits disposable regular grown-ups. Set `MASTER_HANDLE` to the live username first. `node tests/portal_master_edit_edge.cjs` checks the handler permission matrix; `node tests/accounts_database.cjs` checks the actual SQL transactions and grants.
