# FINDIT: Decision Log

Every significant technical decision, with the reason, so you can explain and defend it (and change it knowingly). **Status:** `Accepted` = decided; `Open` = to be decided at the named stage.

Decisions that depart from your brief are marked ⚠️. You can overrule any of them.

---

## D-001: Discard the supplied frontend; start clean
**Status:** Accepted (Stage 1)
**Decision:** The uploaded `findit-frontend` zip is not used as code or as a base.
**Why:** It is a TypeScript + Tailwind single-page *website* with no backend, no login and no claims, using a blue brand and publishing reporters' email addresses. Your brief requires JavaScript, React Native, plain CSS, a purple brand, private contact details and an admin-verified claim process. Almost nothing could be reused, and adapting it would be slower than building to the brief.
**Kept as inspiration only:** the item-card layout, filter chips, empty state and toast idea, rebuilt in React Native and plain CSS. Nothing from the zip is in the repository.

## D-002: One repository with three apps and a documentation folder
**Status:** Accepted
**Decision:** `backend/`, `mobile-app/`, `admin-dashboard/`, `documentation/` in one repo, each app with its own `package.json`.
**Why:** One place for a solo developer to manage and one history to show. No workspace tooling needed.
**Alternative rejected:** separate repositories (more overhead, no benefit for one person).

## D-003: Free-tier infrastructure only
**Status:** Accepted
**Decision:** MongoDB Atlas free cluster, Cloudinary free plan, laptop-hosted backend for development and demo, Expo Go, GitHub.
**Why:** Your requirement is that storage and hosting are free. Limits are re-checked at sign-up because free plans change.
**Consequence:** Online hosting of the backend (optional) uses a free tier that sleeps when idle. The final demo is therefore planned to run locally.

## D-004: Three roles; staff accounts are made by seed or promotion
**Status:** Accepted
**Decision:** `user`, `admin`, `recovery_officer`. Public registration can only create `user`. The first admin comes from a seed script. After that, an administrator promotes a registered user.
**Why:** Matches your brief (the officer role was optional, and it is cheap once role middleware exists) and removes any public path to admin rights.

## D-005: JWT holds only the user ID; the user is reloaded on every request
**Status:** Accepted
**Decision:** The token proves *who*. Role and account status are read from the database each time.
**Why:** A suspension or role change takes effect immediately, with no token blacklist.
**Cost:** One extra small database read per request.
**Known limitation:** Logout is client-side only (see [SECURITY_PLAN.md](SECURITY_PLAN.md) section 4).

## D-006: ⚠️ `bcryptjs` instead of native `bcrypt`
**Status:** Accepted
**Decision:** Use the `bcryptjs` package, which implements the same **bcrypt algorithm** in pure JavaScript.
**Why:** The native `bcrypt` package must compile or download a binary, which is a common source of install failures on Windows and some hosting. `bcryptjs` installs everywhere. For a campus-scale app the speed difference is irrelevant.
**Consequence:** Hashes are standard bcrypt hashes. Switching to the native package later requires no data migration.

## D-007: Zod for input validation
**Status:** Accepted
**Decision:** Strict Zod schemas (unknown fields rejected) validate every body, query and parameter set.
**Why:** The schemas read like plain descriptions of the data, are reused across endpoints, and strictness is what blocks mass assignment (such as sending `role`) and operator injection.
**Alternative considered:** `express-validator` (chain-style rules). Fine, but harder to read for large objects.

## D-008: Image upload goes through the backend (two steps)
**Status:** Accepted
**Decision:** The app uploads to `POST /uploads/images`; the backend checks and forwards to Cloudinary; the app then sends the returned `url`/`publicId` with the report. The backend verifies the URL belongs to our Cloudinary account.
**Why:** Keeps Cloudinary secrets out of the app, and puts all file checks in one place.
**Alternative rejected:** letting the phone upload straight to Cloudinary with an unsigned preset (weaker control, abusable).

## D-009: Private data is protected twice
**Status:** Accepted
**Decision:** Private fields are `select: false` in the models *and* removed by whitelist serializers. The reporter's identity is never in item responses. Clients get only `isMine`.
**Why:** One mistake should not cause a leak. Tests assert the absence of private fields.

## D-010: User-facing match scores use public fields only
**Status:** Accepted
**Decision:** The score a user sees comes only from public fields. Comparison of private details and claim evidence is computed for **administrators only**.
**Why:** If private details influenced a score users can see, a dishonest person could file fake lost reports and read the score as an oracle to guess a found item's secret details.
**Consequence:** Matching quality is slightly lower, in exchange for much better anti-fraud protection.

