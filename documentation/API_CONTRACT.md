# FINDIT: API Contract

> **Status: 13 of the 37 endpoints are implemented and tested: `GET /health`, `GET /meta/options`, `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`, `POST /items`, `GET /items/mine`, `GET /items/:id`, `PATCH /items/:id` and `PATCH /items/:id/close`. Everything else below is design, not implemented.** (The Stage 5 item endpoints passed their tests in the cloud container and were then tried on the owner's laptop against Atlas through Postman, as reported by the owner.) Each endpoint is marked implemented only in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) after it has been run and tested. If the implementation has to differ, this file is updated in the same change.

The mobile app and the admin dashboard use **the same API** with the same rules.

---

## 1. Conventions

**Base URL (development):** `http://<laptop-ip>:4000/api/v1`. For the examples below:

```bash
export API=http://localhost:4000/api/v1
export TOKEN=<paste the token from POST /auth/login>
```

**Authentication.** Send the token with every request except the public ones:

```text
Authorization: Bearer <token>
```

**Formats.** Requests and responses are JSON (`Content-Type: application/json`), except image upload (multipart). Dates are ISO 8601 UTC strings. IDs are strings. Every record has an `id` (the database `_id`, renamed).

**Unknown fields are rejected.** Every request body is validated against a strict schema. A request containing a field the endpoint does not accept (for example `role` on registration) is refused with `VALIDATION_ERROR`. This is what stops clients setting fields they should not control.

### 1.1 Success response

```json
{
  "success": true,
  "data": {}
}
```

Lists add a `meta` object:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
}
```

### 1.2 Error response (always this shape)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "details": [
      { "field": "email", "message": "Enter a valid email address." }
    ]
  }
}
```

`details` appears only for validation errors. Messages are safe to show to users. Stack traces and internal details are never returned.

