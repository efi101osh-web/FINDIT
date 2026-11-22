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

## D-018: ⚠️ Test database strategy
**Status:** **Open: decide at Stage 3**
**Issue:** The Stage 1 environment check found that the cloud container used for coding **cannot reach MongoDB Atlas or the MongoDB test-binary download host** (both blocked by the network policy). Options: (a) run database-connected tests on your laptop against a *separate* Atlas test database; (b) find a MongoDB binary that can be installed here; (c) both.
**Rule:** Whatever is chosen, any check that could not be executed here is labelled **"needs your laptop"** with exact steps, and is never reported as passed.

## D-019: ⚠️ Expo SDK version
**Status:** **Open: decide at Stage 7**
**Issue:** Expo Go on your phone only runs projects built for the SDK versions it supports. We will read what your installed Expo Go supports and create the project for that SDK, then verify it on your phone.

## D-020: `mobile-app/` and `admin-dashboard/` are created by their own tools, later
**Status:** Accepted (Stage 2)
**Decision:** Stage 2 creates only `backend/`. The mobile app (Stage 7, Expo) and the dashboard (Stage 12, Vite) are generated by their official tools when their stage starts.
**Why:** Those generators refuse, or ask to wipe, a folder that already contains files. Creating placeholder folders now would only get in their way.

## D-021: Express 5, so no `asyncHandler` helper
**Status:** Accepted (Stage 2)
**Decision:** Use the current Express (5.3.0). It forwards errors from `async` functions to the error handler automatically (proved by a test), so the planned `utils/asyncHandler.js` wrapper is not needed and has been removed from the plan. Also dotenv 18, Jest 30, Supertest 7.
**Why:** Less code and one fewer thing for a beginner to remember to wrap every route in. All of these support Node 22.
**Consequence:** Jest 30 supports Node 22 and 24 but **not** Node 23, so the project asks for Node `^22 || >=24`.

## D-022: `node --watch` instead of nodemon
**Status:** Accepted (Stage 2)
**Decision:** `npm run dev` uses Node's built-in `--watch` (verified: it restarts when a file changes).
**Why:** No extra dependency to install, update or audit.

## D-023: Commits are authored as the project owner; `CLAUDE.md` carries the rules
**Status:** Accepted (Stage 2)
**Decision:** Git commits carry the owner's name and email as author, with a `Co-Authored-By` trailer for Claude. A `CLAUDE.md` file at the repo root records the owner's standing instructions so that any new session starts with the same rules.
**Why:** The owner wants authorship on the work for the academic record. Sessions do not remember earlier chats, but they do read `CLAUDE.md`.
**Note:** Commit author details are visible to anyone who can see the repository. The owner chose which email to use. GitHub also offers a private "noreply" address if they prefer.

---

## How to add a decision

Add the next number, a status, the decision, the reason and any alternative rejected. Never delete an old decision; mark it `Superseded by D-0xx`.
