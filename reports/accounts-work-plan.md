# Accounts build workflow

1. Read pstack principles and ground the existing game and settings APIs.
2. Compare two account and sync sketches. Prefer durable UUID operations to snapshots with per-device counters.
3. Build the schema, privileged provisioning function, account store, and browser verification harness.
4. Add account screens and connect game settings, themes, mute, and completed rounds.
5. Generate an offline cache manifest and test existing journeys without screenshots.
6. Review schema and local behavior. Apply the exact migration and Edge Function only to ixjbgshhzeaosrzavssr, as authorized by the updated job.
7. Run real two-profile offline sync and access-control tests, then commit and push only this branch.

Done requires existing tests passing, the deployed Supabase project accepting real accounts, and two isolated browser profiles proving offline round, setting, and achievement sync without loss or duplicate counts. Deployment and the live two-profile test are verified in accounts-deployment.json and accounts-live.log.

The throughput checkpoint is one shared account module and two gameplay hooks, rather than three independent implementations. SQL, UI, and the local account store have separate writers. Each ends in repeatable checks.

## Architecture synthesis

Both read-only candidates recommend real Supabase Auth UUIDs and a durable round ledger. Candidate B considered per-device counters with set union; rejected because restored caches and device identities complicate retry proof. Candidate A preferred confirmed grown-up email and field conflict prompts. The chosen base is B's global handles for every person. The public registration function gives grown-ups only their own resources, matching ordinary signup. This avoids email delivery as a classroom dependency while keeping email confirmation enabled. Child provisioning requires a grown-up session.

All account settings belong to the target person. Classes organize existing children, and a parent links the child's existing account using its credentials. A child never needs a second home account. A server-assigned sequence orders immutable setting operations per field. The last newly accepted edit wins; retrying an older UUID cannot win again. UUID round union supplies progress and derived achievements. No device clock decides conflicts.

IndexedDB stores operations and pending work per account. Supabase REST and Auth calls use fetch, with no remote runtime dependency. Full paginated pulls deliberately trade bandwidth for simple complete reconciliation and avoid unsafe sequence cursors across concurrent transactions.