### 1.3 Error codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad, missing or unexpected input; malformed ID |
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login (one generic message for both) |
| 403 | `ACCOUNT_SUSPENDED` | The account is suspended |
| 403 | `FORBIDDEN` | Logged in but not allowed (wrong role, not the owner, conflict-of-interest rule) |
| 404 | `NOT_FOUND` | No such record, **or** it exists but you may not know that (e.g. someone else's claim) |
| 409 | `CONFLICT` | Duplicate or incompatible with current data (email taken, active claim exists) |
| 409 | `INVALID_STATE_TRANSITION` | The status change is not allowed from the current status |
| 413 | `PAYLOAD_TOO_LARGE` | Image larger than 5 MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | File is not a real JPEG, PNG or WebP |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

**Errors that can occur on every authenticated endpoint** (not repeated below): `401 UNAUTHENTICATED`, `403 ACCOUNT_SUSPENDED`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`.

### 1.4 Pagination, sorting

Every list endpoint accepts `page` (default 1) and `limit` (default 20, **maximum 50**) and returns `meta` as shown above.

### 1.5 Allowed values

All enumerations (categories, colours, locations, statuses, …) are defined in [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#3-shared-value-lists-enumerations) and served live by `GET /meta/options`. The list of campus places lives in one file, `backend/src/config/campusLocations.js` (see section 4.2).

### 1.6 Initial rate limits (tunable)

| Scope | Limit |
|---|---|
| All endpoints, per IP address | 600 requests / 15 minutes *(implemented)* |
| `POST /auth/login`, per IP address **and** email | 10 **failed** attempts / 15 minutes *(implemented)*. Correct logins are never counted. While locked out, even the correct password is refused, so guessing cannot continue |
| `POST /auth/register`, per IP address | 20 requests / hour *(implemented)* |
| `POST /uploads/images`, per user | 20 / hour *(later, Stage 9)* |
| `POST /claims`, per user | 10 / day *(later, Stage 11)* |

When a limit is exceeded the reply is `429 RATE_LIMITED` with a `Retry-After` header (seconds to wait). Replies also carry `RateLimit` headers that say how much budget is left. The numbers can be changed in `backend/.env` (`RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_LOGIN_FAILURES`, `RATE_LIMIT_REGISTER_MAX`).

### 1.7 How login tokens work (as implemented)

- A token is a signed JWT (algorithm **HS256**, issuer `findit-api`). It contains **only** the user's id, when it was issued and when it expires. It does **not** contain the role or the account status.
- On **every** request the backend reloads the user from the database. So a suspension or role change applies at once, even though the person still holds an unexpired token.
- The default lifetime is 7 days (`JWT_EXPIRES_IN`; at most 30 days, because a token cannot be revoked early).
- Logout means the app deletes its copy of the token. There is no server-side logout, so a stolen unexpired token would still work (accepted limitation, [SECURITY_PLAN.md](SECURITY_PLAN.md) section 4).
- Any change to a token, a token signed with another key or algorithm (including `none`), or a token for a deleted account is refused with `401 UNAUTHENTICATED`.

---

## 2. Data shapes

These are the objects returned inside `data`. **Fields marked 🔒 are private**: they are only present when the viewer is allowed to see them (see the permission notes), and are *absent* otherwise.

### 2.1 `User`

```json
{
  "id": "665f1c2e9b1d4a0012ab34cd",
  "fullName": "Amina Yusuf",
  "email": "amina@example.com",
  "role": "user",
  "phoneNumber": "+2348012345678",
  "profileImage": null,
  "contactPreference": "IN_APP",
  "accountStatus": "ACTIVE",
  "createdAt": "2026-11-14T09:30:00.000Z"
}
```

`passwordHash` is never returned by any endpoint.

### 2.2 `ItemCard` (list views, safe for every logged-in user)

```json
{
  "id": "665f2a7e9b1d4a0012ab3501",
  "reportType": "LOST",
  "title": "Black wireless headphones",
  "category": "ELECTRONICS",
  "colour": "BLACK",
  "generalLocation": "LIBRARY",
  "locationDetail": "Main library, second floor",
  "dateOccurred": "2026-11-14T00:00:00.000Z",
  "status": "OPEN",
  "image": null,
  "isMine": false,
  "createdAt": "2026-11-14T10:05:00.000Z"
}
```

`generalLocation` is a **zone code** from `GET /meta/options` (`campusLocations`), and `locationDetail` is the extra detail for that zone (which hall, which library, which class), or `null`. It is only a hint about where the item was last seen or found, because items get moved. `image` is the first photo's URL, or `null`; **photos arrive in Stage 9, so it is always `null` for now**. `isMine` tells the app whether to show edit buttons. The reporter's identity is **never** included.

### 2.3 `ItemDetail`

Everything in `ItemCard`, plus:

| Field | Notes |
|---|---|
| `description`, `brand`, `approximateTime`, `updatedAt` | Public. `brand` is `null` when not given |
| `images` | `[{ "url", "publicId" }]`. **Always `[]` until Stage 9** |
| `handedToOffice` | FOUND reports only (absent on LOST reports) |
| `privateDetails` 🔒 | Reporter and administrators only. `null` when none |
| `privateStorageLocation` 🔒 | FOUND only. Reporter and administrators only |
| `reporter` 🔒 | `{ id, fullName, email, phoneNumber, contactPreference }`. **Administrators only** (not even the reporter's own view repeats it) |
| `closedAt`, `closeReason` 🔒 | Reporter and administrators. `null` until the report is closed |

### 2.4 `MatchResult`

```json
{
  "item": { "id": "665f2a7e9b1d4a0012ab3502", "reportType": "FOUND", "title": "Headphones in black case", "category": "ELECTRONICS", "colour": "BLACK", "generalLocation": "Main Library", "dateOccurred": "2026-11-14T00:00:00.000Z", "status": "OPEN", "image": null, "isMine": false, "createdAt": "2026-11-14T15:20:00.000Z" },
  "score": 78,
  "band": "STRONG",
  "reasons": ["Same category", "Same colour", "Same general location", "Reported 0 days apart", "Similar item name"],
  "disclaimer": "A match score is a hint, not proof of ownership."
}
```

`band` is `POSSIBLE` (40–54), `LIKELY` (55–74) or `STRONG` (75+). Reasons only ever come from **public** fields.

### 2.5 `ClaimSummary` and `Claim`

`ClaimSummary` (lists): `id`, `status`, `foundItem` (`ItemCard`), `relatedLostItem` (`ItemCard` or `null`), `reviewNote`, `reviewedAt`, `createdAt`, `updatedAt`.

`Claim` (single claim, claimant view): everything in `ClaimSummary` plus `explanation`, `privateEvidence` 🔒, `additionalInfo` 🔒 (`[{ message, createdAt }]`).

### 2.6 `Notification`

```json
{
  "id": "665f3b0e9b1d4a0012ab3601",
  "type": "POTENTIAL_MATCH",
  "title": "Possible match for your lost item",
  "message": "A found report may match \"Black wireless headphones\".",
  "relatedItemId": "665f2a7e9b1d4a0012ab3501",
  "matchedItemId": "665f2a7e9b1d4a0012ab3502",
  "relatedClaimId": null,
  "isRead": false,
  "createdAt": "2026-11-14T15:21:00.000Z"
}
```

### 2.7 `RecoveryRecord` (staff views only)

```json
{
  "id": "665f4c1e9b1d4a0012ab3701",
  "item": { "id": "665f2a7e9b1d4a0012ab3502", "title": "Headphones in black case", "status": "APPROVED_FOR_RETURN", "privateStorageLocation": "Security Office, shelf B" },
  "claim": { "id": "665f3d1e9b1d4a0012ab3650", "status": "APPROVED" },
  "claimant": { "id": "665f1c2e9b1d4a0012ab34cd", "fullName": "Amina Yusuf" },
  "createdBy": { "id": "665f0a0e9b1d4a0012ab3400", "fullName": "Campus Admin" },
  "assignedTo": { "id": "665f0b0e9b1d4a0012ab3410", "fullName": "Officer Musa", "role": "recovery_officer" },
  "collectionStatus": "SCHEDULED",
  "collectionLocation": "Security Office",
  "collectionDate": "2026-11-18T10:00:00.000Z",
  "completedAt": null,
  "internalNotes": "Claimant to bring student ID.",
  "createdAt": "2026-11-16T08:00:00.000Z"
}
```

`internalNotes` and `item.privateStorageLocation` are staff-only. Claimants never receive a `RecoveryRecord`; they only receive notifications.

### 2.8 `AuditRecord`

```json
{
  "id": "665f5d1e9b1d4a0012ab3801",
  "actor": { "id": "665f0a0e9b1d4a0012ab3400", "fullName": "Campus Admin", "role": "admin" },
  "action": "CLAIM_REVIEWED",
  "targetType": "CLAIM",
  "targetId": "665f3d1e9b1d4a0012ab3650",
  "metadata": { "from": "UNDER_REVIEW", "to": "APPROVED" },
  "createdAt": "2026-11-16T07:55:00.000Z"
}
```

---

## 3. Endpoint index

| # | Method | Path | Auth / role |
|---|---|---|---|
| 1 | GET | `/health` | Public |
| 2 | GET | `/meta/options` | Public |
| 3 | POST | `/auth/register` | Public |
| 4 | POST | `/auth/login` | Public |
| 5 | GET | `/auth/me` | Any logged-in user |
| 6 | GET | `/users/me` | Any logged-in user |
| 7 | PATCH | `/users/me` | Any logged-in user |
| 8 | PATCH | `/users/me/password` | Any logged-in user |
| 9 | POST | `/uploads/images` | Any logged-in user |
| 10 | POST | `/items` | Any logged-in user |
| 11 | GET | `/items` | Any logged-in user |
| 12 | GET | `/items/mine` | Any logged-in user |
| 13 | GET | `/items/:id` | Any logged-in user |
| 14 | PATCH | `/items/:id` | Owner (administrator editing arrives in Stage 12, with the audit log) |
| 15 | PATCH | `/items/:id/close` | Owner (administrator closing arrives in Stage 12, with the audit log) |
| 16 | GET | `/items/:id/matches` | Owner or admin |
| 17 | POST | `/claims` | Role `user` |
| 18 | GET | `/claims/mine` | Role `user` |
| 19 | GET | `/claims/:id` | Claimant |
| 20 | POST | `/claims/:id/respond` | Claimant |
| 21 | PATCH | `/claims/:id/withdraw` | Claimant |
| 22 | GET | `/notifications` | Any logged-in user (own) |
| 23 | PATCH | `/notifications/read-all` | Any logged-in user (own) |
| 24 | PATCH | `/notifications/:id/read` | Any logged-in user (own) |
| 25 | GET | `/admin/overview` | `admin` |
| 26 | GET | `/admin/items` | `admin` |
| 27 | PATCH | `/admin/items/:id/status` | `admin` |
| 28 | GET | `/admin/claims` | `admin` |
| 29 | GET | `/admin/claims/:id` | `admin` |
| 30 | PATCH | `/admin/claims/:id/review` | `admin` |
| 31 | GET | `/admin/users` | `admin` |
| 32 | PATCH | `/admin/users/:id` | `admin` |
| 33 | GET | `/admin/recovery-records` | `admin`, or `recovery_officer` (assigned only) |
| 34 | POST | `/admin/recovery-records` | `admin` |
| 35 | PATCH | `/admin/recovery-records/:id` | `admin`, or `recovery_officer` (assigned only) |
| 36 | GET | `/admin/analytics` | `admin` |
| 37 | GET | `/admin/audit-records` | `admin` |

*Route-order rule:* `/items/mine` is registered **before** `/items/:id`, otherwise "mine" would be read as an ID.

---

## 4. System

### 4.1 `GET /health`

- **Purpose:** Check the server (and database) is alive. Used first when debugging phone-to-laptop connections.
- **Auth:** none. **Role:** none.
- **Response `200`:**

```json
{
  "success": true,
  "data": { "status": "ok", "database": "connected", "uptimeSeconds": 42, "time": "2026-11-14T09:00:00.000Z" }
}
```

- **Errors:** none expected. If the database is down, `database` is `"disconnected"`.
- **Example:** `curl "$API/health"`

### 4.2 `GET /meta/options`

- **Purpose:** Give the apps the allowed values for dropdowns, so they never hard-code lists.
- **Auth:** none (contains no private data). **Role:** none.
- **Response `200` (as implemented):** `data` has the keys `reportTypes`, `categories`, `colours`, `timeBands`, `contactPreferences`, `itemStatuses` (each an array of strings) and `campusLocations`. The claim-related lists (`claimStatuses`, `collectionStatuses`, `collectionLocations`) will be added in the stages that build claims and recovery.
- **`campusLocations`** is an array of **zones**. A person picks a zone first, then (depending on the zone) gives a little more detail:

```json
{ "code": "MALE_HALLS", "label": "Male halls of residence",
  "detail": { "mode": "LIST", "hint": "Which hall?", "options": ["Bethel Splendor", "Winslow", "...", "Not sure which"] } }
```

| `detail.mode` | The app shows | Rule on `locationDetail` |
|---|---|---|
| `LIST` | A pick-list (`options`). Used for halls, churches and auditoriums | **Required**, and must be one of `options` |
| `REQUIRED_TEXT` | A short text box (`hint` says what to type). Used for the library and classrooms | **Required**, 3 to 80 characters |
| `OPTIONAL_TEXT` | An optional short text box | Optional; if given, 3 to 80 characters |

Every `LIST` ends with `"Not sure which"`, and there is a `NOT_SURE` zone, because items get moved and people are often unsure. The zones and their names live in one file, `backend/src/config/campusLocations.js`; editing it is the only change needed to add or rename a place.
- **Example:** `curl "$API/meta/options"`

---

## 5. Authentication

### 5.1 `POST /auth/register`

- **Purpose:** Create a regular-user account and log in.
- **Auth:** none. **Role:** none. The created role is always `user`.
- **Request body:**

```json
{
  "fullName": "Amina Yusuf",
  "email": "amina@example.com",
  "password": "Sunrise2026",
  "phoneNumber": "+2348012345678",
  "contactPreference": "IN_APP"
}
```

`phoneNumber` and `contactPreference` are optional. `role` or any other field → `VALIDATION_ERROR`.

- **Response `201`:** `data` = `{ "user": <User>, "token": "<jwt>", "expiresIn": "7d" }`
- **Errors:** `400 VALIDATION_ERROR` (weak password, bad email, unexpected field; email domain not allowed, if restricted) · `409 CONFLICT` (email already registered) · `429 RATE_LIMITED`
- **Example:**

```bash
curl -X POST "$API/auth/register" -H "Content-Type: application/json" \
  -d '{"fullName":"Amina Yusuf","email":"amina@example.com","password":"Sunrise2026"}'
```

### 5.2 `POST /auth/login`

- **Purpose:** Exchange email and password for a token.
- **Auth:** none.
- **Request body:** `{ "email": "amina@example.com", "password": "Sunrise2026" }`
- **Response `200`:** `data` = `{ "user": <User>, "token": "<jwt>", "expiresIn": "7d" }`
- **Errors:** `400 VALIDATION_ERROR` · `401 INVALID_CREDENTIALS` (same message, and about the same response time, whether the email or the password is wrong) · `403 ACCOUNT_SUSPENDED` (revealed **only after the correct password** was given) · `429 RATE_LIMITED` (too many failed attempts for this email from this address)
- **Example:**

```bash
curl -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"amina@example.com","password":"Sunrise2026"}'
```

### 5.3 `GET /auth/me`

- **Purpose:** Check a stored token is still valid and get the current user (the apps call this on start-up).
- **Auth:** required. **Role:** any.
- **Response `200`:** `data` = `{ "user": <User> }`
- **Errors:** `401 UNAUTHENTICATED`
- **Example:** `curl "$API/auth/me" -H "Authorization: Bearer $TOKEN"`

---

## 6. Users

### 6.1 `GET /users/me`

- **Purpose:** Read my profile.
- **Auth:** required. **Role:** any.
- **Response `200`:** `data` = `{ "user": <User> }`
- **Example:** `curl "$API/users/me" -H "Authorization: Bearer $TOKEN"`

### 6.2 `PATCH /users/me`

- **Purpose:** Update the permitted profile fields.
- **Auth:** required. **Role:** any.
- **Request body** (send only what changes):

```json
{
  "fullName": "Amina B. Yusuf",
  "phoneNumber": "+2348099999999",
  "contactPreference": "EMAIL"
}
```

`phoneNumber` may be `null` to clear it. At least one field is required. `email`, `role`, `accountStatus`, `passwordHash` (and any other field) → `VALIDATION_ERROR` ("This field is not accepted."), and **nothing** is changed, even if the same request also contained valid fields. **`profileImage` is not accepted yet**: it arrives with image upload in Stage 9.

- **Response `200`:** `data` = `{ "user": <User> }`
- **Errors:** `400 VALIDATION_ERROR`
- **Example:**

```bash
curl -X PATCH "$API/users/me" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"contactPreference":"EMAIL"}'
```

### 6.3 `PATCH /users/me/password`

- **Purpose:** Change my password.
- **Auth:** required. **Role:** any.
- **Request body:** `{ "currentPassword": "Sunrise2026", "newPassword": "Moonrise2027" }`
- **Response `200`:** `data` = `{ "message": "Password updated." }`
- **Errors:** `400 VALIDATION_ERROR` (new password too weak **or the same as the current one**, **or** current password wrong. The wrong-current-password case is reported as a validation error on `currentPassword` so the app does not mistake it for an expired session)
- **Example:**

```bash
curl -X PATCH "$API/users/me/password" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"currentPassword":"Sunrise2026","newPassword":"Moonrise2027"}'
```

---

## 7. Image upload

### 7.1 `POST /uploads/images`

- **Purpose:** Upload one photo. The backend checks it and stores it in Cloudinary. The app then attaches the returned `url` and `publicId` to an item or profile. (Cloudinary secrets never reach the app.)
- **Auth:** required. **Role:** any.
- **Request:** `multipart/form-data` with fields `image` (the file) and `purpose` (`ITEM` or `PROFILE`).
- **Checks:** at most 5 MB; must really be JPEG, PNG or WebP (verified from the file's first bytes, not its name or claimed type).
- **Response `201`:** `data` = `{ "url": "https://res.cloudinary.com/...", "publicId": "findit/items/abc123", "width": 1200, "height": 900 }`
- **Errors:** `400 VALIDATION_ERROR` (no file, bad `purpose`) · `413 PAYLOAD_TOO_LARGE` · `415 UNSUPPORTED_MEDIA_TYPE` · `429 RATE_LIMITED`
- **Example:**

```bash
curl -X POST "$API/uploads/images" -H "Authorization: Bearer $TOKEN" \
  -F "purpose=ITEM" -F "image=@./photo.jpg"
