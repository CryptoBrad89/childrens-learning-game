# Accounts and sync

## TL;DR

Use Firebase Authentication and Cloud Firestore on the free Spark plan. Grown-ups get a normal email and password. Children do not. A child is a name and a picture inside a class or a family, and any grown-up who has joined that group can open the picture grid on any Chromebook or tablet.

Progress is a list of small events, one per correct answer, so two devices can both add to the same child and neither wipe the other out. After a grown-up starts the class once while online, Firestore's offline cache plus a service worker keeps the game playable through a wifi drop, then syncs when the network returns. A Chromebook that has never loaded that class still needs one online start.

Remove the hold-and-question gate. The grown-up password is the lock. Opening Grown-ups asks for that password again, so a child who finds the link cannot change the class.

Skip MySQL unless the school's network blocks Google. Skip Supabase for this job: the free database pauses after a week of inactivity, and offline sync is a second product or custom work. This plan does not use privacy regulations as a design input.

## Recommendation

Firebase Spark is the best fit for a static game, shared Chromebooks, and an owner who would rather not run a database.

Grown-up sign-in, password reset, and the database are hosted. The free quotas cover a class of 20–30 children on 30 Chromebooks if the app prefetches the class once and does not hold a live listener open on every machine. Email-and-password auth and Firestore both work on Spark with no credit card. Cloud Functions are not required for the flows below, which is why this stays on Spark.

The game files can stay on the owner's existing web host. They do need to be served over HTTPS so a service worker can cache them. Firebase is only the account system and the saved data.

If the Chromebooks cannot reach Google (`firestore.googleapis.com` and `identitytoolkit.googleapis.com`), stop and use the MySQL fallback in the comparison below. That is the one fact that flips this recommendation.

## Options compared

| | Firebase Spark (pick) | Supabase | MySQL and PHP on his host | PowerSync on top of Supabase or MySQL |
| --- | --- | --- | --- | --- |
| What he runs | A Firebase project. Static files stay on his host. | A Supabase project. | PHP, MySQL, backups, HTTPS, and the sync protocol. | A database plus a separate sync service. |
| Setup | Create a project, turn on email auth and Firestore, paste the web config, upload rules and the static site. | Create a project, write tables and row policies, paste the keys. | Create the database and a database user, upload PHP, obtain HTTPS. | The database setup, then a PowerSync instance and a sync schema. |
| Running cost at this size | $0 inside the free quota. A much larger school moves to Blaze and pays per read and write, which is pennies past the free line. | Free projects pause after 7 days without traffic. Keeping a school project awake is the Pro plan, from $25 a month. | $0 if the web host is already paid for. His time for backups and PHP upgrades. | PowerSync's free project also deactivates after a week. The Pro plan starts at $49 a month. |
| Offline | Built in. The web SDK caches documents it has already read and queues writes. Chrome on a Chromebook is a supported browser. | No built-in offline sync. We would write an IndexedDB queue ourselves. | Same custom queue as Supabase. | Strong offline sync. It is a second service to operate and pay for. |
| Security | Firebase stores the password hash. Security rules we ship decide which grown-up can read which child. The web config is public by design. There is no admin key in the game. | Row policies can express the same limits. We would also build token handling for the offline queue. | We hash passwords, write every query with placeholders, and store session tokens. More of the risk sits on this repo and on his host. | The sync service is another place a rule can be wrong. |
| Child sign-in | A picture tap inside a group the grown-up already unlocked. No child password, no Cloud Function. | Same shape, custom sync code. | Same shape, custom sync code. | Same shape, extra product. |

PouchDB syncing to a CouchDB server is the other offline-first classic. It asks the owner to run a database, which is the job he would rather not take on. Custom tokens and a Cloud Function on the Blaze plan would also work, and they are unnecessary if the grown-up session is what authorizes the picture grid.

## Accounts and roles

Four kinds of person, two kinds of login.

