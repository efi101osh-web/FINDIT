# FINDIT: Implementation Status

**Last updated:** 2026-11-22 (end of Stage 2)

This file is the **single source of truth for what actually exists and has been verified**. Other documents describe the *design*. Only this one says what is *done*. Nothing is marked done until it has been run or tested, or its verification limitation is stated.

**Legend:** ⬜ Not started · 🟨 In progress · ✅ Done and verified · ⚠️ Done with a stated verification limitation

---

## 1. Summary

| | |
|---|---|
| **Current stage** | Stage 2: Repository and environment setup |
| **State** | ⚠️ Built and verified in the cloud container (Linux, Node 22.23.5). **Not yet run on the owner's laptop.** That run is the owner's first test (see [SETUP_GUIDE.md](SETUP_GUIDE.md) Part 2) |
| **Next stage** | Stage 3: Backend foundation and MongoDB connection |
| **What works today** | The backend starts and answers `GET /api/v1/health`; bad requests get clean JSON errors; bad settings stop the server with a clear message; 20 automated tests pass |
| **Everything else** | Planned only: database, accounts, items, claims, mobile app, dashboard |

## 2. Stages

| # | Stage | Status | Notes |
|---|---|---|---|
| 1 | Project blueprint and requirements | ✅ | Documents and diagrams complete and checked |
| 2 | Repository and environment setup | ⚠️ | Verified in the container. Owner's laptop run pending (see section 1) |
| 3 | Backend foundation and MongoDB connection | ⬜ | Decision D-018 (test database) to be settled here |
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
| API endpoints ([API_CONTRACT.md](API_CONTRACT.md)) | 37 | 0 complete, **1 partial**: `GET /health` (the `database` field arrives in Stage 3) | The partial one, in the container only |
| Database collections ([DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)) | 6 | 0 | 0 |
| Mobile screens ([ARCHITECTURE.md](ARCHITECTURE.md#5-mobile-app-structure)) | 16 | 0 | 0 |
| Dashboard pages ([ARCHITECTURE.md](ARCHITECTURE.md#6-admin-dashboard-structure)) | 10 | 0 | 0 |
| Security controls ([SECURITY_PLAN.md](SECURITY_PLAN.md)) | 27 | 0 complete, **4 partial** (below) | In the container only |
| Planned backend test cases ([TEST_PLAN.md](TEST_PLAN.md)) | 84 | 4 covered by automated tests (1 only partly) | Container only |
| Automated tests (Jest) | n/a | 20 | 20 pass (container) |

**Partially started security controls** (none is complete yet):
- **S-15 Security headers:** only the `X-Powered-By` header is removed. Helmet arrives in Stage 3.
- **S-17 Request size limits:** JSON bodies over 100 kB are refused. Upload and pagination limits come later.
- **S-19 Secrets management:** `.gitignore` and `.env.example` exist and were tested with fake secrets. The required-secret check and push-time secret scan come later.
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
| Dependency audit | `npm audit` | ⚠️ **Production dependencies: 0 vulnerabilities. Dev tooling: 18 moderate**, all in Jest's own test tooling (`minimatch`/`glob`), which never ships. npm's suggested fix downgrades Jest to an older version, so it was **not** applied. Revisit at Stage 16 |

**Not verified in Stage 2**
- Running on the owner's laptop, on Windows or macOS, or with Node 24. *(Owner's first test.)*
- Access from a phone over Wi-Fi. *(Stage 8. Only "accepts network connections" was checked.)*
- Anything involving MongoDB, Cloudinary or Expo (not used yet).
- Free-tier limits of external services (accounts not created yet).

## 5. Known issues and open decisions

| ID | Item | Decide / fix at |
|---|---|---|
| D-018 | How database-connected tests are run, given the container's network limits | Stage 3 |
| D-019 | Which Expo SDK version to use | Stage 7 |
| Audit | 18 moderate advisories in Jest's dev-only dependency chain | Stage 16 |

## 6. What exists in the repository

```text
CLAUDE.md                       Standing instructions for the AI assistant (carries between sessions)
README.md, .gitignore
backend/
  package.json, package-lock.json, .env.example, .gitignore, README.md
  src/config/env.js             Settings loader (fails fast)
  src/controllers/healthController.js
  src/routes/index.js, healthRoutes.js
  src/middleware/notFound.js, errorHandler.js
  src/app.js, server.js
  tests/health.test.js, config.test.js
  (empty placeholders: src/models, services, validators, utils, scripts)
documentation/                  All Stage 1 documents, updated for Stage 2
```

`mobile-app/` and `admin-dashboard/` do not exist yet. They are created by their own tools in Stages 7 and 12.
