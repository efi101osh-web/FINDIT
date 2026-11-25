**Last updated:** 2026-11-25 (Stage 7 checkpoint 7b built and tested in the container; the phone check is pending)

This file is the **single source of truth for what actually exists and has been verified**. Other documents describe the *design*. Only this one says what is *done*. Nothing is marked done until it has been run or tested, or its verification limitation is stated.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Done and verified · ⚠️ Done with a stated verification limitation

---

## 1. Summary

| | |
|---|---|
| **Current stage** | Stage 7: Mobile app foundation and screens (7a complete and verified; 7b built, phone check pending) |
| **State** | ⚠️ **Stage 7, checkpoint 7b is built and verified in the container only** (293 mobile tests, 48 deliberately planted bugs each caught, the app bundles for Android, Expo's real development server serves it); **the 7b screens have not been opened on a phone** (steps in [SETUP_GUIDE.md](SETUP_GUIDE.md) Part 8.4). ✅ **Stage 7, checkpoint 7a is verified:** in the container (111 mobile tests, 31 deliberately planted bugs each caught, the app bundles for Android, Expo's real development server serves it) **and on the owner's laptop and Android phone** (the 111 tests pass on the laptop; the app opened in Expo Go and the owner logged in and out; owner-reported). ✅ **Stages 1 to 6 are complete and verified.** Stage 6: in the container (425 automated tests, 30 deliberately planted bugs each caught, a live end-to-end run with Newman: 35 requests, 0 failed) **and on the owner's laptop against Atlas** (269 passed, 156 skipped, 0 failed; 14 PowerShell checks passed, run by a Claude Code session in VS Code and relayed by the owner; the Postman collection itself was not clicked through there). Stage 5: in the container (350 automated tests, 34 deliberately planted bugs each caught, a live end-to-end run with Newman) **and on the owner's laptop against Atlas** (the tests ran as 237 passed and 113 skipped, 0 failed; the new Postman requests and all 12 refusals gave their expected results, owner-reported). Stages 1 to 4: in the cloud container against a real MongoDB 8.0.17 (210 automated tests, 25 deliberately planted security bugs each caught, a live end-to-end run), **and on the owner's Windows laptop against a real MongoDB Atlas cluster** (tests, the first administrator, and every Postman request including the safety refusals) |
| **Next stage** | Stage 8: connect the mobile app to the backend (after the owner confirms 7b on their phone) |
| **What works today** | **Stage 7b (preview data, not yet seen on a phone)**: search with filters and sorting, a report's full details (private ones only on your own report), the lost and found report forms with the zone-then-detail place picker, editing and closing your own report (with a confirmation), and My reports. Reports you make are kept on the phone only until the app closes. **Stage 7a (preview data, seen on the owner's phone)**: a mobile app skeleton in `mobile-app/` (Expo SDK 58) with the FINDIT look, Welcome, Login, Register, a Home screen with sample reports, and a Profile tab with Log out. **It does not talk to the server yet** (Stage 8) and says so on screen. **Stage 6**: browse everyone's active reports and search them by keyword (partial words work, several words must all match, the place name is searched too); filter by type, category, colour, place, status and date range; sort four ways and page through; closed reports and private details are never in the list or the search. **Stage 5**: report a lost or found item, with the campus place chosen as a zone and a detail (which hall, which library, which class); see your own reports; open one report; edit and close your own report; the private details of a report are visible only to its reporter and to administrators (the reporter's contact details only to administrators); closed reports vanish for everyone else. **Stage 4**: sign-up, login, "who am I", profile update and password change; roles (a regular user can never become an admin by signing up); a safe script to create the first administrator; login tokens that cannot be forged; account suspension and role changes that take effect immediately; password-guessing protection; strict input checking that refuses unexpected fields |
| **Everything else** | Planned only: claims, recovery, notifications, image upload, matching, the rest of the mobile app (checkpoint 7b, connecting it to the server), the admin dashboard |

## 2. Stages

| # | Stage | Status | Notes |
|---|---|---|---|
| 1 | Project blueprint and requirements | ✅ | Documents and diagrams complete and checked |
| 2 | Repository and environment setup | ✅ | Verified in the container and on the owner's Windows laptop |
| 3 | Backend foundation and MongoDB connection | ✅ | Verified in the container (real local MongoDB) and on the owner's laptop against Atlas |
| 4 | Authentication and user management | ✅ | Verified in the container and on the owner's laptop against Atlas. Admin management of other users (suspend, change roles) arrives with the dashboard in Stage 12 |
| 5 | Lost and found item reporting | ✅ | Verified in the container and on the owner's laptop against Atlas. **Deferred on purpose:** photos (Stage 9), administrator edit and close (Stage 12, because they need the audit log first) |
| 6 | Browsing and search | ✅ | Verified in the container and on the owner's laptop against Atlas. Photos on cards arrive with Stage 9 (`image` is `null` until then) |
| 7 | Mobile app foundation and screens | 🟨 | **7a done** (project, theme, navigation, Welcome, Login, Register, Home, Profile, on preview data); verified in the container, on the owner's laptop and on the owner's phone. **7b built** (search, report details, report and edit forms, My reports, on preview data); verified in the container, **phone check pending**. D-019 settled: Expo SDK 58 |
| 8 | Connect mobile app to backend | ⬜ | |
| 9 | Image upload and storage | ⬜ | Needs a Cloudinary account |
| 10 | Matching system | ⬜ | |
| 11 | Claims and ownership verification | ⬜ | |
| 12 | Admin dashboard | ⬜ | |
| 13 | Recovery workflow | ⬜ | |
| 14 | Notifications | ⬜ | |
| 15 | Analytics | ⬜ | |
| 16 | Security review | ⬜ | Includes the dev-tooling audit findings in section 5 |
| 17 | Integration and end-to-end testing | ⬜ | |
| 18 | Bug fixes and UI refinement | ⬜ | |
| 19 | Documentation | ⬜ | |
| 20 | Final presentation and demonstration | ⬜ | |

## 3. Component status