## D-011: Escaped-regex search instead of MongoDB `$text`
**Status:** Accepted
**Decision:** Keyword search uses a case-insensitive regex built from **escaped** user text over title, description, brand and location.
**Why:** `$text` does not match partial words (typing "head" would not find "headphones"). Regex works for campus-scale data. Escaping makes user text harmless.
**Scaling path:** MongoDB Atlas Search, if the dataset ever outgrows this.

## D-012: Mobile uses a `fetch` wrapper and Context API: no Axios, no Redux
**Status:** Accepted
**Decision:** One small `api/client.js` wrapper. Context only for the logged-in user and token.
**Why:** Fewer dependencies and less to learn, while meeting your brief ("Fetch or Axios", "Context API where appropriate"). Each screen loads its own data.

## D-013: Backend CommonJS; mobile and dashboard ES modules
**Status:** Accepted
**Decision:** The backend uses `require`. The clients use `import`.
**Why:** CommonJS keeps Jest and Supertest simple. The clients' toolchains use ES modules by default. All code is JavaScript, as required.

## D-014: Browsing requires login; closed reports are never public
**Status:** Accepted
**Decision:** All `/items` endpoints need a token. `CLOSED` reports are visible only to their reporter and administrators.
**Why:** The system is for campus members. Requiring login lets us rate-limit per user and stops anonymous scraping of lost-and-found data.

## D-015: One `items` collection for lost and found
**Status:** Accepted
**Decision:** A single collection with `reportType`.
**Why:** The two kinds share nearly all fields and are compared together. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## D-016: Claim rules that protect the process
**Status:** Accepted
**Decision:** Only role `user` can claim; staff cannot (conflict of interest). One active claim per user per item. Approving a claim auto-rejects other active claims on that item. Claims are made on FOUND items only.
**Why:** Prevents self-approval, spam and ambiguity about who receives the item.

## D-017: Backend port 4000
**Status:** Accepted
**Why:** macOS reserves port 5000 for AirPlay on recent versions. 4000 is free on most machines and is configurable via `PORT`.

## D-018: Test database strategy
**Status:** Accepted (Stage 3). *Resolves the question left open in Stage 1.*
**Decision:** Tests that need a database run against a **real MongoDB** started on the machine running the tests (`mongodb-memory-server-core`, MongoDB 8.0.17, in memory, thrown away afterwards). It never touches Atlas. Plain `npm test` **skips** those tests and says so. `npm run test:db` runs them. In the coding container the assistant always runs `npm run test:db`. A separate, read-only `npm run check:db` checks the real Atlas connection from the owner's laptop.
**Why:** Mocking the database would give false confidence. The test copy of MongoDB is a one-time download of about 99 MB on Linux but **500 to 800 MB on Windows** (the Windows files include debugging data, for every version), so it is not forced on the owner's laptop. If `test:db` is requested and the database cannot start, the run **fails**. It never silently skips.
**Rule that stays:** any check that could not be run is labelled "needs your laptop". It is never reported as passed.
**Consequence:** Atlas itself (accounts, network allow-list, the real cluster) can only be verified on the owner's laptop, because the container cannot reach it.

## D-019: Expo SDK version
**Status:** Accepted (Stage 7). **Chosen: Expo SDK 58** (React Native 0.88.1, React 19.3.0). *Confirmed on 2026-11-25: the app opened in the owner's Expo Go (owner-reported).*
**Issue:** Expo Go on your phone only runs projects built for the SDK it supports, and the newest Expo Go opens only the newest SDK.
**Decision:** the owner reported that their Expo Go supports SDK 58, and Expo's own release notes say SDK 58 (15 October 2026) is the current one that the store version of Expo Go is meant to open. The project was created for SDK 58. If Expo Go ever says the project is for an incompatible SDK, the project is recreated for the SDK it names; the screens and logic would carry over unchanged.

## D-020: `mobile-app/` and `admin-dashboard/` are created by their own tools, later
**Status:** Accepted (Stage 2)
**Decision:** Stage 2 creates only `backend/`. The mobile app (Stage 7, Expo) and the dashboard (Stage 12, Vite) are generated by their official tools when their stage starts.
**Why:** Those generators refuse, or ask to wipe, a folder that already contains files. Creating placeholder folders now would only get in their way.