```

---

## 8. Items

### 8.1 `POST /items`

- **Purpose:** Create a lost or found report. Status always starts as `OPEN`, and the report is stored under the person who sent it. (Looking for matches arrives in Stage 10.)
- **Auth:** required. **Role:** any (users, recovery officers and administrators can all report items).
- **Request body:**

```json
{
  "reportType": "FOUND",
  "title": "Headphones in black case",
  "category": "ELECTRONICS",
  "description": "Over-ear wireless headphones in a hard black case, found on a desk.",
  "colour": "BLACK",
  "brand": "Sony",
  "generalLocation": "MALE_HALLS",
  "locationDetail": "Winslow",
  "dateOccurred": "2026-11-14",
  "approximateTime": "AFTERNOON",
  "privateDetails": "Small scratch on left earcup; blue sticker inside case.",
  "handedToOffice": true,
  "privateStorageLocation": "Security Office, shelf B"
}
```

Required: `reportType`, `title` (3 to 80 characters), `category`, `description` (10 to 1000), `colour`, `generalLocation`, `dateOccurred`. Optional: `brand`, `locationDetail` (required or not depending on the zone: see section 4.2), `approximateTime` (default `UNKNOWN`), `privateDetails`. `handedToOffice` and `privateStorageLocation` are allowed **only** for FOUND reports.

Rules, all enforced by the backend:
- **Date:** `dateOccurred` is `YYYY-MM-DD`, must be a real calendar date, **not more than one day in the future** (one day of slack because a phone in Nigeria can already be on tomorrow's date while the server clock is still on today's) and **not more than 365 days ago**.
- **Place:** `generalLocation` must be a zone code, and `locationDetail` must satisfy that zone's rule (a hall must come from the zone's list; the library needs a short description).
- **Unknown fields are refused**, not ignored. A request containing `status`, `reporterId`, `images`, `isMine`, `closedAt` and so on is a `400`, so a client cannot choose them.
- **Photos are not accepted yet** (Stage 9); `images` is refused for now.

- **Response `201`:** `data` = `{ "item": <ItemDetail> }` (owner view, so private fields are included)
- **Errors:** `400 VALIDATION_ERROR` (missing field, value not in list, wrong place detail, future or too-old date, FOUND-only field on a LOST report, unknown field) · `401 UNAUTHENTICATED`
- **Example:**

```bash
curl -X POST "$API/items" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"reportType":"LOST","title":"Blue backpack","category":"BAGS","description":"Navy backpack with two front pockets.","colour":"BLUE","generalLocation":"CLASSROOM","locationDetail":"BBS Class 102","dateOccurred":"2026-11-13"}'
```

### 8.2 `GET /items`

- **Purpose:** Browse and search reports (the public view: no private fields).
- **Auth:** required. **Role:** any.
- **Query parameters** (all optional):

| Parameter | Meaning |
|---|---|
| `q` | Keyword, 2–60 characters. Matches title, description, brand, location (partial words) |
| `reportType` | `LOST` or `FOUND` |
| `category`, `colour`, `location` | Exact values from the lists (`location` filters `generalLocation`) |
| `status` | One status. Default: active reports (`OPEN`, `POTENTIAL_MATCH`, `UNDER_VERIFICATION`, `APPROVED_FOR_RETURN`). `RETURNED` may be requested. `CLOSED` is never public |
| `dateFrom`, `dateTo` | `YYYY-MM-DD`; filters `dateOccurred` |
| `sort` | `newest` (default), `oldest`, `eventNewest`, `eventOldest` |
| `page`, `limit` | Pagination |

- **Response `200`:** `data` = array of `ItemCard`, plus `meta`.
- **Errors:** `400 VALIDATION_ERROR` (unknown parameter or value not allowed)
- **Example:** `curl "$API/items?reportType=FOUND&category=ELECTRONICS&q=head&page=1" -H "Authorization: Bearer $TOKEN"`

### 8.3 `GET /items/mine`

- **Purpose:** "My reports": everything I reported, including closed reports.
- **Auth:** required. **Role:** any.
- **Query:** `reportType`, `status`, `page` (default 1), `limit` (default 20, maximum 50). Any other parameter, a value not on the lists, a repeated parameter, or an object-style value such as `status[$ne]=OPEN` is a `400`.
- **Response `200`:** array of `ItemCard` (all with `isMine: true`), newest first, plus `meta`. Only **your own** reports are listed, including `CLOSED` ones. Cards never contain private fields. A person with no reports gets an empty list, not an error.
- **Errors:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED`
- **Example:** `curl "$API/items/mine?reportType=LOST" -H "Authorization: Bearer $TOKEN"`