- **Grown-up.** Email and password. This is a teacher, a parent, a caregiver, or any other adult. One account can belong to more than one group, so the same person can have a classroom at school and a family at home.
- **Group.** Either a class or a family. It has a name, a join code, and default settings for new children.
- **Child.** A display name and a picture. No email and no password. The child belongs to one group. Their settings, progress, and achievements hang off this record, so they follow the child onto every device that has opened the group.
- **Helper.** A second grown-up in the same group, added with the join code. A helper can start the picture grid, add a child, and change that group's settings. Deleting the group stays with the grown-up who created it.

There is no separate "teacher" and "parent" role. The group is what differs. The classroom group has about 30 pictures. The family group has one or a few.

A child who should exist both at school and at home is one record, in the classroom group, and the parent joins that group with the code. A second profile for the same child would split their progress.

Signed-out play stays available and is labeled "This device only. Not saved." A substitute with no account can still open the game. Nothing from that sitting is uploaded onto a real child later.

## Child login flow

A 3-year-old never sees a keyboard.

1. A grown-up has already signed in on that Chromebook or tablet and chosen the group. On a good morning they did this once while the wifi worked.
2. The screen is a grid of large pictures and first names. Targets stay at least 60px, same as the rest of the game.
3. The child taps their picture. The app sets the active child in memory and loads that child's settings and progress from the local cache.
4. They play. The stamp strip, constellation, or sound thread for this sitting still resets when the page loads, because that celebration is about the sitting. Letters they have already practiced show on the shelf from the saved record, so a different Chromebook tomorrow still knows them.
5. "All done" is a large control that returns to the picture grid. It does not ask for a password. The next child taps their own picture. The previous child's queued writes stay in the cache until the network accepts them.

Pictures for the first version come from a built-in set (animals and simple objects already in the spirit of the game), chosen by the grown-up when they add the child. A photo of the child is a later phase. The built-in set works offline and needs no upload step.

A QR code is a poor first login for this room. Shared Chromebooks mean a camera, permission prompts, and a printed card a 3-year-old has to hold still. The picture grid is the login. A QR code can come later as a shortcut for a grown-up's phone, not for the child.

The honest offline limit: the picture only works on a device that has already downloaded that group. The first Chromebook of the day needs wifi long enough for the grown-up to sign in and start the group. After that, a wifi drop during play is fine. A machine that was wiped overnight, or a Chromebook set to clear data on sign-out, needs that online start again. The child's progress is still on the server. The new machine is what has to catch up.

## Grown-up login flow

1. First visit on a phone, laptop, or Chromebook: create an account with email, password, and a display name. Firebase sends the password reset mail. The owner does not run an email server.
2. They create a group and add children: name, picture, and the group's default letters and adventures.
3. The app remembers the grown-up in this browser. Next time they land on the picture grid for the last group they opened.
4. On a new device they type the email and password once, then see the same groups and the same children.
5. A second adult joins by typing the group code. The code is long enough that guessing it is not a practical path. The owner can read it from the group screen and hand it to a co-teacher or a parent.
6. Switching group is an explicit control on the grown-up side of the app.

Home looks the same with a smaller grid. If the family has one child, tapping that one picture is the whole step. The parent still signs in on any new tablet.

## What happens to the hold gate

Remove it once accounts are in place.

The hold and the arithmetic question exist because anyone who can touch the screen can open settings, and the only storage is the device. A grown-up password replaces that. Children never get a correct answer to type.

Opening Grown-ups, ending the group session, and revealing the join code each ask for the password again. Play, "All done," and the picture grid do not. A child who finds the Grown-ups link hits a password field and cannot get through it. A grown-up who is setting up the class types the password once per visit to that screen, not on a timer and not as a puzzle.

The current `localStorage` settings remain the defaults for signed-out play only. Starting a real child does not copy the Chromebook's leftover settings onto that child.

## Data model

Collections in Firestore. Identifiers are generated by the client so a record created offline still has a stable id when it syncs.

**grownups/{uid}**

`email`, `displayName`, `createdAt`. The password never appears here. Firebase Auth keeps it.

**groups/{groupId}**

`name`, `kind` (`class` or `family`), `ownerUid`, `joinCode`, `createdAt`.