| Component | Planned | Implemented | Verified |
|---|---|---|---|
| API endpoints ([API_CONTRACT.md](API_CONTRACT.md)) | 37 | **14**: `GET /health`, `GET /meta/options`, `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`, `POST /items`, `GET /items`, `GET /items/mine`, `GET /items/:id`, `PATCH /items/:id`, `PATCH /items/:id/close` | Container, and the owner's laptop (Atlas, through Postman). For the 6 Stage 5 endpoints the laptop result is owner-reported ("it all went well") without the individual replies. `GET /items` (Stage 6): also checked on the laptop against Atlas with 14 PowerShell checks (run by a Claude Code session in VS Code, relayed by the owner) |
| Database collections ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)) | 6 | **2**: `users`, `items` | Container and the owner's Atlas database (the `items` collection is created by the server on its first start; not separately inspected in Atlas) |
| Mobile screens ([ARCHITECTURE.md](ARCHITECTURE.md#5-mobile-app-structure)) | 16 | **10 built on preview data** (Welcome, Login, Register, Home, Search, Report details, Report for lost and found, Edit report, My reports, Profile). **Not built:** Submit claim and My claims (Stage 11), Notifications (Stage 14), Edit profile (Stage 8) | Container (tests, bundle, dev server). On the owner's phone, 7a (Welcome, Login, Home, Profile) was reported working; **the 7b screens have not been opened on a phone** |
| Dashboard pages ([ARCHITECTURE.md](ARCHITECTURE.md#6-admin-dashboard-structure)) | 10 | 0 | 0 |
| Security controls ([SECURITY_PLAN.md](SECURITY_PLAN.md)) | 27 | **10 implemented** (S-01 to S-04, S-07, S-10, S-14, S-15, S-16, S-24), **11 partial** (below) | Container: automated tests plus deliberately planted bugs |
| Planned backend test cases ([TEST_PLAN.md](TEST_PLAN.md)) | 103 | 61 covered by automated tests (T-ADM-01 only against a stand-in route until Stage 12) | Container |
| Automated tests, mobile app (Jest + jest-expo) | n/a | 293 (all run by default) | 293 of 293 pass (container). Owner's laptop: not yet run for 7b (for 7a it was 111 of 111 on the second run; the first run had 3 time-outs, see section 4) |
| Automated tests, backend (Jest) | n/a | 425 (269 run by default, 156 need a real database) | `test:db`: 425 of 425 pass. Default `npm test`: 269 pass, 156 skipped (container). Owner's laptop (Stage 6 commit `4229a0b`): 269 passed, 156 skipped, 0 failed |
| Postman collection ([documentation/postman](postman)) | n/a | 35 requests, 64 checks (4 walk-through requests and 5 refusals added for browse and search) | Newman against a live server: 0 failed requests; the only 2 failed checks are the optional administrator login, which needs the owner's own admin details. The first 26 requests also ran in the owner's Postman against Atlas (owner-reported); the new 9 were not clicked through in Postman there; the same checks were run as PowerShell requests instead (see Stage 6 on the owner's laptop) |

**Implemented and tested** (S-15 and S-16 in Stage 3; the rest in Stage 4):
- **S-01 Password hashing:** `bcryptjs`, cost 12 by default (never below 10 in production). The raw database value is a 60-character bcrypt hash.
- **S-02 Password policy:** 8 to 72 bytes with a letter and a number; a longer password is refused, never silently cut short.
- **S-03 Token authentication:** HS256 pinned, issuer checked, key of at least 32 characters, placeholders and short keys refused. Forged, cut-off, "none"-algorithm, wrong-key and wrong-algorithm tokens are all refused.
- **S-04 Fresh user lookup:** the token holds only the user id. Suspending an account or changing a role works on the very next request.
- **S-07 No role at sign-up:** the role is never read from the request, and a sent `role` is refused outright.
- **S-10 Safe keyword search (Stage 6):** the typed text is escaped, so pattern characters are plain letters (tested with `.*`, `(.*)+$`, `[a-z]+` and the classic slow pattern `(a+)+$`); at most 60 characters and 5 words; only public fields are searched, never the private details or storage location; operator-style and repeated values are refused.
- **S-14 Rate limiting:** general, failed-login (per address and email) and sign-up limits, as described in D-030.
- **S-24 Generic login errors:** identical replies for an unknown email and a wrong password; an unknown email still pays for a full password check (tested by counting the checks, not by timing).
- **S-15 Security headers** and **S-16 CORS allow-list** (Stage 3).

**Partially started** (none of these is complete; S-06, S-11, S-12 and S-13 were started in Stage 5):
- **S-05 Role-based authorisation:** the `authorize` checkpoint is built and tested, but only against a stand-in route. The real admin routes arrive in Stage 12.
- **S-06 Ownership checks:** done for reports (only the reporter edits or closes; a stranger gets 403, and 404 for a closed report). Claims, notifications and recovery come later.
- **S-08 Strict input validation** and **S-09 NoSQL-injection resistance:** done for sign-up, login, profile, the report endpoints and the browse list; each later endpoint adds its own.
- **S-11 Private fields never public:** done for reports (`select: false` plus whitelist serializers; reporter contact only for administrators; reporter id never sent). Claim evidence comes in Stage 11.
- **S-12 Mass-assignment protection:** done for reports (`status`, `reporterId`, `reportType` on edit, `images`, `isMine`, `closedAt` are refused with 400).
- **S-13 Status state machine:** the report transition table exists and is checked for every combination; closing uses it. Claim transitions come in Stage 11.
- **S-17 Request size limits:** JSON bodies over 100 kB are refused. Upload and pagination limits come later.
- **S-19 Secrets management:** `.gitignore` and `.env.example`; the server refuses to start without the database setting or the token key; secrets cannot appear when the config is printed; error text is redacted; placeholders left in the secret or seed password are refused. The push-time secret scan comes later.
- **S-20 Safe error handling:** unexpected errors return a generic 500 with no detail; all known errors use the standard format.
- **S-23 Account suspension:** enforced at login and on every request. The administrators' ability to suspend arrives in Stage 12.

## 4. Verification log

### Stage 1 (documents)
Mermaid diagrams (5 of 5 render, `@mermaid-js/mermaid-cli` 11), internal links and anchors, JSON examples, endpoint index vs. detail sections (37 = 37), decision references, secret/placeholder scan, and WCAG contrast calculations. All passed. Contrast findings changed the design (see [ARCHITECTURE.md](ARCHITECTURE.md#12-design-tokens)).

### Stage 2 (backend foundation), 2026-11-22
Environment: Linux container, Node 22.23.5, npm 10.9.9, Git 2.43.0.
Installed: express 5.3.0, dotenv 18.0.10 · dev: jest 30.5.2, supertest 7.3.2.

| Check | Method | Result |
|---|---|---|
| Automated tests | `npm test` | ✅ 20 of 20 pass (2 suites) |
| Tests can actually fail | Deliberately made the 500 handler leak the error message, then deliberately stopped hiding the framework header, then restored both | ✅ 2 tests failed, then 1 failed. Files restored byte-for-byte |
| Real server answers | Started with `npm start`, called with `curl` | ✅ health 200 in the standard format; unknown URL 404 in the standard format; malformed JSON 400 in the standard format; no `X-Powered-By` header |
| Reachable from the network | `curl` to the machine's network address, not `localhost` | ✅ HTTP 200. The server accepts connections from other devices, which a phone will need |
| Clean shutdown | SIGTERM, and SIGINT (Ctrl+C) sent to the server process | ✅ Logs "Shutting down", exit code 0. Stopped in 5 ms with a browser-style keep-alive connection open |
| Bad settings | `PORT=abc`, `NODE_ENV=staging` | ✅ Plain-words message, exit code 1 |
| Port already in use | Started a second server on the same port | ✅ Plain-words message, exit code 1 |
| Auto-restart | `npm run dev`, then changed a file | ✅ Restarted and kept answering |
| `.gitignore` protects secrets | Created fake `.env`, `.env.local`, `.pem`, `.zip` and a nested `node_modules`; asked Git | ✅ All ignored. `.env.example` explicitly allowed |
| **Fresh download from GitHub** | Cloned the pushed branch into an empty folder, then ran `npm install`, `npm test`, `npm start` and called the server, with no files carried over from the working copy | ✅ Installed 364 packages; 20 of 20 tests pass; health returned 200 and an unknown URL returned the standard 404; all documentation checks pass on the downloaded copy. Both commits show the owner as author |
| Dependency audit | `npm audit` | ⚠️ **Production dependencies: 0 vulnerabilities. Dev tooling: 18 moderate**, all in Jest's own test tooling (`minimatch`/`glob`), which never ships. npm's suggested fix downgrades Jest to an older version, so it was **not** applied. Revisit at Stage 16 |

### Stage 2 on the owner's laptop, 2026-11-22
Environment (reported by the owner): Windows, PowerShell, Node v24.20.0.

| Check | Result |
|---|---|
| Download from GitHub (`git clone`) | ✅ On the right branch and up to date. `git log` showed the expected three commits (`156dc46`, `4ebe10b`, `4b58413`) |
| `npm install` | ✅ Added 362 packages (audited 363). Same harmless `glob` deprecation notice and same 18 dev-only moderate advisories as in the container. The count differs from the container's 364 by 2, most likely platform-specific optional packages |
| `npm run dev` | ✅ Output matched [SETUP_GUIDE.md](SETUP_GUIDE.md) Part 2 exactly |
| Browser: `/api/v1/health` | ✅ `{"success":true,"data":{"status":"ok",...}}` |
| Browser: `/api/v1/nope` | ✅ `{"success":false,"error":{"code":"NOT_FOUND",...}}` |
| `npm test` | ✅ 2 suites, **20 of 20 tests pass** (7.5 s) |

Not reported by the owner: Ctrl+C shutdown on Windows, and whether a firewall prompt appeared.

**Not verified in Stage 2**
- macOS, or Windows with a Node version other than 24.20.0. (Node 23 is not supported by Jest 30.)
- Access from a phone over Wi-Fi. *(Stage 8. Only "accepts network connections" was checked.)*
- Anything involving MongoDB, Cloudinary or Expo (not used yet).
- Free-tier limits of external services (accounts not created yet).

### Stage 3 (database, security headers, CORS), 2026-11-22
Environment: Linux container (Ubuntu 24.04, Node 22.23.5) using the new `findit` environment (allows `fastdl.mongodb.org`, D-024). Installed: mongoose 9.12.3 (driver 7.8.0), helmet 8.3.0, cors 2.8.6 · dev: mongodb-memory-server-core 11.4.0. Test database: a real, throwaway MongoDB 8.0.17.

| Check | Method | Result |
|---|---|---|
| Plain `npm test` (as on the owner's laptop) | `npm test` | ✅ 64 pass, **7 skipped** (database tests), 0 fail. Skipping is announced |
| All tests with a real database | `npm run test:db` | ✅ **71 of 71 pass** |
| Tests can actually fail | Deliberately broke the code three ways: health always says "connected"; CORS lets every website in; the password is visible when the config is printed | ✅ 4, 3 and 1 tests failed. Files restored byte for byte |
| Real server + real MongoDB (with login) | Started the real server, asked for health, pressed Ctrl+C | ✅ `database: "connected"`; clean exit code 0 |
| `check:db` | Against a working database, using an environment variable and again using a real `.env` file | ✅ Both succeeded. `.env` confirmed ignored by Git |
| Failure explanations | Missing setting; placeholder left in; wrong password (a real database authentication failure); nothing listening | ✅ Each gave a plain-English reason and exit code 1 |
| No secrets in output | Searched all server and `check:db` output from a real wrong-password failure for the passwords | ✅ 0 occurrences |
| **Fresh download from GitHub** | Cloned the pushed branch into an empty folder (commit `484fd23`, 52 files, author is the owner), then `npm ci`, `npm test`, `npm run test:db`, `check:db`, real server, CORS headers and the documentation checks, all from that copy | ✅ Installed 413 packages; default run 64 passed, 7 skipped; `test:db` 71 of 71 pass; `check:db` succeeded; health `database: connected`; the allowed website got its CORS header and another got none; documentation checks pass |

**Bugs found by this verification and fixed**
1. **MongoDB driver under Jest:** every database test failed with *"Missing required sub-document 'driver'"*. Root cause (confirmed in the driver's source): it loads `os` via a dynamic `import()` that Jest cannot run, so its handshake is empty. Plain Node connects fine (checked with 8.0.17 and 8.2.6). Fixed in the test helper only (D-026).
2. **Misleading shutdown message:** Ctrl+C printed "Database connection lost. Trying to reconnect...". Fixed.
3. **`[object Object]`** at the end of the unreachable-database explanation. Fixed, with tests.

### Stage 3 on the owner's laptop and MongoDB Atlas, 2026-11-23
Environment (reported by the owner): Windows, PowerShell, Node v24.20.0; MongoDB Atlas free (M0) cluster, region Paris, MongoDB server **8.0.39**.

| Check | Result |
|---|---|
| `git pull`, then `npm ci` | ✅ After restoring a `package-lock.json` that `npm install` had rewritten (see below). `npm ci` added 411 packages (the container's 413; the 2-package difference is platform-specific optional packages) |
| `npm test` | ✅ 4 suites passed, 2 skipped; **64 passed, 7 skipped, 0 failed** (9 s) |
| `npm run check:db` against Atlas | ✅ **SUCCESS**: database `findit`, server 8.0.39, address `ac-...-shard-00-00...mongodb.net`. Confirms Mongoose 9 / driver 7.8 against a real Atlas cluster, and the credentials, the IP allow-list and the connection-string format (the three-server `mongodb://` form that Atlas offered) |
| `npm run dev` + health page | ✅ `{"success":true,"data":{"status":"ok","database":"connected",...}}` |
| Atlas security setup | ✅ Owner reports: leaked Atlas Admin user deleted; the app uses a limited `findit_app` user |
| Update to the final Stage 3 commit (`974844e`) | ✅ `git pull` fast-forwarded with no conflict (the `package-lock.json` problem did not recur); `npm ci` added 411 packages; `npm test`: 4 suites passed, 2 skipped, **66 passed, 7 skipped, 0 failed** (12 s) |

**Problems met during the owner's setup, and what changed**
1. **`git pull` blocked by `package-lock.json`:** `npm install` on the laptop rewrote it (cause not reproduced in the container; most likely a newer npm). Fix: `git restore package-lock.json`. Prevention: the guides now use `npm ci`, which never rewrites the lock file.
2. **A database password was pasted into the chat.** It was rotated (new user, old user deleted). The setup guide and security plan now say what to do and to mask secrets when asking for help. The Atlas quick setup also creates an **Atlas Admin** user, so the guide now has the owner create a limited user and delete the admin one.
3. **`MONGODB_URI=MONGODB_URI=...`** (label pasted twice) gave a generic error. The program now recognises this slip and says exactly what to delete (new tests added).

**Not verified in Stage 3**
- `npm run test:db` on Windows (optional; about 760 MB one-time download).
- That the `findit_app` user's role is exactly "Read and write to any database" (owner-reported, not independently checked).
- Atlas free-tier limits (about 512 MB storage) were not measured.

### Stage 4 (accounts, login, roles, rate limiting), 2026-11-23
Environment: Linux container (Node 22.23.5) with a real, throwaway MongoDB 8.0.17. Installed: bcryptjs 3.0.3, jsonwebtoken 9.0.3, zod 4.6.7, express-rate-limit 8.7.5.

| Check | Method | Result |
|---|---|---|
| All tests with a real database | `npm run test:db` | ✅ **200 of 200 pass** |
| Plain `npm test` (as on the owner's laptop) | `npm test` | ✅ 140 pass, 60 skipped, 0 fail |
| Tests can actually fail | 25 realistic security bugs planted one at a time (every sign-up becomes admin, strict validation loosened, suspended check removed, token algorithm not pinned, unknown email answered differently or without a password check, password hash in the response, unique email removed, login not rate limited, role check removed, passwords stored in plain text, current password not checked, profile accepts a role, validation skipped, suspension revealed to guessers, password hash always loaded, rate limit ignored, role trusted from the token, correct logins counted against the limit, login budget ignoring the email, sign-up not limited, placeholder secret accepted, placeholder admin password accepted, ...) | ✅ **All 25 caught.** One initially slipped through (the link from the settings to the limiter), so a test was added. The source was confirmed byte for byte identical after every batch |
| Live end-to-end | Real server and real MongoDB, driven with `curl`: seed the admin through a real `.env` file, sign up, log in, who-am-I, profile change, password change, a hand-written "none" token, 11 wrong-password guesses | ✅ All as designed. The lock-out came after exactly 10 failures, refused even the correct password, and did not affect another account. At the default strength, sign-up took 0.35 s and login 0.30 s (the owner's laptop is likely 2 to 3 times slower) |
| Postman collection | Newman against a live server, with a seeded admin | ✅ 11 requests, 19 checks, **0 failed** |
| What is really stored | Read the raw database documents | ✅ `$2b$12$` hashes of 60 characters; the roles are right; no plain passwords |
| No secrets in logs | Searched the server log for every password and the signing key | ✅ 0 occurrences |
| Simultaneous duplicate sign-ups | Five identical sign-ups at the same instant | ✅ Exactly one account |
| Dependency audit | `npm audit --omit=dev` | ✅ **0 vulnerabilities in the 106 production packages** (including the four new libraries) |
| **Fresh download from GitHub** | Cloned the pushed branch (commit `20a853d`, 66 files, author is the owner) into an empty folder, then `npm ci` (431 packages), `npm test`, `npm run test:db`, the documentation checks and a JSON check of the Postman collection | ✅ Default: 140 passed, 60 skipped. `test:db`: **200 of 200 pass**. Documentation checks pass. Collection is valid |

**Problems found by this verification and fixed**
1. **Rate-limit design flaw:** the first design counted every sign-up and login request (10 per address per 15 minutes). It would have locked out the owner after about ten Postman clicks, and a whole campus behind one shared address after ten logins. Redesigned to count only **failed** logins per address and email (D-030).
2. **Zod 4 checks the format before trimming:** an email with stray spaces would have been wrongly refused, and a 300-character email passed. Fixed (D-031).
3. **Misleading message:** a profile update containing the forbidden field `email` also said "Send at least one field to change". Fixed.
4. **Placeholder text accepted as a secret:** a forgotten `<paste the key here>` would have become the token-signing key, and a forgotten placeholder could have become the admin password. Both are now refused.
5. **Test gap:** the deliberate-bug check revealed that nothing proved the rate limits in `.env` were used. A test was added.

### Stage 4 on the owner's laptop and MongoDB Atlas, 2026-11-23 and 2026-11-24
Environment (reported by the owner): Windows, PowerShell, Node 24.20.0, MongoDB Atlas free cluster.

| Check | Result |
|---|---|
| `git pull`, then `npm ci` | ✅ Fast-forward with no conflict (the lock-file problem did not recur). 429 packages (431 in the container; platform difference) |
| `npm test` | ✅ **140 passed, 60 skipped, 0 failed** (7 suites passed, 7 skipped) |
| `npm run seed:admin` against Atlas | ✅ **SUCCESS**: the first administrator now exists in the real Atlas database |
| Postman collection imported | ✅ Import Complete; all 11 requests are present (owner's screenshot) |
| Starting the server and running the Postman requests | ✅ After switching from the MTN MiFi to the phone's hotspot (mobile data), `npm run check:db` connected to Atlas (server 8.0.39). Then, owner-reported: health 200 with `database: connected`; Register (one `ECONNRESET` on the first try, a retry gave 201); Login, Who am I, Update profile and Change password all as expected; the four refusals (sign-up as admin, change email via profile, wrong password, no token) were all refused as designed; the administrator login gave 200 |

**Added on 2026-11-24 in response to the network problem:** a `MONGODB_TIMEOUT_MS` setting (default 10 seconds, 1 to 120 seconds allowed) so a slow mobile connection can be given longer to reach Atlas, and a hint in the timeout message pointing to it. Verified in the container: 208 of 208 tests pass, and the setting measurably changes how long `check:db` waits (1.5 s setting gave up after 1.7 s; 4 s after 4.2 s). Not yet tried on the owner's network.

**Also added on 2026-11-24, after the owner's first Postman request failed once with `ECONNRESET` (a retry worked):** the server now keeps idle connections open for 65 seconds instead of Node's default 5 (`utils/configureServer.js`), because clients that reuse a connection just as the server closes it get that error. Verified in the container: 210 of 210 tests pass, removing the setting makes 2 tests fail, and the real server advertises `Keep-Alive: timeout=65` and still shuts down in 10 ms with an idle connection open. The glitch itself is timing-dependent, so it could not be reproduced here; the owner's retry succeeding fits this cause but did not prove it.

**Not verified in Stage 4**
- **Password-hashing time on the owner's laptop** (estimated at 0.7 to 1 s per login at cost 12). Not measured.
- **The `findit_app` and Atlas allow-list settings** are owner-reported, not independently checked.
- **Why the server window sometimes returned to the prompt on its own.** The owner reported that `npm run dev` stopped by itself (twice, with no error message and no "Shutting down" line). The exit code was not captured, and the server stayed up long enough for every check. Suspected causes: an accidental Ctrl+C or window action, or watch mode. Watch item, see section 5.

### Stage 5 (lost and found reporting), 2026-11-24
Environment: Linux container (Node 22.23.5) with a real, throwaway MongoDB 8.0.17. **No new dependencies were added** (the lock file did not change).

| Check | Method | Result |
|---|---|---|
| All tests with a real database | `npm run test:db` | ✅ **350 of 350 pass** (20 suites) |
| Plain `npm test` (as on the owner's laptop) | `npm test` | ✅ 237 pass, 113 skipped, 0 fail |
| Tests can actually fail | **34 realistic bugs planted one at a time**: a closed report visible to strangers; strangers or administrators given the wrong view; the reporter's contact details shown to the reporter; everyone counted as the owner; 404 turned into 403; an administrator allowed to edit or close; "my reports" listing everyone's, oldest first, skipping the wrong page, rounding the page count down, ignoring each filter; editing allowed in any status; edit or close without an owner check; closing without the status rules; found-only fields accepted on a lost report; an old hall name carried into a new zone; `null` no longer clearing a field; the close time forgotten; private fields always sent or the storage location leaked on a lost report; `/items/mine` swallowed by `/items/:id`; creating without a login; unknown fields accepted on create and on edit; future dates allowed up to a month ahead; dates allowed ten years back; `select: false` removed from each of the three private fields; `reportType` or `reporterId` made changeable | ✅ **All 34 caught.** One slipped through the first time (nothing checked that the close reason is hidden by default), so a test was added and that bug was then caught. After the batches the source was confirmed identical: the full suite passed again |
| Live end-to-end | Real server (`node src/server.js`) and a real throwaway MongoDB; the whole Postman collection run by Newman, then raw `curl` with a stranger, the reporter and a seeded administrator | ✅ 26 requests, 0 failed; 47 checks, with only the 2 optional administrator-login checks failing (no admin details were set in this run). A stranger saw no private details and no reporter; the administrator saw both; a stranger's edit, a stranger's close and an administrator's edit were all `403` |
| Place options | `GET /meta/options` as served | ✅ 16 zones when first built (15 after the follow-up below); male halls are a pick-list including Winslow; the library asks for a description |

**Design decisions made in this stage** (see [DECISIONS.md](DECISIONS.md) D-033 to D-036): the location is a zone plus a detail; the date rules; administrator edit and close wait for the audit log; closed reports are invisible except to the owner and administrators.

### Stage 5 on the owner's laptop and MongoDB Atlas, 2026-11-24
Environment (reported by the owner): Windows, PowerShell, Node 24.20.0, MongoDB Atlas free cluster (server 8.0.39).

| Check | Result |
|---|---|
| `git pull`, then `npm ci` | ✅ Fast-forward `3c3e8ac..e810bbd` with no conflict; 429 packages |
| `npm test` | ✅ **237 passed, 113 skipped, 0 failed** (12 suites passed, 8 skipped), pasted by the owner |
| Starting the server | ⚠️ The first two `npm start` attempts and the first `check:db` could not reach Atlas ("The database did not answer in time"). This was the connection (network or Atlas allow-list), not the code: the failure happens before any report code runs. After the owner changed the connection, `npm run check:db` printed SUCCESS (server 8.0.39). The owner did not say which change fixed it |
| Postman: requests 6 to 12 and the 12 refusals | ✅ **Owner-reported:** "it all went well", with 400, 401, 404 and 409 replies seen in the refusal folder. The individual replies were not sent, so each request's result is not independently confirmed |
| Optional administrator login | Not reported for this stage (it passed in Stage 4) |

**Follow-up on 2026-11-24 after the owner's answers:** the owner confirmed that **Emerald Hall and Topaz Hall are male halls** and that **"Nyberg" is the right spelling**. Both halls were added to the male-hall list, and the temporary "Other halls" zone was removed, so there are now **15 zones** (D-033). Container: 350 of 350 tests pass again.

**Not verified in Stage 5**
- **The `items` collection and its five indexes in Atlas** were not looked at directly; the Postman requests working implies they exist.
- **The place names.** They come from the owner's list of Babcock University places. The owner confirmed Emerald, Topaz and Nyberg only; the rest were not independently checked.
- **No performance test** of listing with many reports; the indexes exist, the volume is campus scale.
- **Photos, browsing everyone's reports, administrator edit and close** do not exist yet (Stages 9, 6 and 12).

### Stage 6 (browse and search), 2026-11-24
Environment: Linux container (Node 22.23.5) with a real, throwaway MongoDB 8.0.17. **No new dependencies were added** (the lock file did not change).

| Check | Method | Result |
|---|---|---|
| All tests with a real database | `npm run test:db` | ✅ **425 of 425 pass** (22 suites) |
| Plain `npm test` (as on the owner's laptop) | `npm test` | ✅ 269 pass, 156 skipped, 0 fail |
| Tests can actually fail | **30 realistic bugs planted one at a time**: search text not escaped (everywhere, and just the parentheses); the private details, and separately the private storage location, made searchable; any word matching instead of all words; CLOSED, and separately RETURNED, added to the default list; the closed-status safety belt removed; the status parameter ignored; the validator allowing `status=CLOSED`; the page-size cap raised to 5000; unknown parameters accepted; one-letter search allowed; the 60-character search limit raised to 600; either end of the date range no longer inclusive; a backwards date range allowed; "newest event" sorted the wrong way; no tie-breaker in the sort; paging skipping the wrong number; the page count rounding down; the list needing no login; the zone name no longer searched; only one search word kept; words not lower-cased; search made case-sensitive; each of the type, category, colour and place filters ignored or pointed at the wrong field | ✅ **All 30 caught on the first run.** Afterwards `src/` and `tests/` were compared with a backup taken before the run and were identical |
| Live end-to-end | Real server (`node src/server.js`) and a real throwaway MongoDB; the whole Postman collection run by Newman, then raw requests | ✅ **35 requests, 0 failed; 64 checks, with only the 2 optional administrator-login checks failing** (no admin details were set in this run). A search for another person's private text and for a storage place found nothing; a search for part of a word found the report as a public card with no private field, no name and no email; `category[$ne]=KEYS` and `status=CLOSED` were `400`; no login was `401`. The server log held no errors |

**Design decisions made in this stage:** see [DECISIONS.md](DECISIONS.md) D-037 (words must all match; escaped, public fields only; `CLOSED` refused; stable paging).

**Found and fixed while building:** a badly formatted date filter (for example `14/11/2026`) produced two messages for the same field. It now says once that the format is wrong.

**On the owner's laptop and MongoDB Atlas, 2026-11-25**
Environment (reported by the owner): Windows, PowerShell, Node 24.20.0, npm 11.6.2, MongoDB Atlas free cluster, commit `4229a0b`, working tree clean. These checks were run by the **Claude Code extension in VS Code on the laptop** (a separate session from the cloud one) and the results were pasted by the owner. I did not watch them run.

| Check | Result |
|---|---|
| `git pull` | ✅ Fast-forward to `4229a0b`. Windows Git printed `Unlink of file '.git/objects/pack/...idx' failed` after the fetch. It is harmless housekeeping (another program had the old file open); answering `n` is safe |
| `npm ci` | ✅ 429 packages |
| `npm test` | ✅ **269 passed, 156 skipped, 0 failed** |
| `npm start` | ✅ `Connected to MongoDB (database "findit")` and `FINDIT API is running`; health check `200` with `database: connected`. (The first start the day before could not reach Atlas: a network problem, not the code) |
| The Part 7 checks, as PowerShell requests against the running server | ✅ **14 of 14 passed:** 5 setup steps (register `201`, login `200`, report a lost item `201`, report a found item `201`, close the lost item `200`); browse `200`, search by part of a word `200`, filter and sort `200`, search with pattern characters `200`; and the 5 refusals, each `400` (one-letter search, `status=CLOSED`, `limit=500`, `category[$ne]=KEYS`, backwards date range). The session also confirmed that the found keys were listed, the closed report was not, no private field appeared on a card, and the fake account's name and email were not on any card |
| Data added to Atlas | 1 fake account (`@example.com`) and 2 fake reports (the lost one is closed). No password, token or email was printed |

**Not verified in Stage 6**
- **The Postman collection import on the laptop** for the 9 new requests (the PowerShell requests copied their bodies and pass rules).
- **Search speed with many reports.** A partial-word search scans, it cannot use an index. Only a small number of reports was tried. At campus scale this should be fast, but it was not measured with realistic volumes ([SECURITY_PLAN.md](SECURITY_PLAN.md) risk 16).
- **Photos on cards** do not exist yet (`image` is `null`, Stage 9).

### Stage 7, checkpoint 7a (mobile app foundation), 2026-11-25
Environment: Linux container (Node 22.23.5). Expo SDK 58, React Native 0.88.1, React 19.3.0, React Navigation 7. **Never run on a phone.**

| Check | Method | Result |
|---|---|---|
| All mobile tests | `npm test` in `mobile-app` | ✅ **111 of 111 pass** (10 suites), no warnings |
| Tests can actually fail | **31 realistic bugs planted one at a time** (weaker password rules; bytes counted as characters; a date shown a day early; a "future" date reading "-1 days ago"; missing and wrong labels; the raw place code shown; a slow old answer overwriting a new one; the Lost filter asking for the wrong kind; a dead Try-again button; the wrong form opened; sign-out keeping the user; a refused login still signing in; a stuck loading state; a disabled button still firing; a role sent at sign-up; the password trimmed; the form not checked; the server's message hidden; private details on a card; "Your report" missing; a visible password; an error not announced; unreadable badge text; a pale brand colour; a faint form outline) | ✅ **All 31 caught.** Afterwards the source was identical to a backup taken before the run |
| The app builds for Android | `expo export --platform android` | ✅ 2.4 MB Hermes bundle; every import resolves |
| The real development server | `expo start --offline`; asked for the manifest and bundle the way Expo Go does | ✅ Manifest: app `FINDIT`, `runtimeVersion exposdk:58.0.0`. Bundle request: `200`, 5.5 MB, no errors in the Metro log |
| The app agrees with the backend | Tests read the backend's own code | ✅ The app is never stricter than the server on names, emails or passwords, and agrees on every password case tried; every category, colour, status and report type the backend can send has a label; every category has a real icon; the preview report cards have exactly the fields the backend's `toItemCard` produces; the preview place names match the backend's. (These are skipped, with a warning, if the backend's libraries are not installed.) |

**Found and fixed while building**
1. `expo-asset` was missing. The icon fonts need it, so the app could have failed on the phone. A test caught it.
2. A disabled button still reacted in a test. It now uses React Native's own `disabled` setting as well.
3. An error message box was not read out as one unit by screen readers. Fixed.
4. The container cannot reach the Expo servers that `expo install` uses, so versions were taken from the SDK's own list inside the `expo` package ([DECISIONS.md](DECISIONS.md) D-039).

### Stage 7, checkpoint 7a on the owner's laptop and Android phone, 2026-11-25
Environment (reported by the owner): Windows, PowerShell, Node 24.20.0, Android phone with Expo Go. The laptop steps were run by a Claude Code session in VS Code and relayed by the owner; the phone steps were done by the owner.

| Check | Result |
|---|---|
| `git pull` | ✅ Fast-forward to `577c7d6`, clean working tree |
| `npm ci` in `mobile-app` | ✅ 1,086 packages in about 6 minutes; only deprecation warnings; npm's summary: 23 vulnerabilities (22 moderate, 1 critical), the findings already recorded in section 5 |
| `npm test` (first run) | ⚠️ **108 passed, 3 failed**: three tests that draw a whole screen hit Jest's 5-second limit ("Exceeded timeout of 5000 ms"); the run took 103 s. This was a slow first run on an empty cache, not a wrong result |
| `npm test` (second run, nothing changed) | ✅ **111 of 111 pass** in 20.8 s. Nothing else changed between the runs, which fits the cold-cache explanation without strictly proving it |
| Fix | The test time limit was raised to 30 seconds (`testTimeout` in `mobile-app/package.json`), so a first run on a slow laptop no longer fails. Container: 111 of 111 still pass |
| `npx expo start`, then scanning the QR code with Expo Go | ✅ **Owner-reported: "all is working".** The app opened in Expo Go and the owner logged in and logged out. This also confirms that Expo SDK 58 (D-019) is what the owner's Expo Go supports |

**Not verified in 7a**
- **Which network worked** (same Wi-Fi, hotspot or tunnel) was not reported, and neither was anything that looked wrong. Only "all is working" was reported, so the finer points (the look on the phone's notch and bars, keyboard behaviour, text cut off, how comfortable the buttons are) are **not individually confirmed**.
- **The Register screen, the Home filters and pull-to-refresh, and the five tabs** were not individually reported on the phone (they pass their automated tests).
- **The three placeholder tabs** have no function yet. Photos on cards arrive in Stage 9.

### Stage 7, checkpoint 7b (search, details, report forms, my reports), 2026-11-25
Environment: Linux container (Node 22.23.5). Expo SDK 58. **The 7b screens have never been opened on a phone.**

| Check | Method | Result |
|---|---|---|
| All mobile tests | `npm test` in `mobile-app` | ✅ **293 of 293 pass** (16 suites), no warnings |
| Tests can actually fail | **48 realistic bugs planted one at a time** across the form rules (a far-future or ancient date allowed, a hall not taken from the list, the library detail no longer required, limits raised, found-only fields sent on a lost report, text not trimmed, nothing-changed not noticed, a wrong date or month), the search (any word instead of all, private details searched, closed or returned reports in the list, a wrong sort, wrong paging, other people's reports in My reports), the store rules (strangers seeing private fields or closed reports, anyone editing, editing or closing in any status, an old place detail kept in a new zone) and the screens (form not checked, form not cleared, the wrong report opened, closing without asking, edit and close offered in any state, a one-letter search, a filter ignored, "Load more" replacing instead of adding, a slow old search overwriting a new one, a list that stays open, the wrong "Yesterday", Home cards not tappable) | ✅ **All 48 caught.** On the first run **44** were caught; **4 slipped through** because the sample reports contained no returned report, no closed report of someone else's, no other-person report with private data, and no description with spaces around it. Four tests were added and those four bugs were then caught. Afterwards the source was identical to a backup |
| The app builds for Android | `expo export --platform android` | ✅ 2.5 MB bundle; every import resolves |
| The real development server | `expo start --offline`; manifest and bundle requested the way Expo Go does | ✅ Manifest: app `FINDIT`, `runtimeVersion exposdk:58.0.0`. Bundle: `200`, 5.6 MB, no errors |
| The form agrees with the server | The form's yes or no is compared with the backend's own `createItemSchema` on 26 cases, and with the backend's own place rules for **every hall, church and auditorium name** | ✅ Same answer every time |
| The preview data agrees with the server | Tests read the backend's own code | ✅ The preview place list is **exactly** the backend's (every zone, hall and church); the preview report details have exactly the fields the server's `toItemDetail` sends, for a stranger and for the owner, lost and found, before and after editing and closing |
| Icons | A test scans the app for every icon name it uses | ✅ All 20 are real icons (a typo would show as an empty square) |

**Found and fixed while building**
1. The "Private" box on the form had a light purple background, so its grey helper text would have been below the readable contrast your design document warns about (4.42:1). It is now a white box with a purple outline.
2. After closing a report, "Closed" appeared twice on the screen (the status badge and a label). The label now reads "Closed on".
3. A long list drew only its first 10 names until scrolled. The place lists are short (at most about 30 names), so they are now drawn in full.

**Not verified in 7b**
- **Opening any 7b screen on the phone:** the look, the keyboard, scrolling in the long lists, the pick-list windows (full-screen lists), how the date buttons feel, and whether text is cut off.
- **Saving to the real server.** Everything here is preview data: a report you make is kept on the phone only until the app closes, and nothing is sent anywhere (Stage 8).
- **The mobile tests on the owner's laptop** for 7b.
- **Photos** (Stage 9), **claims** (Stage 11) and **notifications** (Stage 14) have no screens yet.

## 5. Known issues and open decisions

| ID | Item | Decide / fix at |
|---|---|---|
| Network (owner), resolved | The MTN MiFi could not reach Atlas (a mobile network that changes the public address and may block the database port). On the phone's hotspot it works. For development, use the phone hotspot, and in Atlas Network Access use *Allow Access from Anywhere* while the address keeps changing (to be tightened before real use). A `MONGODB_TIMEOUT_MS` setting exists for slow connections | Owner, ongoing |
| Server window stopping (watch) | `npm run dev` returned to the prompt by itself twice, silently. If it recurs, run `$LASTEXITCODE` right after it stops and report the number. `npm start` (no watch mode) is the steadier way to run it for testing | When it recurs, or in Stage 8 |
| **Demo network plan** | The final demonstration needs the laptop to reach Atlas. Options to settle before Stage 20: a stable Wi-Fi or a hotspot that is known to work, or a local MongoDB on the laptop as an offline fallback (the app only needs a different `MONGODB_URI`; the Windows test copy is large, so this would be prepared deliberately). Ordinary app users will never connect to Atlas themselves, only the backend does | Stage 17 |
| Spam | Any logged-in user can create unlimited reports; only the general per-address limit applies ([SECURITY_PLAN.md](SECURITY_PLAN.md) risk 14) | Stage 12 or 16 |
| D-019 | Expo SDK 58 was chosen from the owner's report that their Expo Go supports it ([DECISIONS.md](DECISIONS.md) D-019). **Confirmed** on 2026-11-25: the app opened in the owner's Expo Go (owner-reported) | Closed |
| Phone to laptop (Stages 7 and 8) | **It worked** for the Expo connection in 7a (owner-reported; which network was used was not reported). The laptop's Wi-Fi is classed **Public** and has a campus-style address (`10.128.1.226`, a wide `/23` network). Windows may block the phone, and some campus Wi-Fi stops devices talking to each other. Fallbacks, in order: allow Node through the firewall, use the phone's hotspot, or Expo's tunnel mode | Part 8 of the setup guide; Stage 8 |
| Audit | **Backend:** 18 moderate advisories in Jest's dev-only dependency chain (production dependencies: 0). **Mobile app:** `npm audit --omit=dev` lists 4: `react-server-dom-webpack@19.3.0` (critical, React Server Components servers; an unused test-time companion of `jest-expo`, not in the app, and Expo SDK 58 pins React so 19.3.1 cannot be used) and `minimatch` (3 moderate, in Expo's command-line tools; the offered fix downgrades Expo to 52 and was refused). On the laptop, `npm ci` printed 23 vulnerabilities (22 moderate, 1 critical), which counts the same findings plus Jest's test tooling. See [DECISIONS.md](DECISIONS.md) D-039 | Stage 16 |
| Risks 10 to 12 | Rate-limit counters in memory; no per-account lock-out across addresses; hosting behind a proxy needs `trust proxy` ([SECURITY_PLAN.md](SECURITY_PLAN.md) section 4) | Stages 16 and 17 |
| Atlas user | Narrow the `findit_app` role from "read and write to any database" to the `findit` database only | Stage 16 |

## 6. What exists in the repository

```text
CLAUDE.md                       Standing instructions for the AI assistant (carries between sessions)
README.md, .gitignore
backend/
  package.json, package-lock.json, .env.example, .gitignore, README.md
  src/config/                   env.js (validated settings; secrets hidden), db.js, constants.js, campusLocations.js (the places)
  src/models/                   User.js, Item.js, index.js (initModels)
  src/validators/               fields.js, authValidators.js, userValidators.js, itemValidators.js (Zod, strict)
  src/middleware/               authenticate, authorize, validate, rateLimiters, cors, notFound, errorHandler
  src/services/                 passwordService, tokenService, authService, userService, adminSeedService, itemService, itemSearch, statusRules, index
  src/controllers/, src/routes/ health, auth, users, items, meta
  src/utils/                    ApiError, respond, serializers
  src/app.js, src/server.js
  scripts/                      checkDatabase, testWithDatabase, generateSecret, seedAdmin
  tests/                        425 tests (+ setup/ and helpers/)
documentation/                  All documents, updated for Stage 6
documentation/postman/          FINDIT.postman_collection.json (35 requests, 64 checks)
```

```text
mobile-app/                     Expo SDK 58 (JavaScript). Started in Stage 7
  App.js, app.json, package.json, package-lock.json
  src/theme/                    colors, spacing, typography, statusColors, navigationTheme
  src/components/               Screen, Button, TextField, SelectField, ChoiceChips, DateField, SwitchRow, ReportForm, ItemCard, StatusBadge, Chip, Notice, Logo, StateViews
  src/screens/                  Welcome, Login, Register, Home, Search, ItemDetails, Report, EditReport, MyReports, Profile
  src/navigation/               RootNavigator, AuthStack, AppStack, MainTabs
  src/context/, src/hooks/      AuthContext; useOptions, useReportForm
  src/api/                      PREVIEW versions until Stage 8: sampleData, previewStore, previewSearch, previewZones, itemsApi, authApi, metaApi, ApiError
  src/utils/                    validation, itemValidation, format, labels, place
  tests/                        293 tests (+ helpers/)
```

`admin-dashboard/` does not exist yet. It is created by its own tool in Stage 12.