### 8.4 `GET /items/:id`

- **Purpose:** One report in full.
- **Auth:** required. **Role:** any. **What you see depends on who you are:** everyone gets the public fields; the reporter and administrators also get the 🔒 private fields; only administrators also get `reporter`.
- **Response `200`:** `data` = `{ "item": <ItemDetail> }`
- **Errors:** `400 VALIDATION_ERROR` (not a valid ID) · `401 UNAUTHENTICATED` · `404 NOT_FOUND` (no such report, or it is `CLOSED` and you are neither the reporter nor an administrator)
- **Note:** a recovery officer sees the same public view as any other user. The private fields are not even loaded from the database for viewers who may not see them.
- **Example:** `curl "$API/items/665f2a7e9b1d4a0012ab3501" -H "Authorization: Bearer $TOKEN"`

### 8.5 `PATCH /items/:id`

- **Purpose:** Edit a report.
- **Auth:** required. **Role:** the reporter only. *(Administrator editing is designed but deliberately left to Stage 12, because every administrator action must be written to the audit log, which does not exist yet. For now an administrator gets `403`, like any other non-owner.)*
- **Editable fields** (send only what changes; at least one is required): `title`, `category`, `description`, `colour`, `brand`, `generalLocation`, `locationDetail`, `dateOccurred`, `approximateTime`, `privateDetails`, and (FOUND only) `handedToOffice`, `privateStorageLocation`. **Not editable, and refused with `400` if sent:** `reportType`, `reporterId`, `status`, `images` and anything else not listed.
- **Clearing a field:** send `null` for `brand`, `privateDetails`, `locationDetail` or `privateStorageLocation`. Required fields cannot be cleared.
- **Changing the place** is checked as a whole. If you change `generalLocation`, the old `locationDetail` is **not** carried over (a hall name means nothing in a different zone), so send a new detail where the new zone needs one. Changing only `locationDetail` is checked against the current zone's rule, and a detail that the zone requires cannot be cleared.
- **Status rule:** the reporter may edit only while the status is `OPEN` or `POTENTIAL_MATCH`. In any other status the reply is `409`.
- **Response `200`:** `data` = `{ "item": <ItemDetail> }` (owner view)
- **Errors:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` (not the reporter) · `404 NOT_FOUND` (unknown id, or someone else's `CLOSED` report, which is invisible to you) · `409 CONFLICT` (report can no longer be edited)
- **Example:**

```bash
curl -X PATCH "$API/items/665f2a7e9b1d4a0012ab3501" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"description":"Black over-ear headphones, left cup has a small scratch."}'
```

### 8.6 `PATCH /items/:id/close`

- **Purpose:** Close my report (for example "I found it myself").
- **Auth:** required. **Role:** the reporter only. *(Administrator closing arrives in Stage 12 with the audit log. Until then an administrator gets `403`.)*
- **Request body:** `{ "reason": "Found it in my bag." }` (`reason` optional, 1 to 200 characters; any other field is a `400`)
- **Rules:** decided by the status rules in `backend/src/services/statusRules.js` (the single place that says which status changes are allowed). The reporter can close only `OPEN` or `POTENTIAL_MATCH` reports. A report that is `UNDER_VERIFICATION`, `APPROVED_FOR_RETURN` or `RETURNED` cannot be closed by its reporter, and an already `CLOSED` report cannot be closed again. (Administrator closing of reports under verification arrives with Stage 12.)
- **Response `200`:** `data` = `{ "item": <ItemDetail> }` with `status: "CLOSED"`, `closedAt` and `closeReason`. The closed report stays in the reporter's `/items/mine` list but disappears for everyone else.
- **Errors:** `400 VALIDATION_ERROR` · `401 UNAUTHENTICATED` · `403 FORBIDDEN` · `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION`
- **Example:**

```bash
curl -X PATCH "$API/items/665f2a7e9b1d4a0012ab3501/close" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"reason":"Found it in my bag."}'
```

### 8.7 `GET /items/:id/matches`

- **Purpose:** Show likely matches for **my** report, best first.
- **Auth:** required. **Role:** the reporter, or an administrator. (Other users cannot probe matches for reports that are not theirs.)
- **Query:** `limit` (default 5, max 10).
- **Response `200`:** `data` = array of `MatchResult`.
- **Errors:** `403 FORBIDDEN` · `404 NOT_FOUND`
- **Example:** `curl "$API/items/665f2a7e9b1d4a0012ab3501/matches" -H "Authorization: Bearer $TOKEN"`

---

## 9. Claims

### 9.1 `POST /claims`

- **Purpose:** Claim a found item as mine, with private evidence.
- **Auth:** required. **Role:** `user` only (staff accounts cannot claim, to avoid a conflict of interest).
- **Request body:**

```json
{
  "foundItemId": "665f2a7e9b1d4a0012ab3502",
  "relatedLostItemId": "665f2a7e9b1d4a0012ab3501",
  "explanation": "I left them on the desk at the library on Friday afternoon.",
  "privateEvidence": "Left earcup has a scratch near the hinge. Case has a blue sticker inside the lid."
}
```

`relatedLostItemId` is optional and must be my own lost report.

- **Effects:** claim created as `PENDING`; the found item moves to `UNDER_VERIFICATION`; administrators and the finder are notified (the notification never includes the evidence).
- **Response `201`:** `data` = `{ "claim": <Claim> }`
- **Errors:** `400 VALIDATION_ERROR` · `403 FORBIDDEN` (staff account, or it is my own found item) · `404 NOT_FOUND` (item missing or not FOUND type) · `409 CONFLICT` (I already have an active claim on it, or the item can no longer be claimed) · `429 RATE_LIMITED`
- **Example:**

```bash
curl -X POST "$API/claims" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"foundItemId":"665f2a7e9b1d4a0012ab3502","explanation":"I left them on the library desk on Friday.","privateEvidence":"Scratch near the left hinge; blue sticker inside the case lid."}'
```

### 9.2 `GET /claims/mine`

- **Purpose:** "My claims" and their current status.
- **Auth:** required. **Role:** `user`.
- **Query:** `status`, `page`, `limit`.
- **Response `200`:** array of `ClaimSummary`, plus `meta`. (No evidence in lists.)
- **Example:** `curl "$API/claims/mine" -H "Authorization: Bearer $TOKEN"`

### 9.3 `GET /claims/:id`

- **Purpose:** One of my claims in full, including my own evidence and any reviewer note.
- **Auth:** required. **Role:** the claimant only. Administrators use `GET /admin/claims/:id`.
- **Response `200`:** `data` = `{ "claim": <Claim> }`
- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` (not found, **or not mine**)
- **Example:** `curl "$API/claims/665f3d1e9b1d4a0012ab3650" -H "Authorization: Bearer $TOKEN"`