Default settings for new children: `sound` (`on` or `off`), `motion` (`device`, `calm`, or `full`), `letters` (A–Z subset, stored in alphabetical order, at least one), `games` (`post`, `space`, `silk`), `hintAfter` (`1` or `2`), `themes` for `post`, `space`, and `silk`. These match the Grown-ups page and the per-game theme keys that already exist (`little-woof-` plus the game kind).

**members/{groupId}_{uid}**

`groupId`, `uid`, `role` (`owner` or `helper`). This is the document a query uses to list "my groups."

**children/{childId}**

`groupId`, `displayName`, `picture` (`{set, id}` for the built-in set), `createdAt`.

**children/{childId}/settings/current**

The same fields as the group default, plus `updatedAt` and `updatedBy`. This is the copy that follows the child. Last write wins, which is the right rule for a setting.

**children/{childId}/events/{eventId}**

`eventId` is a client UUID. `type` is `correct` or `miss`. `adventure` is `post`, `space`, or `silk`. `letter`, `at` (device time), `deviceId`.

Events are created once and never updated. Two Chromebooks can record the same child in the same hour and both sets of events survive. The shelf's durable "already practiced" state is the set of letters that have at least one `correct` event for that adventure. Counts for a future grown-up view are the length of that list.

The in-memory visit set in the game stays the sitting collection ("of 26 · this visit"). It is not the synced record.

**children/{childId}/achievements/{badgeId}**

`badgeId`, `earnedAt`. Written once, when the client first sees the condition. A starter set, ready to rename:

- `first-sound` — one correct letter in any adventure
- `first-eight` — the eight letters S A T P I N M D each have a correct event
- `all-26-post`, `all-26-space`, `all-26-silk` — all 26 letters correct in that adventure
- `three-adventures` — at least one correct event in each adventure

Do not store a single "progress" document that both devices overwrite. Firestore keeps the latest write to a document, and a combined progress blob would lose the other device's letters.

Security rules, in plain terms: a grown-up can read and write a group, its children, and those children's settings, events, and achievements only when a `members` document links their uid to that group. Nobody else can. Signed-out play never touches these collections.

## Sync and offline

Two caches, with different jobs.

The **app shell** is a service worker on the HTTPS host. It caches the HTML, CSS, JS, fonts, pictures, and audio after the first successful load. The Firebase SDK is vendored in the repo. The game does not fetch it from a CDN at runtime, because a CDN request fails when the wifi is down. `file://` keeps working for the existing tests. Sync turns on only when a config object is present and the page is HTTPS.

The **data cache** is Firestore's persistent web cache. On "Start group," while online, the app reads the group, every child, each child's settings, achievements, and events. That read is what puts them on the Chromebook. Offline reads return that cache. Offline writes sit in a queue and upload when the browser is back online. The child never sees a sync dialog. A grown-up view can show "Saved" or "Waiting to save."

Prefetch is one-shot. Do not attach a live listener per child on every Chromebook. Thirty machines listening to thirty children would burn the free read quota for no classroom benefit. The morning prefetch is a few hundred document reads per machine, and 30 machines stay under the free 50,000 reads a day. Writes are one small event per answer, far under 20,000 writes a day for a single class.

Conflict rules:

- Events and achievements are insert-only.
- Settings and themes use the latest `updatedAt`.
- The sitting collection is not synced.

A school profile that clears storage on sign-out deletes the local cache and the remembered grown-up. It does not delete the server data. The next online start fills the machine again.

## What the owner sets up

1. A Google account he controls.
2. A Firebase project on the Spark plan. No billing account.
3. Authentication: email and password on. Set the sender name on the password-reset template.
4. A Firestore database. Deploy the rules that ship with the feature. Production mode, so the database is closed until those rules exist.
5. A web app in that project. Put the public config in the game's config file. Do not download a service-account key, and do not put one in the repo.
6. HTTPS hosting for the static game. His current web host is enough. Upload the files after the feature is built. Open one Chromebook, sign in, turn wifi off, and confirm a child who was already on screen can still play.
7. His own grown-up account, created in the app, then the classroom group and the children.

He does not install MySQL, PHP, or a sync server for the recommended path.

## Build phases