## D-021: Express 5, so no `asyncHandler` helper
**Status:** Accepted (Stage 2)
**Decision:** Use the current Express (5.3.0). It forwards errors from `async` functions to the error handler automatically (proved by a test), so the planned `utils/asyncHandler.js` wrapper is not needed and has been removed from the plan. Also dotenv 18, Jest 30, Supertest 7.
**Why:** Less code and one fewer thing for a beginner to remember to wrap every route in. All of these support Node 22.
**Consequence:** Jest 30 supports Node 22 and 24 but **not** Node 23, so the project asks for Node `^22 || >=24`. Verified on Node 22.23.5 (Linux) and Node 24.20.0 (Windows).

## D-022: `node --watch` instead of nodemon
**Status:** Accepted (Stage 2)
**Decision:** `npm run dev` uses Node's built-in `--watch` (verified: it restarts when a file changes).
**Why:** No extra dependency to install, update or audit.

## D-023: Commits are authored as the project owner; `CLAUDE.md` carries the rules
**Status:** Accepted (Stage 2)
**Decision:** Git commits carry the owner's name and email as author, with a `Co-Authored-By` trailer for Claude. A `CLAUDE.md` file at the repo root records the owner's standing instructions so that any new session starts with the same rules.
**Why:** The owner wants authorship on the work for the academic record. Sessions do not remember earlier chats, but they do read `CLAUDE.md`.
**Note:** Commit author details are visible to anyone who can see the repository. The owner chose which email to use. GitHub also offers a private "noreply" address if they prefer.

## D-024: A `findit` cloud environment allows one extra download host
**Status:** Accepted (Stage 3)
**Decision:** A personal environment named `findit` (network: package registries as before, plus `fastdl.mongodb.org`) was created at the owner's approval, so the assistant can download the test copy of MongoDB. Other projects stay on the Default environment.
**Why:** The Stage 1 check showed that host returned 403 from the container's network policy. Atlas itself uses a different kind of connection that the container's network cannot carry, so that stays blocked.

## D-025: Database name is a setting; the connection string is handled as a secret
**Status:** Accepted (Stage 3)
**Decision:** `MONGODB_DB_NAME` (default `findit`) chooses the database inside the cluster, so the owner can paste Atlas's connection string unedited (apart from the password). The connection string is stored as a non-enumerable property of the config (printing or JSON-ing the config cannot reveal it), error text is redacted of the password in both encoded and decoded form, and placeholders such as `<db_password>` are refused with a plain explanation. Settings validation never reads a file, so tests cannot touch a developer's real `.env`.
**Why:** Beginners commonly leave placeholders in, mis-encode passwords, or paste secrets into chats. These guards turn each into a clear message.

## D-026: A test-only workaround for the MongoDB driver under Jest
**Status:** Accepted (Stage 3)
**Finding:** The driver (7.8) loads Node's `os` module through a dynamic `import()`, which Jest's sandbox does not support. Inside Jest the driver then sends an empty handshake and MongoDB answers *"Missing required sub-document 'driver'"*. Confirmed: the same code connects fine in plain Node with both MongoDB 8.0.17 and 8.2.6.
**Decision:** Tests pass the driver's `runtimeAdapters: { os }` option through `tests/helpers/database.js`. The application code does not use it (the driver marks the option experimental, and real Node does not need it).
**Consequence:** Any future test that connects must use the helper (`connectTestDatabase`).

## D-027: Library versions chosen in Stage 3
**Status:** Accepted
Mongoose 9.12.3 (driver 7.8.0), Helmet 8.3.0, cors 2.8.6, mongodb-memory-server-core 11.4.0. All support Node 22 and 24. Mongoose 9 is a recent major version, so each Mongoose feature used from Stage 4 is verified by a test against the real database instead of assumed from older versions.

## D-028: Atlas database access: a limited user, either connection-string form
**Status:** Accepted (Stage 3)
**Decision:** The app connects as a dedicated Atlas user `findit_app` with the built-in role **Read and write to any database**, never as the Atlas Admin user that the quick setup creates automatically (which is deleted). Both the `mongodb+srv://` and the longer three-server `mongodb://` connection strings are supported (Atlas showed the second form to the owner). The role will be narrowed to the `findit` database only in the Stage 16 security review.
**Why:** Least privilege: if the connection string ever leaks, the damage is limited. Atlas's quick setup creates an admin user and shows its password on screen, and the owner pasted a password into chat once. That password was rotated, and the guides now explain how to do this and to mask secrets when asking for help.