### 9.4 `POST /claims/:id/respond`

- **Purpose:** Answer an administrator's request for more information.
- **Auth:** required. **Role:** the claimant only.
- **Request body:** `{ "message": "The case also has my initials, A.Y., on the zip." }` (1–1000 characters)
- **Effects:** status `NEEDS_MORE_INFORMATION → UNDER_REVIEW`; administrators are notified.
- **Response `200`:** `data` = `{ "claim": <Claim> }`
- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION` (the claim is not waiting for information)
- **Example:**

```bash
curl -X POST "$API/claims/665f3d1e9b1d4a0012ab3650/respond" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"message":"The case also has my initials, A.Y., on the zip."}'
```

### 9.5 `PATCH /claims/:id/withdraw`

- **Purpose:** Withdraw a claim that has not been decided.
- **Auth:** required. **Role:** the claimant only.
- **Request body:** none.
- **Effects:** status → `WITHDRAWN`. If no other active claim exists on the item, the item returns to `OPEN`.
- **Response `200`:** `data` = `{ "claim": <ClaimSummary> }`
- **Errors:** `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION` (already approved, rejected or withdrawn)
- **Example:** `curl -X PATCH "$API/claims/665f3d1e9b1d4a0012ab3650/withdraw" -H "Authorization: Bearer $TOKEN"`

---

## 10. Notifications

### 10.1 `GET /notifications`

- **Purpose:** My notification inbox, newest first.
- **Auth:** required. **Role:** any. (Always only my own.)
- **Query:** `unread=true` (only unread), `page`, `limit`.
- **Response `200`:** array of `Notification`; `meta` also carries `unreadCount`:

```json
{
  "success": true,
  "data": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0, "unreadCount": 0 }
}
```

- **Example:** `curl "$API/notifications?unread=true" -H "Authorization: Bearer $TOKEN"`

### 10.2 `PATCH /notifications/read-all`

- **Purpose:** Mark all my notifications as read.
- **Auth:** required. **Role:** any.
- **Response `200`:** `data` = `{ "updated": 3 }`
- **Example:** `curl -X PATCH "$API/notifications/read-all" -H "Authorization: Bearer $TOKEN"`

### 10.3 `PATCH /notifications/:id/read`

- **Purpose:** Mark one notification as read.
- **Auth:** required. **Role:** any (the recipient).
- **Response `200`:** `data` = `{ "notification": <Notification> }`
- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` (not found or not mine)
- **Example:** `curl -X PATCH "$API/notifications/665f3b0e9b1d4a0012ab3601/read" -H "Authorization: Bearer $TOKEN"`