Each phase leaves the current game playable. Character art and audio stay as they are. Existing `file://` tests keep passing because the sync code does nothing when no Firebase config is present.

1. **Sign-in and the picture grid.** Grown-up account, one group, add and edit children, picture grid, tap a child, play the current game. Prove the same child appears on a second browser. Progress is still the sitting-only set. This phase is the auth screens, a small account module, and a new first screen in front of the hub.

2. **Durable progress and achievements, online.** Write an event on each correct answer and each miss. Derive the practiced letters and the starter badges from those events. Open the same child on two browsers and confirm both sets of letters show up. The invasive edit is the answer path in the shared game engine (Letter Post and Moonboat share it; Silk Thread loads that engine).

3. **Offline.** Vendor the SDK, add the service worker, turn on the Firestore persistent cache, prefetch on Start group, and add a "Waiting to save" state for grown-ups. Test by starting a group online, disabling the network, playing, enabling the network, and checking the other device. Host the trial copy on HTTPS. This phase is also the hosting change.

4. **Settings follow the child. Remove the gate.** Grown-up controls read and write the child settings document. Group defaults apply when a child is created, with an "apply to every child" action for the Monday letter set. Delete the hold-and-question flow. Password step-up on Grown-ups, End group, and the join code.

5. **Second grown-up.** Join with the group code so a parent at home and a co-teacher at school open the same children. Optional photo portraits and a grown-up QR shortcut wait until this works, and only if he still wants them.

Phases 1–4 are the functional promise: a child can change Chromebooks, a grown-up can change devices, and a wifi drop does not eat the sitting. Phase 5 is what makes school and home the same child.

## Risks

- **The school network blocks Google.** Firebase will not load. Use the MySQL fallback. Confirm this before phase 1.
- **Chromebooks that wipe local data.** Offline play and the remembered grown-up last only until the wipe. Server progress is safe. The morning start has to be online again.
- **A combined progress document.** Last write wins would drop letters. The event list is the safeguard, and it is easy to "simplify" later in a way that breaks it.
- **Free-quota listeners.** A live listener on every machine can cross 50,000 reads a day. The prefetch rule is there to avoid that. If a future school is large enough to cross it, Blaze bills the overflow. It does not require a rewrite.
- **The shared browser stays signed in.** That is what makes the picture grid work for the next child. The password step-up is what keeps that convenience away from settings. Forgetting to end the group means the next person who opens that Chromebook sees the class. That is useful in the morning and worth knowing.
- **Service worker vs today's tests.** The repo is opened from disk in tests. The worker must not register there, or the offline suites will start failing in ways that look like game bugs.
- **Clock skew.** Event times come from the device. Ordering for display should tolerate a Chromebook whose clock is wrong. The existence of the event matters more than its timestamp.

## MySQL fallback

Use this only if Google is blocked or he refuses a Firebase project after reading this plan.

Same accounts, same picture grid, same event documents, stored as MySQL tables. A few PHP endpoints: sign up, sign in, prefetch the group, and post a batch of new events and setting changes. Passwords hashed with `password_hash`. Sessions are random tokens stored hashed on the server and kept in the browser. Every query uses placeholders.

Offline is an IndexedDB queue we build and test ourselves: prefetch writes the group into IndexedDB, play appends events locally, and a flush sends the batch when `navigator.onLine` is true. Conflict rules stay the same because events are insert-only.

He creates the database, a limited database user, HTTPS, and a backup. Cost is whatever he already pays for the host. The extra build, compared with Firebase, is the whole sync queue and the PHP, and it lands mostly in phase 3.

## Open questions

- Can the classroom Chromebooks reach Firebase, or does the district block Google APIs? This chooses Firebase or MySQL.
- Does he already have an HTTPS site to put the game on, or does the host still need a certificate?
- Is one shared child record between school and home required in the first build, or is phase 5 allowed to follow after the classroom works?
- Does he want the starter achievement list above, or is there a set he already has in mind?
- Should signed-out "this device only" play remain, for a substitute with no account?
- For the first picture set, are built-in animals enough, or does he want class photos in the first build?
