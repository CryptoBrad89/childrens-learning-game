# Accounts and sync: plan

Status: proposal only. No code has changed. Prepared 2026-10-19.
Scope note: per the owner, privacy law (COPPA, FERPA and similar) is out of scope and didn't influence any choice here.

## Summary and recommendation

- **Backend: Supabase (hosted Postgres + Auth), Pro plan (about $25/month).** The owner never runs a server. It's a real relational database, which fits the data: classes, staff, households, children and the links between them. Postgres row-level security enforces who can see what, inside the database. Small SQL functions handle redeeming class codes and syncing, so no separate server code is needed. It's standard Postgres, so the data can move later, even to the owner's own host.
  - **Firebase is a close runner-up.** It's cheaper (probably $0–5/month) and has a built-in offline cache. Its document database and rule language fit class and household relationships less well, and server functions need its pay-as-you-go plan.
  - **MySQL/PHP on the owner's host is not recommended:** the owner would have to build, patch and defend the sign-in system.
- **Children never type anything.** A teacher sets up each shared Chromebook for a class **once**, by scanning a class QR poster or typing a 6-character class code. After that, a child taps their class picture and then **their own picture** in a grid of classmates. The device holds the whole class roster, so **any child can use any set-up Chromebook, including offline.** An optional "picture secret" (tap your two pictures) is there for classes that want it.
- **Grown-ups sign in without passwords:** a 6-digit email code, or "Sign in with Google" (most Chromebook schools use Google Workspace). Teachers own classes. Parents and other grown-ups belong to a household. A teacher-printed **home link** QR connects a child's school profile to their family, so progress follows the child between school and home.
- **The keypad gate:** on shared class devices it goes away. Opening the grown-up area needs a real teacher sign-in, which ends when they leave or after 10 idle minutes. On a grown-up's *own* device that stays signed in at home, keep the number-word gate as a quick re-entry check. The numbers are random each time, so a watching child can't learn them, and there's no PIN to forget.
- **Offline first:** a service worker caches the whole game (about 3.3 MB), so it runs offline after the first visit. Play is saved immediately to an on-device outbox and synced when online. Progress is stored as a log of events that can only grow, so syncing never conflicts and never loses play. The one limit: play done on a Chromebook while it's offline appears on other Chromebooks only after that machine reconnects.
- **Effort:** about **6–9 weeks** of focused build in 7 phases. Running cost is about **$25–40/month**.
- **The biggest unknown is how the school's Chromebooks are managed.** If they run in guest or "ephemeral" mode, local data is wiped at every sign-out. The device link, and any play not yet synced, would vanish each day. This must be answered before building (open question 1).

---

## 1. Accounts and roles

| Who | Signs in with | Can |
| --- | --- | --- |
| **Child** (3–4) | Taps their picture on a set-up device or in a household | Play. Their settings and progress follow them |
| **Teacher** | Email code or Google | Create classes and rosters, set class settings, set up devices, see class progress, print home links |
| **Assistant / co-teacher** | Email code or Google, invited by a teacher | Same as teacher for that class, except deleting the class or changing staff |
| **Parent / guardian** | Email code or Google | Own a household, add or link children, see their child's progress, remove a child |
| **Other grown-up** (grandparent, childminder, carer) | Email code or Google, invited by a parent | Supervise and change household settings. Can't remove children or change members |
| **School admin** (later phase) | Google / Microsoft | See every class in their school |

A **device** is also an identity: an anonymous Supabase session linked to one or more classes, or to a household. It can read only those rosters and write play only for those children. It never sees grown-up accounts.

### Where settings live
Today's settings move from `localStorage` into the account, in three layers. The most specific wins:

1. **Child overrides**, set by a teacher or parent. Example: calm motion for one child.
2. **Context settings**: the **class** settings when playing on a class device, or the **household** settings at home. These cover letters in play, hint timing, voice and volume, effects, calm motion, which worlds show, and children's buttons.
3. Built-in defaults (today's behavior).

## 2. Child login flow

### Classroom (shared, unassigned Chromebooks)

**Once per class (teacher, about 5 minutes):** create the class and give it a name and a class picture (for example a ladybird, drawn and not an emoji). Add children, each with their name and an avatar picked from about 40 drawn pictures, unique within the class. Pre-readers recognize a picture faster than a written name. Then print the class QR poster.

**Once per Chromebook per class (about 10 seconds):** on the start page, choose **Set up this device**. Scan the class QR with the camera or type the class code (for example `LUCY-7K3`). The device gets a credential scoped to that class. It lasts until the end of the school year, and the teacher can revoke it from the class page (for example for a lost device). One cart Chromebook can hold several classes. Teachers do the whole cart once at the start of the year.

**Every session (child, a few seconds, no reading needed):**

```
Start page ─► "Which class?" (only if the device has more than one) ─► tap class picture
           ─► "Who's playing?" grid of classmates' avatar pictures + names
           ─► tap own picture  ─► (optional picture secret: tap your 2 pictures)
           ─► Lucy's chooser, with that child's settings and progress
```

- The roster, avatars, class settings and each child's latest progress are cached on the device. **Picking works offline.**
- A large **I'm done** button returns to the picker. The device also returns to the picker after 10 idle minutes, or when the tab stays hidden, so the next child never plays as the last one.
- If a child taps the wrong picture, the teacher can move that session's rounds to the right child from the class page (this uses the event log; see §5).
- Optional printed **picture cards** (one QR per child, scanned with the camera) skip the grid. A card works like a key, though: losing it means reissuing. Offer it as an option, not the default.

### At home (parent's device)

1. A parent signs in (email code or Google). This creates a household.
2. **Child already in a class:** the parent scans the **home link** QR from a take-home card the teacher prints (one code per child, single use, expires in 30 days). The child's profile joins the household, so the same progress appears at school and at home.
3. **Child not in a class:** the parent creates a profile (name and avatar).
4. The device stays signed in as the household. The child taps their own picture in a small household picker. With one child, the picker is skipped.

## 3. Grown-up login flow and the gate

- **Passwordless:** a 6-digit email code, plus **Sign in with Google**. Add **Sign in with Microsoft** later if schools ask. I'd use codes rather than email *links*: on shared Chromebooks a link often opens in a different browser profile.
- **Where grown-ups sign in:** the same **For grown-ups** door. Inside are classes, households, children, settings, progress, devices and home links.
- **Gate decision:**
  - **Class devices:** no keypad. The door goes to a real sign-in. The grown-up session is **separate from the device's class session** and short: it ends on **Lock and go to games**, after 10 idle minutes, or when the tab closes. Nothing grown-up stays on a shared machine.
  - **A grown-up's own device at home:** the parent stays signed in, so a child could tap the door. Keep the current **number-word gate** here as a re-entry check. Asking for the parent's password or code every time would be painful, and a PIN can be watched and remembered, while random number words can't. **Forgot? Sign in again** is always available.
  - Sign-in screens are rate-limited and protected by a bot check (Cloudflare Turnstile), so a child mashing buttons can't trigger floods of emails.

## 4. Data model (Postgres)

Every table has row-level security. Grown-up email lives in Supabase Auth, not in game tables.

```
grown_ups          id (= auth user), display_name, created_at
classes            id, name, picture, school_name?, join_code_hash, settings jsonb, settings_updated jsonb, archived_at
class_staff        class_id, grown_up_id, role (teacher|assistant)
households         id, name, settings jsonb, settings_updated jsonb
household_members  household_id, grown_up_id, role (parent|grown_up)
children           id, name, avatar, picture_secret_hash?, settings_override jsonb, created_by, created_at, deleted_at
class_children     class_id, child_id, active
household_children household_id, child_id
devices            id (= anonymous auth user), label?, created_at, last_seen_at
device_links       device_id, class_id? | household_id?, linked_by, expires_at, revoked_at
home_link_codes    code_hash, child_id, issued_by, expires_at, used_at
progress_events    id uuid (made on the device, so retries are safe), child_id, kind, world, letter, misses, hint_shown,
                   occurred_at (device clock), device_id, received_at (server clock)
child_letters      child_id, world, letter, first_done_at, times, best_misses     -- kept up to date by a trigger
achievements       child_id, key, earned_at                                       -- derived, never written by devices
```

Server functions (Postgres `security definer` functions, called over the API):
- `redeem_class_code(code)` links the device
- `redeem_home_link(code)` adds the child to the household
- `sync_push(events[], settings_edits[])` and `sync_pull(cursor)`
- `reassign_rounds(...)`, `remove_child(id)`

Codes are stored hashed and rate-limited.

The game's word list, audio and art stay static files. Only the child's identity, settings and progress go to the database.

## 5. Sync and offline

1. **Hosting:** serve the game over **HTTPS**. Service workers and Google sign-in don't work from `file://`. The owner's existing web host can serve the static files, or Cloudflare Pages / Netlify for free. Opening the files directly from disk becomes a **guest mode**: it plays as today, saves nothing and has no sign-in.
2. **App shell:** a versioned service worker pre-caches every file (HTML, JS, CSS, fonts, 91 audio clips, art, about 3.3 MB) on first load. After that it serves from cache, and updates the cache in the background when a new version is deployed.
3. **On-device store (IndexedDB):**
   - a **snapshot**: rosters for linked classes or the household, settings, and each child's progress
   - an **outbox**: progress events and settings edits not yet acknowledged
   - The app requests `navigator.storage.persist()` so the browser is less likely to evict it.
4. **Writing:** every finished round adds an event to the outbox, and the game updates from local state. Nothing waits on the network.
5. **Syncing:** the outbox is pushed after each round, on startup, on reconnect (the `online` event), on tab hide, and every 60 seconds. `sync_push` is idempotent because the device makes each event id, so a retried push never double-counts. Then `sync_pull(cursor)` fetches changes made elsewhere.
6. **Conflicts:**
   - **Progress and achievements:** a grow-only log, merged by union. Nothing conflicts and nothing is lost.
   - **Settings:** last writer wins, per field, using the server's receive time. Settings edits are rare and made by grown-ups. The grown-up area shows "Changed on another device a moment ago" if a newer value arrives.
7. **Visibility:** the teacher's class page shows each device's last sync time and warns "2 devices have unsynced play", with a **Sync now** button. A small offline badge in the grown-up area says when changes are waiting.
8. **What is guaranteed and what isn't:**
   - **Guaranteed:** play is never lost while the device keeps its storage. It syncs whenever it reconnects.
   - **Not guaranteed:** a child moving from an *offline* Chromebook A to Chromebook B won't see A's latest rounds on B until A reconnects. Normal school Wi-Fi makes this a matter of seconds.

## 6. What the owner must set up

| Step | Work | Cost |
| --- | --- | --- |
| HTTPS hosting for the static game, with a domain | Upload files to the existing host, or connect Cloudflare Pages / Netlify | Domain about $15/year. Hosting $0 or existing |
| Supabase organization and project in a region near the schools; Pro plan with the spend cap on | 30 minutes | **$25/month** (sources differ on whether that's per organization or per project, so check supabase.com/pricing) |
| Email sending for sign-in codes (Postmark, Resend or Amazon SES), plus the DNS records that verify the sending domain (SPF/DKIM) | 1 hour | $0–15/month |
| Google OAuth client and consent screen (Google Cloud console) | 1 hour, plus Google's review time | $0 |
| Cloudflare Turnstile keys | 10 minutes | $0 |
| Run the provided database migrations and set allowed redirect URLs | 15 minutes, guided | — |

**Total running cost: about $25–40/month.** No server to run or patch. Supabase Pro includes daily backups (check how long they're kept on the current plan).

## 7. Backend options compared

| | **Supabase (recommended)** | Firebase (runner-up) | Owner's host: MySQL + PHP | Others (PocketBase on a VPS, Cloudflare Workers + D1) |
| --- | --- | --- | --- | --- |
| **Owner setup** | Low: web dashboard, we provide SQL | Low: web dashboard. Server functions (class codes, home links) need the pay-as-you-go plan and a billing account | **High:** server code, sign-in, email, backups and updates are all on the owner | Medium–high: a server to run, or sign-in to build |
| **Running cost** | $25/month (the free plan pauses after a week of inactivity, which would break over school holidays) | **Probably $0–5/month at this scale** | Already paying for hosting | $0–10/month |
| **Offline sync** | Build our own small sync layer (designed above, about 1 week) | **Built-in offline cache** for its database. Children switching on a shared device offline still need the roster-pick design, so the saving is smaller than it looks | Build everything | Build everything |
| **Security** | Managed sign-in (email codes, Google), row-level security written in SQL and testable, hashed codes, managed patching and backups | Managed sign-in, security rules in Google's own rule language. Fiddlier for class/household/device relationships | Owner writes and maintains sign-in, sessions, rate limiting and patches. One mistake exposes every account | Depends on how much is hand-built |
| **Data fit** | Relational, which fits classes, staff, households and links | Document database. Relationships need duplicated data or extra reads | Relational | Varies |
| **Getting out later** | **Standard Postgres dump**, portable even to the owner's host | Proprietary export | — | — |

**The call:** Supabase. It wins on security you can write and test in one place, on fit with the data, and on portability. **Firebase wins on cost.** If $25/month matters more than those, Firebase is a sound choice and the plan above still works: the same roster-pick child login and the same event log, with Firestore's offline cache standing in for the IndexedDB snapshot.

**Why not MySQL/PHP on the owner's host?** It's the cheapest on paper and the most work and risk in practice. The owner would be writing, patching and defending the whole sign-in and session system, and building the sync API, with no managed backups or security updates.

Later, as a separate option rather than a backend choice: **rostering** with Google Classroom, Clever or ClassLink, so teachers can import classes.

## 8. Build phases and effort

The estimates are for one developer, including tests (in the style of the existing Playwright suites).

| Phase | Scope | Effort |
| --- | --- | --- |
| 0. Decisions and setup | Answer the open questions. Owner creates the accounts in §6 | Owner time |
| 1. Hosting and offline shell | HTTPS deploy, service worker pre-cache, update flow, file:// guest mode | 2–3 days |
| 2. Backend | Schema, row-level security, server functions, migrations, database tests (including "can device A read class B?" attacks) | 4–6 days |
| 3. Grown-up accounts | Email code and Google sign-in, classes, roster and avatar editor, households, invites, settings moved to accounts, printable class QR and home-link cards, gate change | 6–8 days |
| 4. Devices and child sign-in | Set up this device, class and child pickers, idle sign-out, picture secret, offline roster cache | 4–6 days |
| 5. Progress and sync | Event outbox, push/pull, persistent collections and achievements, teacher and parent progress views, sync status | 6–8 days |
| 6. Home linking | Home-link codes, household picker, moving and removing children | 2–4 days |
| 7. Hardening and pilot | Security review, a 30-device classroom simulation, offline and flaky-network tests, accessibility, a one-class pilot | 4–6 days |
| **Total** | | **about 28–41 working days (6–9 weeks)** |

You can release in stages: after phases 1–4 teachers get accounts, class devices and shared settings; phases 5–6 then add progress that follows children.

## 9. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **School Chromebooks wipe local data** (guest or ephemeral mode) | Device links lost daily. Play not yet synced could be lost | Answer open question 1 first. Push after every round. If storage is ephemeral, use a managed-bookmark URL carrying a signed class token (set by the school's IT admin), or have the teacher scan the class QR daily |
| Child taps the wrong picture | Progress lands on the wrong child | Avatars unique within the class, an optional picture secret, and teacher-side **reassign rounds** |
| Next child plays as the previous one | Mixed progress | Big **I'm done** button, idle and tab-hidden return to the picker |
| A class QR poster or code is photographed and used elsewhere | Someone outside class sees the roster or adds play | Codes can be rotated and devices revoked from the class page; device links expire yearly; rate limits |
| Sign-in emails filtered by school email systems | Teachers can't sign in | Reputable email provider, verified domain, Google sign-in as the main route for schools |
| Google sign-in review delays | Launch slips | Start review in phase 0. Email codes work without it |
| Vendor outage or price change | Sync pauses | Offline-first keeps play working. Postgres is portable. Spend cap |
| Free-plan pausing | Service stops over holidays | Use Pro. Don't rely on keep-alive pings |
| Storage eviction on low-disk devices | Unsynced events lost | `storage.persist()`, frequent pushes, sync status shown to teachers |

## 10. Open questions

1. **How are the classroom Chromebooks managed?** Do children use guest or ephemeral sessions, a shared signed-in profile, or their own school Google accounts? Do they have working cameras for QR scanning? Can the school's IT admin push a bookmark or URL?
2. **Where are the first schools?** This sets the hosting region (latency).
3. **Should collections become permanent?** The game says "this visit" today. Options: a lasting album plus today's strip, or keep per-visit plus a lasting progress view for grown-ups.
4. **How much progress detail should teachers and parents see?** Letters completed, misses, dates?
5. **Picture secret:** off by default, with teachers able to turn it on per class?
6. **Should volume be the one per-device setting?** It mostly depends on the speaker (whiteboard vs tablet). Otherwise it lives in class or household settings as planned.
7. **Keep a file:// guest mode** (plays, saves nothing)?
8. **Is $25–40/month acceptable**, or does cost tip the choice to Firebase?
9. **Should rostering through Google Classroom, Clever or ClassLink be on the roadmap?**

---

Price sources (mostly third-party summaries; check the official pages before committing):
- [Jet Admin: Supabase pricing 2026](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans?hl=pt-br)
- [react-server: Firebase Functions need the Blaze plan](https://react-server.dev/deploy/firebase)