---

## 11. Administration

All `/admin/*` routes need a logged-in **staff** account. Each route states which roles. Using one with the wrong role returns `403 FORBIDDEN`.

### 11.1 `GET /admin/overview`

- **Purpose:** The dashboard's headline numbers and recent activity, all calculated from the database.
- **Auth:** required. **Role:** `admin`.
- **Response `200`:**

```json
{
  "success": true,
  "data": {
    "users": { "total": 120, "active": 117, "suspended": 3 },
    "items": {
      "lost": { "total": 64, "active": 41 },
      "found": { "total": 52, "active": 30 }
    },
    "claims": { "pending": 4, "underReview": 2, "needsMoreInformation": 1 },
    "recovery": { "awaitingCollection": 3, "completedThisMonth": 9 },
    "recentItems": [],
    "recentClaims": []
  }
}
```

`recentItems` is a list of `ItemCard`; `recentClaims` a list of claim rows (see 11.4). The numbers above are an example of the shape only.

- **Example:** `curl "$API/admin/overview" -H "Authorization: Bearer $TOKEN"`

### 11.2 `GET /admin/items`

- **Purpose:** Every report, including closed ones, for management.
- **Auth:** required. **Role:** `admin`.
- **Query:** same as `GET /items`, plus `reporterId`. `status` may be any status including `CLOSED`.
- **Response `200`:** array of `ItemCard` plus `reporter: { id, fullName }`, `handedToOffice` and `updatedAt`; plus `meta`. (Open a row with `GET /items/:id` for the full private view.)
- **Example:** `curl "$API/admin/items?status=CLOSED&reportType=FOUND" -H "Authorization: Bearer $TOKEN"`

### 11.3 `PATCH /admin/items/:id/status`

