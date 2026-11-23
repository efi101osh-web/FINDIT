# FINDIT: Implementation Status

**Last updated:** 2026-11-23 (end of Stage 3)

This file is the **single source of truth for what actually exists and has been verified**. Other documents describe the *design*. Only this one says what is *done*. Nothing is marked done until it has been run or tested, or its verification limitation is stated.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Done and verified · ⚠️ Done with a stated verification limitation

---

## 1. Summary

| | |
|---|---|
| **Current stage** | Stage 3: Backend foundation and MongoDB connection |
| **State** | ✅ Stages 1 to 3 complete and verified: in the cloud container against a real MongoDB 8.0.17, **and on the owner's Windows laptop against a real MongoDB Atlas free cluster** (server 8.0.39) |
| **Next stage** | Stage 4: Authentication and user management |
| **What works today** | The backend connects to MongoDB and answers `GET /api/v1/health` (including `database: connected`); sends security headers; enforces a CORS allow-list; explains database problems in plain English without ever showing the password; 73 automated tests pass (66 by default plus 7 that need a real database) |
| **Everything else** | Planned only: database, accounts, items, claims, mobile app, dashboard |

## 2. Stages

| # | Stage | Status | Notes |
|---|---|---|---|
| 1 | Project blueprint and requirements | ✅ | Documents and diagrams complete and checked |
| 2 | Repository and environment setup | ✅ | Verified in the container and on the owner's Windows laptop |
| 3 | Backend foundation and MongoDB connection | ✅ | Verified in the container (real local MongoDB) and on the owner's laptop against Atlas |
| 4 | Authentication and user management | ⬜ | |
| 5 | Lost and found item reporting | ⬜ | |
| 6 | Browsing and search | ⬜ | |
| 7 | Mobile app foundation and screens | ⬜ | Decision D-019 (Expo SDK) to be settled here |
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
| API endpoints ([API_CONTRACT.md](API_CONTRACT.md)) | 37 | **1**: `GET /health` (complete) | Container (real MongoDB) and owner's laptop (Atlas): `database: connected` |
| Database collections ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)) | 6 | 0 | 0 |
| Mobile screens ([ARCHITECTURE.md](ARCHITECTURE.md#5-mobile-app-structure)) | 16 | 0 | 0 |
| Dashboard pages ([ARCHITECTURE.md](ARCHITECTURE.md#6-admin-dashboard-structure)) | 10 | 0 | 0 |
| Security controls ([SECURITY_PLAN.md](SECURITY_PLAN.md)) | 27 | **2 implemented** (S-15, S-16), **3 partial** (below) | Container (automated tests). Owner's laptop for the secrets-related ones |
| Planned backend test cases ([TEST_PLAN.md](TEST_PLAN.md)) | 88 | 10 covered by automated tests | Container (and owner's laptop for the non-database ones) |
| Automated tests (Jest) | n/a | 73 (66 run by default, 7 need a real database) | `test:db`: 73 of 73 pass (container). Default `npm test`: 66 pass, 7 skipped (container). Owner's laptop ran 64 passed, 7 skipped on the previous commit (the 2 newest tests were added after) |

**Implemented and tested in Stage 3:**
- **S-15 Security headers:** Helmet's standard headers (content-type sniffing protection, framing protection, CSP, HSTS, referrer policy) on every response including errors; framework header removed.
- **S-16 CORS allow-list:** only the listed websites are approved; `*` is refused in settings; no cookies cross-site; the mobile app, Postman and curl are unaffected.

**Partially started** (none of these is complete):
- **S-17 Request size limits:** JSON bodies over 100 kB are refused. Upload and pagination limits come later.
- **S-19 Secrets management:** `.gitignore` and `.env.example` (tested with fake secrets); the server refuses to start without the database setting; the connection string cannot appear when the config is printed; error text is redacted. The push-time secret scan comes later.
- **S-20 Safe error handling:** unexpected errors return a generic 500 with no detail. Validation, permission and conflict errors arrive from Stage 4.

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

**Problems met during the owner's setup, and what changed**
1. **`git pull` blocked by `package-lock.json`:** `npm install` on the laptop rewrote it (cause not reproduced in the container; most likely a newer npm). Fix: `git restore package-lock.json`. Prevention: the guides now use `npm ci`, which never rewrites the lock file.
2. **A database password was pasted into the chat.** It was rotated (new user, old user deleted). The setup guide and security plan now say what to do and to mask secrets when asking for help. The Atlas quick setup also creates an **Atlas Admin** user, so the guide now has the owner create a limited user and delete the admin one.
3. **`MONGODB_URI=MONGODB_URI=...`** (label pasted twice) gave a generic error. The program now recognises this slip and says exactly what to delete (new tests added).

**Not verified in Stage 3**
- `npm run test:db` on Windows (optional; about 760 MB one-time download). The owner's laptop has not re-run the two newest tests.
- That the `findit_app` user's role is exactly "Read and write to any database" (owner-reported, not independently checked).
- Atlas free-tier limits (about 512 MB storage) were not measured.

## 5. Known issues and open decisions

| ID | Item | Decide / fix at |
|---|---|---|
| D-019 | Which Expo SDK version to use | Stage 7 |
| Audit | 18 moderate advisories in Jest's dev-only dependency chain | Stage 16 |

*D-018 (test database) was settled in Stage 3. The Atlas database user will be narrowed from "read and write to any database" to the `findit` database only in the Stage 16 security review.*

## 6. What exists in the repository

```text
CLAUDE.md                       Standing instructions for the AI assistant (carries between sessions)
README.md, .gitignore
backend/
  package.json, package-lock.json, .env.example, .gitignore, README.md
  src/config/env.js             Settings loader: validates, never reads files itself
  src/config/db.js              MongoDB connection, state, redaction, plain-English errors
  src/controllers/healthController.js
  src/routes/index.js, healthRoutes.js
  src/middleware/cors.js, notFound.js, errorHandler.js
  src/app.js                    createApp(config): Helmet, CORS, JSON, routes, errors
  src/server.js                 settings -> database -> web server -> clean shutdown
  scripts/checkDatabase.js      npm run check:db   (read-only Atlas check)
  scripts/testWithDatabase.js   npm run test:db    (all tests with a real throwaway MongoDB)
  tests/                        health, config, security, dbErrors, database, databaseAuth (+ setup/ and helpers/)  (73 tests)
  (empty placeholders: src/models, services, validators, utils)
documentation/                  All documents, updated for Stage 3
```

`mobile-app/` and `admin-dashboard/` do not exist yet. They are created by their own tools in Stages 7 and 12.