## D-029: Authentication design (Stage 4)
**Status:** Accepted
**Decision:**
- **Tokens:** JWT, HS256 pinned, issuer `findit-api`, containing only the user id. The user (role, status) is reloaded from the database on every request. Default lifetime 7 days, at most 30 (tokens cannot be revoked). No refresh tokens. Logout is the app deleting its token.
- **Passwords:** `bcryptjs`, cost 12 by default (about 0.3 s on the build machine, probably 0.7 to 1 s on the owner's laptop), configurable from 4 to 15 and never below 10 in production; tests use 4. New passwords: 8 to 72 bytes with a letter and a number. Existing passwords are never trimmed or altered.
- **Login:** the same reply for an unknown email and a wrong password, and an unknown email still pays for a full password check. A suspended account is only revealed after the correct password.
- **Emails** are trimmed and lower-cased, and unique in the database. An optional `ALLOWED_EMAIL_DOMAINS` list can restrict sign-up to campus addresses.
- **Roles:** public sign-up always creates `user`. The first administrator comes from `npm run seed:admin`, which never changes an existing account's password.
**Why:** each choice closes a specific attack (forged tokens, stale permissions, account enumeration, timing leaks, self-made admins). See [SECURITY_PLAN.md](SECURITY_PLAN.md).
**Accepted limitation:** a password change does not invalidate tokens already issued (they expire).

## D-030: Rate limiting counts FAILED logins per address and email
**Status:** Accepted (Stage 4). *Replaces the first design in the API contract (10 requests of any kind per address per 15 minutes).*
**Finding:** the first design would have locked the owner out after about ten Postman clicks, and would lock a whole campus behind one shared address after ten logins. It also let a correct login use up the budget.
**Decision:** three limiters, counted in memory: general (600 per address per 15 minutes); login (10 **failed** attempts per address **and** email per 15 minutes, correct logins never count, and the lock-out also refuses the correct password); sign-up (20 per address per hour). All are tunable in `.env`.
**Why:** one account's guessers are slowed without punishing other people on the same Wi-Fi.
**Consequences:** see accepted risks 10 to 12 in the security plan.

## D-031: `req.valid` and strict schemas
**Status:** Accepted (Stage 4)
**Decision:** the validation checkpoint puts cleaned data in `req.valid.body` (never overwriting `req.body` or `req.query`, which are read-only in Express 5), and controllers read only that. Schemas are strict (unknown fields are refused), clean first and then check (`trim().toLowerCase().pipe(z.email())`: in Zod 4, `z.email().trim()` would check the format before trimming), and run "at least one field" or "must differ" checks only when nothing else is already wrong (`when`), so a forbidden field is not also reported as "send at least one field".
**Profile photo:** `profileImage` is not accepted by `PATCH /users/me` until image upload exists (Stage 9), because a photo link must be checked against our own Cloudinary account.

## D-032: Postman collection is the manual-test tool
**Status:** Accepted (Stage 4)
**Decision:** `documentation/postman/FINDIT.postman_collection.json` holds ready-made requests with built-in checks. Every stage that adds endpoints extends it. It was verified by running it with Newman (Postman's command-line runner) against a live server (10 requests, 17 checks, 0 failed; one optional admin request was added afterwards).
**Why:** it lets the owner exercise and demonstrate the API with clicks, and it doubles as living documentation.

## D-033: A place is a zone plus a detail, and it is only a hint
**Status:** Accepted (Stage 5). *Replaces the Stage 1 plan for one flat list of placeholder "general locations".*
**Finding:** the owner pointed out that items get moved from place to place, and supplied the real Babcock University names: many halls, many churches, several auditoriums, plenty of libraries and classrooms. One flat list of about 100 names would be unusable on a phone and would make the library and classrooms impossible to describe.
**Decision:** a person first picks a **zone** (15 of them, such as male halls, female halls, churches, library, classrooms, auditoriums, cafeteria, gates). Each zone then asks for a detail in one of three ways: `LIST` (pick the hall or church), `REQUIRED_TEXT` (type which library or class number), or `OPTIONAL_TEXT`. Every list ends with "Not sure which", and there is a "Not sure, or somewhere else" zone. The report stores `generalLocation` (the zone code) and `locationDetail`. The whole definition lives in **one file**, `backend/src/config/campusLocations.js`, served to the apps by `GET /meta/options`, so adding a hall is a one-line change and the apps never hard-code places. No capacities and no people's names are kept.
**Why:** it matches how people think ("I lost it near a male hostel, I think it was Winslow"), it keeps lists short, and it gives matching two honest signals (same zone, same entry in a list) without ever treating the place as proof.
**Rules built on it:** the detail is checked together with the zone (a hall must come from that zone's list); when a report's zone changes, the old detail is dropped, never carried into the new zone; a detail that the zone requires cannot be cleared.
**Matching (Stage 10):** same zone 6 points, plus 4 when both name the same list entry; a different place never rules a match out. Documented in [ARCHITECTURE.md](ARCHITECTURE.md).
**Alternatives rejected:** free text only (cannot be matched or filtered); a map with GPS (needs phone permissions and a map service, which adds cost and privacy questions, and does not help for "which class").
**Resolved (2026-11-24):** the owner confirmed that Emerald Hall and Topaz Hall are male halls and that "Nyberg" is the right spelling. Both halls were added to the male list and the temporary "Other halls" zone was removed. The Postman collection never used that zone, and it had existed for less than a day, so no report is expected to refer to it.

## D-034: The date a thing was lost or found
**Status:** Accepted (Stage 5)
**Decision:** `dateOccurred` is sent as `YYYY-MM-DD` and stored as midnight UTC. It must be a real calendar date, **not more than one day in the future**, and **not more than 365 days ago**. The time of day is a separate field with four bands plus "unknown".
**Why one day of slack:** the server clock is in UTC, but a phone in Nigeria is an hour ahead, so just after midnight local time a person's "today" is the server's "tomorrow". A strict "not in the future" rule would wrongly refuse honest reports. **Why 365 days:** a report older than a year is almost certainly a typing slip, and it keeps the matching window sensible.

## D-035: Only the reporter can edit or close a report until the audit log exists
**Status:** Accepted (Stage 5). *Narrows the API contract draft, which allowed administrators too.*
**Decision:** in Stage 5 only the **owner** may edit or close a report. An administrator gets `403`, like any non-owner. Administrator edit, close and status changes are built in Stage 12 together with the audit log.
**Why:** the security plan requires every administrator action to be recorded (S-21). Building the power before the record would create exactly the unaccountable staff action the plan is meant to prevent. Nothing the administrator does now is lost: they can already *see* every report, including the private fields and the reporter's contact details.
**Consequence:** until Stage 12 a bad or abusive report can only be handled by its owner or directly in the database ([SECURITY_PLAN.md](SECURITY_PLAN.md) risk 15).

## D-036: Who may see a report, and what Stage 5 leaves out on purpose
**Status:** Accepted (Stage 5)
**Decision:**
- **Public view** (every logged-in person, including recovery officers): no private details, no storage location, no reporter, no close reason, and the reporter's id is never sent (only `isMine`).
- **Owner view:** adds the private details, the storage location and the close information.
- **Administrator view:** the owner view plus the reporter's name, email, phone number and contact preference.
- A **`CLOSED`** report is `404` for everyone except its owner and administrators. A stranger who tries to edit or close someone else's closed report also gets `404`, not `403`, so a closed report cannot be confirmed to exist.
- The private fields use `select: false` and are fetched by a **second query** only when the viewer is allowed to see them, so a coding slip in the public path cannot leak them.
- Every response is built by a whitelist function (`toItemCard`, `toItemDetail`) that names each field.
**Left out on purpose:** photos (Stage 9, because a photo link has to be checked against our own Cloudinary account); browsing and searching everyone's reports (`GET /items`, Stage 6); matching (Stage 10); administrator edit and close (D-035).

## D-037: How browse and search work
**Status:** Accepted (Stage 6)
**Decision:**
- **Words, not phrases.** The text is split into words (at most 5, repeats removed). **Every word must match** somewhere, in any order and in any of the public fields, so "black headphones" finds a report that says "headphones" in the title and "black" in the description. Matching is partial (`head` finds "headphones") and ignores letter case.
- **Escaped, never a pattern.** Each word is escaped before it is used, so `.` `*` `(` and the rest are ordinary letters. That removes both "match everything" tricks and slow patterns (tested, including the classic `(a+)+$`).
- **Public fields only:** title, description, brand, location detail, and the *name* of the zone (so "residence" or "library" finds reports by place). The private details, the storage location, the close reason and the reporter are never searched, because a search that could read them would let a dishonest person guess a secret one word at a time.
- **Status:** the default list shows active reports; `RETURNED` only when asked for; `CLOSED` is refused with a clear `400` instead of silently ignored, and a second safety belt makes any non-browsable status match nothing. Your own closed reports are in `GET /items/mine`, not here.
- **Dates and sorting:** date filters are inclusive at both ends and may be any real date. Four sorts; the report id is the last tie-breaker so paging never repeats or skips a report even when two reports were made at the same moment.
- **Strict query:** unknown, repeated and operator-style parameters are refused.
**Why not MongoDB `$text`:** it does not match partial words (D-011). **Why not search the colour and category names:** they have their own filters, and the contract lists the searched fields.
**Cost:** a partial-word search cannot use an index. At campus scale that is fine; see [SECURITY_PLAN.md](SECURITY_PLAN.md) risk 16.

## D-038: Stage 7 in two checkpoints, with preview data behind the API files
**Status:** Accepted (Stage 7)
**Decision:** the mobile app is built in two steps so the riskiest part (phone, Expo Go and laptop talking to each other) is proved early. **7a:** the project, theme, navigation, Welcome, Login, Register, Home and Profile. **7b:** search, report details, the report forms (with the zone-then-detail place picker), my reports, profile editing. In both, the screens call small files in `src/api/`. Until Stage 8 those files return **preview data with exactly the shape of the real API replies**, and the app says so on screen ("Preview: ..."). Stage 8 replaces only the insides of those files with real calls, so the screens do not change.
**Guard against drift:** tests compare the preview data with the backend's own code (the report-card fields, the place names, the password rules), so the preview can never quietly disagree with the real server.
**Not built in the app yet:** claims, notifications and image upload screens. They arrive with Stages 11, 14 and 9, because they need those backend features.
**Checkpoint 7b (done):** the preview now includes a small in-memory copy of the server's report rules, so creating, editing and closing a report behave as they will with the real server, and reports you create stay on the phone until the app closes. The full campus place list is a generated copy of the backend's (`previewZones.js`), so you can see every real hall and church now; a test fails if it ever differs.

## D-039: Mobile toolchain
**Status:** Accepted (Stage 7)
**Decisions:**
- **JavaScript, React Navigation 7, Context API, `fetch`** as already decided (D-012). The Expo starter project includes an `AGENTS.md` that recommends Expo Router and development builds. Those conflict with this project's fixed stack (React Navigation, Expo Go only), so they were not followed, and the starter's `AGENTS.md`, `.claude` plugin settings and `LICENSE` were not kept.
- **Library versions come from the SDK's own list** (`node_modules/expo/bundledNativeModules.json`), because the cloud container cannot reach the Expo servers that `expo install` asks. They are installed with npm at exactly those versions.
- **Tests:** `jest-expo` with `@testing-library/react-native` 14. The test-only packages `react-dom` and `react-server-dom-webpack` are pinned to **19.3.0**, the same as React, because React Native requires its renderer and React to match.
- **Known advisory, accepted:** `npm audit` flags `react-server-dom-webpack@19.3.0` (critical, remote code execution in React Server Components *servers*) and `minimatch` (moderate, inside Expo's command-line tools). FINDIT runs no React Server Components server, the package is an unused test-time companion of `jest-expo` and is not in the app, and the patched 19.3.1 cannot be used because Expo SDK 58 pins React to 19.3.0. The suggested `minimatch` fix would downgrade Expo to version 52. To be revisited in Stage 16 and with each Expo patch release.

## D-040: The report form
**Status:** Accepted (Stage 7, checkpoint 7b)
**Decisions:**
- **One form, two uses.** Creating and editing share one form. When editing, the type (lost or found) cannot be changed, because the server never allows it.
- **Zone first, then detail** (D-033). The question changes with the type ("Where do you think you lost it?" or "Where did you find it?") and says that the place is only a hint. A list zone shows a pick-list that includes "Not sure which".
- **The date uses quick buttons and a typed date**, not a calendar pop-up. A calendar needs an extra native library that is not part of Expo Go, and most reports are about the last few days. Any date can still be typed (YYYY-MM-DD). "Today" means the date on the phone, which the server accepts (it allows one day of slack).
- **The form checks, the server decides.** The app repeats the server's rules for instant feedback and never blocks something the server would accept (a test compares them on a table of cases and on every place name). The server's own error messages are shown if it still refuses.
- **Private fields have their own white box** that says who can see them. They are never part of a card, a search, or the public report view.
- **Closing asks first.** Closing hides the report from everyone else, so the app asks "Close this report?" before doing it. The closing reason (optional on the server) is not asked for yet.

---

## How to add a decision

Add the next number, a status, the decision, the reason and any alternative rejected. Never delete an old decision; mark it `Superseded by D-0xx`.