- **Purpose:** An administrator's manual status change, limited to the transitions an administrator may trigger (see [ARCHITECTURE.md](ARCHITECTURE.md#7-status-flows)): close a report, reopen a closed one, or reopen an item after a cancelled recovery.
- **Auth:** required. **Role:** `admin`.
- **Request body:** `{ "status": "CLOSED", "note": "Duplicate report." }`. `note` is required when closing or when taking `APPROVED_FOR_RETURN` back to `OPEN`.
- **Response `200`:** `data` = `{ "item": <ItemDetail> }`. An audit record is written.
- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION`
- **Example:**

```bash
curl -X PATCH "$API/admin/items/665f2a7e9b1d4a0012ab3501/status" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"CLOSED","note":"Duplicate report."}'
```

### 11.4 `GET /admin/claims`

- **Purpose:** The claim review queue.
- **Auth:** required. **Role:** `admin`.
- **Query:** `status`, `page`, `limit`, `sort` (`oldest` default, so the longest-waiting claims come first, or `newest`).
- **Response `200`:** array of rows `{ id, status, createdAt, updatedAt, claimant: { id, fullName }, foundItem: <ItemCard>, relatedLostItem: <ItemCard> | null }`, plus `meta`. (No evidence in the list.)
- **Example:** `curl "$API/admin/claims?status=PENDING" -H "Authorization: Bearer $TOKEN"`

### 11.5 `GET /admin/claims/:id`

- **Purpose:** Everything needed to decide one claim.
- **Auth:** required. **Role:** `admin`.
- **Response `200`:**

```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "665f3d1e9b1d4a0012ab3650",
      "status": "UNDER_REVIEW",
      "explanation": "I left them on the desk at the library on Friday afternoon.",
      "privateEvidence": "Left earcup has a scratch near the hinge. Case has a blue sticker inside the lid.",
      "additionalInfo": [],
      "reviewNote": null,
      "reviewedAt": null,
      "createdAt": "2026-11-15T09:00:00.000Z"
    },
    "claimant": { "id": "665f1c2e9b1d4a0012ab34cd", "fullName": "Amina Yusuf", "email": "amina@example.com", "phoneNumber": "+2348012345678", "contactPreference": "IN_APP" },
    "foundItem": { "id": "665f2a7e9b1d4a0012ab3502", "title": "Headphones in black case", "privateDetails": "Small scratch on left earcup; blue sticker inside case.", "status": "UNDER_VERIFICATION" },
    "relatedLostItem": null,
    "evidenceOverlap": { "level": "HIGH", "note": "Several private details match. This is a review aid only." },
    "otherActiveClaims": 0,
    "recoveryRecordId": null
  }
}
```

`foundItem` and `relatedLostItem` are full `ItemDetail` objects (shortened above). `evidenceOverlap.level` is `NONE`, `LOW`, `MEDIUM` or `HIGH`, **admin-only** and never a decision. Every call writes an `EVIDENCE_VIEWED` audit record.

- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND`
- **Example:** `curl "$API/admin/claims/665f3d1e9b1d4a0012ab3650" -H "Authorization: Bearer $TOKEN"`

### 11.6 `PATCH /admin/claims/:id/review`

- **Purpose:** Move a claim forward. One endpoint, four decisions.
- **Auth:** required. **Role:** `admin`.
- **Request body:** `{ "decision": "REQUEST_INFO", "note": "Please describe the case lining." }`

| `decision` | Allowed from | Result | `note` |
|---|---|---|---|
| `START_REVIEW` | `PENDING` | `UNDER_REVIEW` | optional |
| `REQUEST_INFO` | `UNDER_REVIEW` | `NEEDS_MORE_INFORMATION`; claimant notified | **required** |
| `APPROVE` | `UNDER_REVIEW` | `APPROVED`; item → `APPROVED_FOR_RETURN`; every other active claim on the item is auto-rejected; claimant notified | optional |
| `REJECT` | `PENDING`, `UNDER_REVIEW`, `NEEDS_MORE_INFORMATION` | `REJECTED`; claimant notified; if no active claims remain the item returns to `OPEN` | **required** |

`note` is shown to the claimant. An audit record (`CLAIM_REVIEWED`) is written.

- **Response `200`:** `data` = `{ "claim": <ClaimSummary>, "itemStatus": "APPROVED_FOR_RETURN" }`
- **Errors:** `400 VALIDATION_ERROR` (note missing where required, bad decision) · `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION`
- **Example:**

```bash
curl -X PATCH "$API/admin/claims/665f3d1e9b1d4a0012ab3650/review" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"decision":"APPROVE"}'
```

### 11.7 `GET /admin/users`

- **Purpose:** List and search accounts.
- **Auth:** required. **Role:** `admin`.
- **Query:** `q` (name or email), `role`, `accountStatus`, `page`, `limit`.
- **Response `200`:** array of `User` (administrator view, includes phone number), plus `meta`.
- **Example:** `curl "$API/admin/users?role=user&q=amina" -H "Authorization: Bearer $TOKEN"`

### 11.8 `PATCH /admin/users/:id`

- **Purpose:** Suspend or reactivate an account, or change its role (this is how staff accounts are created: a person registers, then an administrator promotes them).
- **Auth:** required. **Role:** `admin`.
- **Request body:** `{ "accountStatus": "SUSPENDED" }` and/or `{ "role": "recovery_officer" }`
- **Rules:** an administrator **cannot** change their own role or status, and the last active administrator can never be demoted or suspended. Each change writes an audit record.
- **Response `200`:** `data` = `{ "user": <User> }`
- **Errors:** `400 VALIDATION_ERROR` · `403 FORBIDDEN` (own account, or last administrator) · `404 NOT_FOUND`
- **Example:**

```bash
curl -X PATCH "$API/admin/users/665f1c2e9b1d4a0012ab34cd" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"accountStatus":"SUSPENDED"}'
```

### 11.9 `GET /admin/recovery-records`

- **Purpose:** The handover work list.
- **Auth:** required. **Role:** `admin` (sees all) or `recovery_officer` (the server returns **only records assigned to them**, whatever the query says).
- **Query:** `collectionStatus`, `page`, `limit`.
- **Response `200`:** array of `RecoveryRecord`, plus `meta`.
- **Example:** `curl "$API/admin/recovery-records?collectionStatus=SCHEDULED" -H "Authorization: Bearer $TOKEN"`

