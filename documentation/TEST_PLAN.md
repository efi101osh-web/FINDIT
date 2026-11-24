# FINDIT: Test Plan

> **Status:** The plan is written (93 backend cases). Automated tests began in Stage 2 and now number 210 Jest tests (150 run by default, 60 need a real database), covering 32 of the planned backend cases (one, T-ADM-01, only against a stand-in route until Stage 12). Everything not listed in the [results log](#8-results-log) is `Not run`. A test that could not be executed in the current environment is marked `Needs laptop`, never `Pass`.

## 1. Strategy

| Level | What | Tool | When |
|---|---|---|---|
| Backend automated | API behaviour, permissions, rules | Jest + Supertest | Each backend stage, re-run before every commit |
| Backend manual | Quick checks and demos | Postman collection | During development |
| Mobile manual | Screens, forms, navigation, real phone | Expo Go on an Android phone | After each mobile stage |
| Dashboard manual | Pages, tables, actions | Browser | After each dashboard stage |
| End-to-end | The full user journey across all three parts | Manual script (section 6) | Stage 17, and before the demo |
| Security | Abuse cases | Manual + automated | Stage 16 |

**Principles:** test the *rules* (permissions, privacy, state changes), not just the happy path · every bug found gets a regression test where practical · record real output, not impressions.

**Test data:** fake only. Seed accounts: one admin, one recovery officer, several users (credentials generated from `.env`, never committed).

**Database for tests:** a real MongoDB started on the machine running the tests, in memory, deleted afterwards (D-018 in [DECISIONS.md](DECISIONS.md)). `npm test` skips those tests (shown as "skipped", never "passed"); `npm run test:db` runs them. Atlas is checked separately with `npm run check:db` on the owner's laptop.

## 2. Backend test cases

Status for all: `Not run`.

### System and invalid requests
| ID | Case | Expected |
|---|---|---|
| T-HLT-01 | `GET /health` | 200, `database: "connected"` |
| T-INV-01 | Malformed ID in a URL | 400 `VALIDATION_ERROR` |
| T-INV-02 | Unknown route | 404 in the standard error shape |
| T-INV-03 | Invalid JSON body | 400 in the standard error shape |
| T-SEC-01 | Response headers | Security headers present (Helmet) |
| T-SEC-02 | CORS from a non-allowed origin | Browser request blocked |
| T-SEC-03 | Failed logins for one account beyond the limit (default 10 per 15 minutes) | 429 `RATE_LIMITED` with `Retry-After`. Correct logins never count. Other accounts on the same address are unaffected |
| T-SEC-04 | Any 500 error | No stack trace or internals in the response |

### Database connection
| ID | Case | Expected |
|---|---|---|
| T-DB-01 | Connect to a port where nothing listens | Fails within seconds with a plain-English explanation, no `[object Object]` |
| T-DB-02 | Connect to a working database | State is `connected`, using the requested database name |
| T-DB-03 | Disconnect while the server is running | Health says `disconnected` and the server stays up (still 200) |
| T-DB-04 | Wrong password against a real MongoDB with login | Real authentication error, explained in plain English, password never shown |

### Authentication and users
| ID | Case | Expected |
|---|---|---|
| T-AUTH-01 | Register with valid data | 201, token + user, role `user`, **no** `passwordHash` |
| T-AUTH-02 | Register with the same email in different letter case | 409 `CONFLICT` |
| T-AUTH-03 | Register with a weak or over-72-character password | 400 |
| T-AUTH-04 | Register with `"role":"admin"` in the body | 400 (field not accepted) |
| T-AUTH-05 | Login with correct credentials | 200 + token |
| T-AUTH-06 | Login with wrong password vs unknown email | Same 401 response for both |
| T-AUTH-07 | Login to a suspended account | 403 `ACCOUNT_SUSPENDED` |
| T-AUTH-08 | Protected route with no / malformed / expired token | 401 `UNAUTHENTICATED` |
| T-AUTH-09 | Suspended user with a previously valid token | 403 on the next request |
| T-AUTH-10 | The raw database document | Holds a bcrypt hash of the configured strength; never the password; a normal query never returns the hash |
| T-AUTH-11 | Forged tokens: wrong key, "none" algorithm, other algorithm, wrong issuer, bad or missing subject, cut-off signature, a role written into the token | All 401, or the role in the token is ignored |
| T-AUTH-12 | Five sign-ups for the same email at the same instant | Exactly one succeeds, four get 409; one account exists |
| T-AUTH-13 | First-administrator seeding | Creates an admin who can log in; safe to repeat; never resets a password; promotes a regular account only with `--promote` |
| T-AUTH-14 | Login with an unknown email | Still performs a full password check, so timing does not reveal which emails exist |
| T-USR-01 | Update full name, phone, contact preference | 200, changes saved |
| T-USR-02 | Try to change email / role / status via `PATCH /users/me` | 400 |
| T-USR-03 | Change password with correct current password | 200, new password works, old does not |
| T-USR-04 | Change password with wrong current password | 400 on `currentPassword` |
| T-USR-05 | An existing token after a password change | Still works until it expires (documented accepted limitation, [SECURITY_PLAN.md](SECURITY_PLAN.md) section 4) |

### Items, browsing and search
| ID | Case | Expected |
|---|---|---|
| T-ITM-01 | Create a LOST report | 201, status `OPEN`, owner view |
| T-ITM-02 | Create a FOUND report with private fields | 201, private fields saved |
| T-ITM-03 | Invalid category / colour / location | 400 |
| T-ITM-04 | Future event date | 400 |
| T-ITM-05 | FOUND-only field on a LOST report | 400 |
| T-ITM-06 | Another user fetches the item | Private fields and reporter **absent** |
| T-ITM-07 | Owner fetches own item | Private fields present |
| T-ITM-08 | Non-owner `PATCH /items/:id` | 403 |
| T-ITM-09 | Owner edits allowed fields | 200 |
| T-ITM-10 | Send `status`, `reporterId` or `reportType` in a PATCH | 400 |
| T-ITM-11 | Owner closes own report | 200, status `CLOSED` |
| T-ITM-12 | Another user fetches a `CLOSED` report | 404 |
| T-ITM-13 | Image URL from a foreign host | 400 |
| T-SRC-01 | `q=head` finds "headphones" | Partial word matches |
| T-SRC-02 | Combine type, category, location, date range | Only matching reports returned |
| T-SRC-03 | Pagination | `meta` correct; last page correct |
| T-SRC-04 | `limit=500` | 400 (or clamped to 50, as finally decided and documented) |
| T-SRC-05 | `q=(.*)+$` and other regex characters | Treated as plain text; no error, no slowdown |
| T-SRC-06 | `?category[$ne]=x` operator injection | 400, query not run |
| T-SRC-07 | Each sort option | Correct order |
| T-SRC-08 | Empty result | 200, empty array, `total: 0` |

### Matching
| ID | Case | Expected |
|---|---|---|
| T-MAT-01 | Lost + found, same category/colour/location/date | Score at or above notify threshold; reasons listed |
| T-MAT-02 | Different category | Not a candidate |
| T-MAT-03 | Same reporter's own lost and found | Not matched |
| T-MAT-04 | Reasons and score | Derived from public fields only (changing `privateDetails` does not change the score) |
| T-MAT-05 | Strong match | Notification created once (no duplicate on re-run) |
| T-MAT-06 | Non-owner calls `GET /items/:id/matches` | 403 |

### Claims
| ID | Case | Expected |
|---|---|---|
| T-CLM-01 | Valid claim | 201, claim `PENDING`, item `UNDER_VERIFICATION` |
| T-CLM-02 | Claim own found item | 403 |
| T-CLM-03 | Admin / officer submits a claim | 403 |
| T-CLM-04 | Second active claim on the same item by same user | 409 |
| T-CLM-05 | Item and list responses | `privateEvidence` **never** present |
| T-CLM-06 | Another user fetches my claim | 404 |
| T-CLM-07 | `respond` when not `NEEDS_MORE_INFORMATION` | 409 |
| T-CLM-08 | Withdraw, then item returns to `OPEN` if no other active claim | Correct statuses |
| T-CLM-09 | Approve one of two claims | Item `APPROVED_FOR_RETURN`; the other claim auto-`REJECTED` with notification |
| T-CLM-10 | Reject or request info without a note | 400 |
| T-CLM-11 | Illegal transition (e.g. approve a `PENDING` claim) | 409 `INVALID_STATE_TRANSITION` |
| T-CLM-12 | Regular user calls the review endpoint | 403 |

### Recovery
| ID | Case | Expected |
|---|---|---|
| T-REC-01 | Create a record for an approved claim | 201 |
| T-REC-02 | Create for a claim that is not approved | 409 |
| T-REC-03 | Second record for the same claim | 409 |
| T-REC-04 | Officer lists records | Only records assigned to them |
| T-REC-05 | Officer calls claim-evidence endpoints | 403 |
| T-REC-06 | Complete a record | Item `RETURNED`; linked lost report `RETURNED`; notifications sent |
| T-REC-07 | Cancel a record, then admin reopens the item | Statuses follow the flow |
| T-REC-08 | Officer edits a record that is not theirs | 403 |

### Notifications, uploads, administration
| ID | Case | Expected |
|---|---|---|
| T-NOT-01 | Each event type | One notification to the right recipient |
| T-NOT-02 | List notifications | Only my own |
| T-NOT-03 | Mark someone else's notification read | 404 |
| T-NOT-04 | Mark one / mark all / unread count | Correct |
| T-IMG-01 | Upload a valid JPEG | 201, `url` + `publicId` (**needs Cloudinary account**) |
| T-IMG-02 | File over 5 MB | 413 |
| T-IMG-03 | A non-image renamed to `.jpg` | 415 |
| T-IMG-04 | Upload without a token | 401 |
| T-ADM-01 | Every `/admin/*` route as a regular user | 403 |
| T-ADM-02 | Overview figures | Equal to counts taken directly from the database |
| T-ADM-03 | Admin changes own role or status | 403 |
| T-ADM-04 | Demote / suspend the last active admin | 403 |
| T-ADM-05 | Claim review, status override, role change | Audit record written |
| T-ADM-06 | Admin opens a claim's evidence | `EVIDENCE_VIEWED` audit record |
| T-ADM-07 | Analytics ranges | Figures match the data; invalid range → 400 |

## 3. Mobile test checklist (Expo Go, physical Android phone)

All `Not run`: Opens in Expo Go without errors · Welcome → Login → Register flow · form validation messages · wrong password message · token survives app restart · logout returns to Welcome · tabs and stack navigation, back button · Home shows recent reports · Lost / Found lists scroll and paginate · search and filters · empty state · loading state · offline / server-off error state with retry · item details hide private data · report lost and report found (with and without photo) · image picker permission denied path · large photo rejected with a clear message · submit claim · my reports · my claims and status badges · notifications list, unread badge, mark read · profile and edit profile · every button reachable at 44 pt · text readable at larger system font size.

## 4. Dashboard test checklist (browser)

All `Not run`: Login rejects a regular user · login with admin · logout · sidebar navigation · overview cards equal the database · reports table: search, filter, paginate, sort · open a report's detail · claims queue and review actions (start, request info, approve, reject with confirmation) · users: search, suspend and reactivate, role change, blocked self-change · recovery records: create, schedule, complete · analytics charts render with real data and with no data · audit records page · refresh keeps the session within the tab · API server stopped shows a readable error · page works at laptop and tablet widths.

## 5. Security tests (Stage 16)

Manually attempt each: user calls an admin route · read another user's claim by ID · edit another user's report · register with a `role` · use an expired token · use a suspended user's token · 12 rapid logins · 6 MB upload · fake-extension upload · `$` operators in query strings · very long strings · script tags in text fields (must display as plain text everywhere) · confirm no secret appears in the repository (`git log -p` scan) · `npm audit` reviewed.

## 6. End-to-end script (the demo scenario)

Diagram: [diagrams/end-to-end-flow.md](diagrams/end-to-end-flow.md). Run it on a **fresh database with seed data**.

1. Register user **Owner**; log in on the phone.
2. Owner reports a **lost** item (with photo). *Expect:* appears under My reports, status `OPEN`.
3. Register user **Finder** on another device or session; report a **found** item matching it. *Expect:* status `OPEN`.
4. *Expect:* Owner receives a **potential match** notification; the match screen lists the found item with a score and reasons and the "not proof" notice; both reports show `POTENTIAL_MATCH`.
5. Check privacy: as Owner, open the found item. *Expect:* no private details, no reporter identity.
6. Owner submits a **claim** with private evidence. *Expect:* claim `PENDING`; found item `UNDER_VERIFICATION`; admin and finder notified.
7. Admin (dashboard) opens the claim, starts review, **requests more information**. *Expect:* Owner notified; claim `NEEDS_MORE_INFORMATION`.
8. Owner responds. *Expect:* claim `UNDER_REVIEW`.
9. Admin **approves**. *Expect:* claim `APPROVED`; item `APPROVED_FOR_RETURN`; Owner notified; audit records exist for the review and for viewing the evidence.
10. Admin **creates a recovery record**, assigns the officer and an office.
11. Officer logs in and sees **only** that record; marks it **completed**. *Expect:* found item and lost report `RETURNED`; Owner and Finder notified.
12. Dashboard overview and analytics reflect the returned item. *Final status:* all records consistent.

## 7. Defect log

| ID | Date | Found in | Description | Status |
|---|---|---|---|---|
| *(none yet)* | | | | |

## 8. Results log

Real results only, with the date and where they were run.

| Date | Where | Test IDs | Result | Notes |
|---|---|---|---|---|
| 2026-11-22 | Cloud container (Linux, Node 22.23.5) | T-HLT-01 (partial), T-INV-02, T-INV-03, T-SEC-04, plus foundation tests (framework header hidden, 413 on oversized body, 404 does not echo the URL, settings loader) | ✅ 20 of 20 Jest tests pass | T-HLT-01 checks the health response but not `database: "connected"` (arrives in Stage 3). Tests were shown to fail when the code was deliberately broken |
| 2026-11-22 | Cloud container, real server + `curl` | Manual check of health, 404, bad JSON, shutdown, bad settings, port clash | ✅ As expected | See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) section 4 |
| 2026-11-22 | Fresh clone from GitHub (Linux container) | Same 20 tests, plus manual server check | ✅ 20 of 20 pass after a clean `npm install` | Confirms the pushed repository is complete and self-contained |
| 2026-11-22 | **Owner's laptop** (Windows, PowerShell, Node 24.20.0) | The same 20 Jest tests; manual check of the health and 404 pages in a browser | ✅ 20 of 20 pass (7.5 s); both pages as expected | Reported by the owner. First run on Node 24 |
| 2026-11-22 | Cloud container, real MongoDB 8.0.17 | Stage 3: T-HLT-01 (full), T-SEC-01, T-SEC-02, T-DB-01 to T-DB-04, T-INV-02, T-INV-03, T-SEC-04, plus settings, secret-hygiene and error-explanation tests | ✅ `npm run test:db`: 71 of 71 pass. Plain `npm test`: 64 pass, 7 skipped (database tests) | Shown to fail when code was deliberately broken (3 break-ins, all caught). Also checked end to end with the real server and `check:db` |
| 2026-11-23 | **Owner's laptop** (Windows, PowerShell, Node 24.20.0) + MongoDB Atlas (8.0.39) | Plain `npm test` after Stage 3; `npm run check:db`; `npm run dev` with the health page | ✅ `npm test`: 64 passed, 7 skipped, 0 failed. `check:db`: connected to Atlas. Health: `database: connected` | Reported by the owner. First verification against Atlas |
| 2026-11-23 | **Owner's laptop** (Windows, Node 24.20.0), final Stage 3 commit `974844e` | Plain `npm test` (includes the doubled-label tests) | ✅ 66 passed, 7 skipped, 0 failed | Reported by the owner |
| 2026-11-23 | Cloud container, real MongoDB 8.0.17 | Settings tests extended (doubled-label slip) | ✅ `test:db`: 73 of 73 pass. Plain `npm test`: 66 passed, 7 skipped | |
| 2026-11-23 | Cloud container, real MongoDB 8.0.17 | Stage 4: T-AUTH-01 to T-AUTH-14, T-USR-01 to T-USR-05, T-SRC-06, T-SEC-03, T-ADM-01 (stand-in route), plus settings, validation, rate-limit and seeding tests | ✅ `test:db`: **200 of 200 pass**. Plain `npm test`: 140 passed, 60 skipped | **25 deliberate security bugs were each caught by the tests** (e.g. every sign-up becomes an admin, suspended check removed, algorithm not pinned, password stored in plain text). One gap found and closed (the settings-to-limiter link) |
| 2026-11-23 | Cloud container, live server + real MongoDB, `curl` and Newman | Full journey: seed admin, sign-up, login, profile, password change, forged token, password guessing, lock-out | ✅ All as expected. Postman collection: 10 requests, 17 assertions, 0 failed. No passwords or secrets in the server log | See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) section 4 |
| 2026-11-23 and 2026-11-24 | **Owner's laptop** (Windows, Node 24.20.0) + MongoDB Atlas | Setup guide Parts 4 and 5: `npm test` (140 passed, 60 skipped, 0 failed on that commit); `npm run seed:admin`; the Postman collection: health, register, login, who am I, update profile, change password, the four refusals (T-AUTH-04, wrong password, no token, T-USR-02) and the administrator login | ✅ All as expected (owner-reported). The first administrator exists in Atlas. A first Register attempt failed once with `ECONNRESET` and succeeded on retry | The laptop could not reach Atlas on an MTN MiFi (see [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) section 5), and worked on a phone hotspot |