### 11.10 `POST /admin/recovery-records`

- **Purpose:** Start the handover process for an approved claim.
- **Auth:** required. **Role:** `admin`.
- **Request body:**

```json
{
  "claimId": "665f3d1e9b1d4a0012ab3650",
  "assignedTo": "665f0b0e9b1d4a0012ab3410",
  "collectionLocation": "Security Office",
  "collectionDate": "2026-11-18T10:00:00.000Z",
  "internalNotes": "Claimant to bring student ID."
}
```

`assignedTo` must be an administrator or recovery officer. `collectionDate` and `internalNotes` are optional.

- **Effects:** record created as `PENDING_ARRANGEMENT` (or `SCHEDULED` if a date is given); claimant notified (`RECOVERY_UPDATE`); audit record written.
- **Response `201`:** `data` = `{ "recoveryRecord": <RecoveryRecord> }`
- **Errors:** `400 VALIDATION_ERROR` · `404 NOT_FOUND` (claim or staff user) · `409 CONFLICT` (claim is not `APPROVED`, or a record already exists)
- **Example:**

```bash
curl -X POST "$API/admin/recovery-records" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"claimId":"665f3d1e9b1d4a0012ab3650","assignedTo":"665f0b0e9b1d4a0012ab3410","collectionLocation":"Security Office"}'
```

### 11.11 `PATCH /admin/recovery-records/:id`

- **Purpose:** Schedule, complete or cancel a handover.
- **Auth:** required. **Role:** `admin` (any record, any field) or `recovery_officer` (**assigned records only**, and only `collectionStatus`, `collectionDate`, `internalNotes`).
- **Request body** (any of): `collectionStatus`, `collectionDate`, `collectionLocation`, `internalNotes`, `assignedTo` (admin only).
- **Allowed status changes:** `PENDING_ARRANGEMENT → SCHEDULED → COMPLETED`; `PENDING_ARRANGEMENT` or `SCHEDULED → CANCELLED`.
- **Effects of `COMPLETED`:** `completedAt` and `completedBy` are set; the found item and any linked lost report become `RETURNED`; the claimant and the finder are notified. **Effects of `CANCELLED`:** the claimant is notified; an administrator then decides whether to reopen the item (`PATCH /admin/items/:id/status`).
- **Response `200`:** `data` = `{ "recoveryRecord": <RecoveryRecord> }`
- **Errors:** `400 VALIDATION_ERROR` · `403 FORBIDDEN` (officer touching a record or field that is not theirs) · `404 NOT_FOUND` · `409 INVALID_STATE_TRANSITION`
- **Example:**

```bash
curl -X PATCH "$API/admin/recovery-records/665f4c1e9b1d4a0012ab3701" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"collectionStatus":"COMPLETED","internalNotes":"ID checked. Handed over."}'
```

### 11.12 `GET /admin/analytics`

- **Purpose:** Data for the analytics charts.
- **Auth:** required. **Role:** `admin`.
- **Query:** `range` = `7d`, `30d` (default), `90d` or `365d`.
- **Definitions:** *recovery rate* = FOUND reports in the range that reached `RETURNED`, divided by all FOUND reports in the range. *Average days to return* = mean of (return date − report date) for those returned items.
- **Response `200`:**

```json
{
  "success": true,
  "data": {
    "range": { "from": "2026-10-23T00:00:00.000Z", "to": "2026-11-22T00:00:00.000Z" },
    "totals": { "lost": 18, "found": 14, "claims": 9, "returned": 5 },
    "recoveryRate": 0.36,
    "averageDaysToReturn": 3.2,
    "itemsOverTime": [{ "date": "2026-11-14", "lost": 2, "found": 1 }],
    "byCategory": [{ "category": "ELECTRONICS", "lost": 6, "found": 4 }],
    "byLocation": [{ "location": "Main Library", "lost": 5, "found": 3 }],
    "claimOutcomes": { "APPROVED": 5, "REJECTED": 2, "WITHDRAWN": 1, "PENDING": 1 }
  }
}
```

The numbers are an example of the shape only.

- **Errors:** `400 VALIDATION_ERROR` (bad `range`)
- **Example:** `curl "$API/admin/analytics?range=90d" -H "Authorization: Bearer $TOKEN"`

### 11.13 `GET /admin/audit-records`

- **Purpose:** Monitor administrative activity.
- **Auth:** required. **Role:** `admin`.
- **Query:** `action`, `targetType`, `actorId`, `page`, `limit`.
- **Response `200`:** array of `AuditRecord`, newest first, plus `meta`.
- **Example:** `curl "$API/admin/audit-records?action=CLAIM_REVIEWED" -H "Authorization: Bearer $TOKEN"`

---

## 12. Change log

| Date | Change |
|---|---|
| 2026-11-24 | Stage 5 implemented `GET /meta/options` and 5 item endpoints (create, mine, get one, edit, close). Changes from the design: places are now **zones plus a detail** (`generalLocation` is a zone code, new field `locationDetail`; section 4.2); `images` and the `image` link are deferred to Stage 9; administrator edit and close are deferred to Stage 12 (audit log first); date rule is `YYYY-MM-DD`, at most one day ahead and 365 days back; `/meta/options` returns a smaller set of lists for now |
| 2026-11-23 | Stage 4 implemented 6 endpoints (register, login, `/auth/me`, `/users/me`, profile update, password change). Changes from the design: rate limits redesigned (section 1.6: failed logins per address + email, register per address, general limit 600); section 1.7 added (token details); `profileImage` deferred to Stage 9; new password must differ from the current one |
| 2026-11-22 | Initial design (Stage 1). 37 endpoints planned. Added beyond the original brief: `/health`, `/meta/options`, `PATCH /users/me/password`, `POST /uploads/images`, `GET /items/mine`, `POST /claims/:id/respond`, `PATCH /claims/:id/withdraw`, `GET /claims/mine`, `PATCH /notifications/read-all`, `PATCH /admin/items/:id/status`, `GET /admin/claims/:id`, `PATCH /admin/users/:id`, `GET /admin/audit-records`, `PATCH /admin/recovery-records/:id` |
