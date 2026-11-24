# FINDIT: Database Schema

> **Status:** Stage 1 design. Nothing here is implemented yet. It becomes real in Stage 3 (connection), Stage 4 (users) and Stages 5, 11, 13, 14 (other collections). Build status: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

Diagram: [diagrams/er-diagram.md](diagrams/er-diagram.md)

---

## 1. Concepts in plain English

| Term | Meaning |
|---|---|
| **Collection** | Like a table: a group of similar records (e.g. all users) |
| **Document** | One record in a collection (one user, one item). Stored like a JSON object |
| **`_id`** | The unique ID MongoDB gives every document (an `ObjectId`) |
| **Reference** | A field holding another document's `_id`, e.g. an item's `reporterId` points to a user. This is how collections are linked |
| **Embedded** | Data stored *inside* a document rather than in another collection (e.g. an item's list of images) |
| **Index** | A lookup shortcut that makes searches fast. It can also enforce uniqueness (no two users with the same email) |
| **Schema (Mongoose)** | Our code-level definition of each collection: field types, required fields, allowed values |
| **`select: false`** | A Mongoose setting meaning "never load this field unless explicitly asked". We use it for passwords and private data so they cannot leak by accident |

## 2. Collections at a glance

| Collection | Purpose | Created in stage |
|---|---|---|
| `users` | Accounts and roles | 4 |
| `items` | Lost **and** found reports (one collection, distinguished by `reportType`) | 5 |
| `claims` | Ownership claims on found items | 11 |
| `recoveryrecords` | Handover tracking for approved claims | 13 |
| `notifications` | In-app messages | 14 |
| `auditrecords` | Append-only log of important actions | 12–16 |

Six collections, matching the project brief. Only a few small additions were made. They are listed in [section 9](#9-differences-from-the-brief) with reasons.

**Why one `items` collection for both lost and found?** Both kinds of report share almost every field, are searched together, and are compared by the matching system. One collection with a `reportType` field is simpler than two near-identical ones.

**Conventions.** Mongoose adds `createdAt` and `updatedAt` automatically (`timestamps: true`) wherever the brief says "timestamps". Field names are `camelCase`. Enumerated values are `UPPER_SNAKE_CASE` strings. All text is trimmed before saving.

---

## 3. Shared value lists (enumerations)

Defined once in `backend/src/config/constants.js` and served to the clients by `GET /meta/options`, so mobile, dashboard and backend never disagree.

| List | Values |
|---|---|
| `ROLES` | `user`, `admin`, `recovery_officer` |
| `ACCOUNT_STATUSES` | `ACTIVE`, `SUSPENDED` |
| `CONTACT_PREFERENCES` | `IN_APP`, `EMAIL`, `PHONE` |
| `REPORT_TYPES` | `LOST`, `FOUND` |
| `CATEGORIES` | `ELECTRONICS`, `BAGS`, `WALLETS_AND_CARDS`, `KEYS`, `CLOTHING`, `ACCESSORIES`, `DOCUMENTS`, `BOOKS_AND_STATIONERY`, `SPORTS_EQUIPMENT`, `OTHER` |
| `COLOURS` | `BLACK`, `WHITE`, `GREY`, `SILVER`, `RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE`, `PINK`, `BROWN`, `BEIGE`, `GOLD`, `MULTICOLOUR`, `OTHER` |
| `TIME_BANDS` | `MORNING` (06:00–12:00), `AFTERNOON` (12:00–17:00), `EVENING` (17:00–21:00), `NIGHT` (21:00–06:00), `UNKNOWN` |
| `CAMPUS_LOCATIONS` | **16 zones** (library, classrooms, auditoriums, male halls, female halls, other halls, churches, cafeteria, sports, hospital, administration, shops, gates and parking, Iperu campus, off campus, not sure). Each zone says how much more detail is needed: pick from a **list** (which hall, which church), type a **required** short description (which library, which class number), or an **optional** one. Defined in one file, `backend/src/config/campusLocations.js`, from real Babcock University place names. No capacities or people's names are stored |
| `ITEM_STATUSES` | `OPEN`, `POTENTIAL_MATCH`, `UNDER_VERIFICATION`, `APPROVED_FOR_RETURN`, `RETURNED`, `CLOSED` |
| `CLAIM_STATUSES` | `PENDING`, `UNDER_REVIEW`, `NEEDS_MORE_INFORMATION`, `APPROVED`, `REJECTED`, `WITHDRAWN` |
| `COLLECTION_STATUSES` | `PENDING_ARRANGEMENT`, `SCHEDULED`, `COMPLETED`, `CANCELLED` |
| `COLLECTION_LOCATIONS` | Configurable list of authorised offices, e.g. *Security Office, Student Affairs Office* (placeholders, Stage 13) |
| `NOTIFICATION_TYPES` | `POTENTIAL_MATCH`, `CLAIM_SUBMITTED`, `CLAIM_STATUS_CHANGED`, `MORE_INFO_REQUESTED`, `RECOVERY_UPDATE` |
| `AUDIT_ACTIONS` | See [section 8](#8-auditrecords) |

---

## 4. `users`

One document per account.

| Field | Type | Required | Rules and notes |
|---|---|---|---|
| `fullName` | String | yes | 2–80 characters |
| `email` | String | yes | Valid email, stored **lowercase**, unique, max 254 |
| `passwordHash` | String | yes | bcrypt hash. **`select: false`**, never returned by any API |
| `role` | String | yes | One of `ROLES`. Default `user`. Never accepted from public registration |
| `phoneNumber` | String | no | Optional, 7–20 characters, digits plus `+ - ( )` and spaces. **Private**: returned only to the account owner and administrators |
| `profileImage` | Object `{ url, publicId }` | no | Cloudinary image |
| `contactPreference` | String | yes | One of `CONTACT_PREFERENCES`. Default `IN_APP` |
| `accountStatus` | String | yes | `ACTIVE` (default) or `SUSPENDED` |
| `createdAt`, `updatedAt` | Date | auto | |

**Indexes:** `email` (unique); `{ role: 1, accountStatus: 1 }` for admin user lists.

**Notes**
- The JWT identifies a user by `_id` only. On every request the backend reloads the user, so a suspension or role change applies **immediately**.
- Password rule: 8–72 characters (bcrypt ignores everything after 72 bytes, so we refuse longer passwords rather than silently truncating them), at least one letter and one number.

**Implemented in Stage 4** (`backend/src/models/User.js`, verified against a real MongoDB):
- The unique `email` index really enforces uniqueness, including when five sign-ups for the same email arrive at the same instant (exactly one wins).
- `passwordHash` uses `select: false`: a normal query never returns it. The raw stored value is a 60-character bcrypt hash.
- Roles are only `user` on public sign-up. `admin` accounts come from `npm run seed:admin` (or, from Stage 12, an administrator promoting someone).
- `profileImage` exists in the model but cannot be set until Stage 9.
- Indexes are built when the server starts (`initModels()`), before any request is accepted.

---

## 5. `items`

One document per lost or found report.

| Field | Type | Required | Visibility | Rules and notes |
|---|---|---|---|---|
| `reportType` | String | yes | public | `LOST` or `FOUND`. **Immutable** after creation |
| `title` | String | yes | public | 3–80 characters ("item name") |
| `category` | String | yes | public | One of `CATEGORIES` |
| `description` | String | yes | public | 10–1000 characters. UI warns: describe the item generally; put identifying marks in *private details* |
| `images` | Array of `{ url, publicId }` | no | public | Max 3. URLs must belong to **our** Cloudinary account (checked on save). **Not in the model yet: added in Stage 9** |
| `colour` | String | yes | public | One of `COLOURS` |
| `brand` | String | no | public | Max 40 characters |
| `privateDetails` | String | no | **private** | Max 1000. Lost: distinguishing characteristics. Found: identifying details used to verify a claimant. **`select: false`** |
| `generalLocation` | String | yes | public | A **zone code** from `CAMPUS_LOCATIONS` (for example `MALE_HALLS`). A general area, never a precise or private spot |
| `locationDetail` | String | by zone | public | Which hall / library / class. Required, optional or a fixed list depending on the zone, 3–80 characters. Checked together with `generalLocation` by `checkLocation()`. Only a **hint**: items get moved |
| `dateOccurred` | Date | yes | public | Date lost / found, stored as midnight UTC. Not more than one day in the future (slack for Nigerian clocks running ahead of the server's UTC clock) and not more than 365 days ago |
| `approximateTime` | String | yes | public | One of `TIME_BANDS`. Default `UNKNOWN` |
| `status` | String | yes | public | One of `ITEM_STATUSES`. Default `OPEN`. Changed **only** by the status service (never directly from request data) |
| `reporterId` | ObjectId → `users` | yes | **private** | Never exposed publicly. Clients receive only an `isMine` flag |
| `handedToOffice` | Boolean | FOUND only | public | Reporter's declaration that the item was handed to an authorised office. Staff may correct it. Default `false` |
| `privateStorageLocation` | String | no | **private** | Max 200. Where the found item is kept. Visible to reporter and admins. **`select: false`** |
| `closedAt` | Date | no | private | Set when closed. Shown only to the reporter and administrators (a closed report is invisible to everyone else) |
| `closeReason` | String | no | **private** | Max 200. **`select: false`** |
| `createdAt`, `updatedAt` | Date | auto | | |

Fields that exist only for FOUND (`handedToOffice`, `privateStorageLocation`) are rejected on LOST reports.

**Implemented in Stage 5** (`backend/src/models/Item.js`, verified against a real MongoDB):
- The three private fields (`privateDetails`, `privateStorageLocation`, `closeReason`) use `select: false`, so a normal query never loads them. The service loads them with a second query only for the reporter or an administrator, so a public view cannot leak them even by mistake.
- `reportType` and `reporterId` are `immutable`: even code that changes them and saves has no effect (tested).
- The model itself refuses found-only fields on a LOST report and values outside the allowed lists, even if the API were bypassed.
- All five indexes above exist and are built when the server starts (tested).
- Status changes go through `backend/src/services/statusRules.js` (the transition table); the model only stores the value.

**Indexes**

| Index | Why |
|---|---|
| `{ reportType: 1, status: 1, createdAt: -1 }` | The main browse list ("recent lost items", "open found items") |
| `{ category: 1, reportType: 1, status: 1 }` | Matching candidate lookup |
| `{ reporterId: 1, createdAt: -1 }` | "My reports" |
| `{ dateOccurred: -1 }` | Date filters and date sorting |
| `{ generalLocation: 1 }` | Location (zone) filter |

**Search design.** Keyword search uses a case-insensitive, *escaped* regular-expression match on `title`, `description`, `brand`, the zone's label and `locationDetail`. This is chosen over MongoDB `$text` search because `$text` does not match partial words (typing "head" would not find "headphones"). The search text is always escaped, so it can never act as a pattern. For campus-scale data this is fast enough. See [DECISIONS.md](DECISIONS.md) D-011.

---

## 6. `claims`

One document per ownership claim. Claims are made on **found** items.

| Field | Type | Required | Visibility | Rules and notes |
|---|---|---|---|---|
| `foundItemId` | ObjectId → `items` | yes | claimant + admin | Must reference an item whose `reportType` is `FOUND`, status `OPEN`, `POTENTIAL_MATCH` or `UNDER_VERIFICATION` |
| `relatedLostItemId` | ObjectId → `items` | no | claimant + admin | Must be a `LOST` report **owned by the claimant** |
| `claimantId` | ObjectId → `users` | yes | admin | Must not be the found item's reporter. Must have role `user` |
| `explanation` | String | yes | claimant + admin | 10–1000. Why the claimant believes it is theirs |
| `privateEvidence` | String | yes | claimant + admin only | 10–2000. Details only the owner would know. **`select: false`**. Never included in item responses or lists |
| `additionalInfo` | Array of `{ message, createdAt }` | no | claimant + admin only | Claimant's replies to an information request. Each message 1–1000 characters, max 10. **`select: false`** |
| `status` | String | yes | claimant + admin | One of `CLAIM_STATUSES`. Default `PENDING`. Changed only by the claim service |
| `reviewedBy` | ObjectId → `users` | no | admin | Set when decided |
| `reviewNote` | String | conditional | claimant + admin | Max 1000. **Written for the claimant to read** (it is their explanation of a rejection or request for information). Required for reject and request-info |
| `reviewedAt` | Date | no | claimant + admin | |
| `createdAt`, `updatedAt` | Date | auto | | |

**Indexes**

| Index | Why |
|---|---|
| `{ claimantId: 1, createdAt: -1 }` | "My claims" |
| `{ foundItemId: 1, status: 1 }` | Find the active claims on an item; speeds up auto-reject on approval |
| `{ status: 1, createdAt: -1 }` | Admin review queue |

**Business rule: one active claim per user per item.** Enforced in the claim service (check, then create). Whether to also add a database-level partial unique index is decided at Stage 11 after testing what the database version supports. It is not assumed here.

---

## 7. `recoveryrecords`, `notifications`

### `recoveryrecords`

One document per handover. Created only for an **APPROVED** claim.

| Field | Type | Required | Rules and notes |
|---|---|---|---|
| `itemId` | ObjectId → `items` | yes | The FOUND item. Must be `APPROVED_FOR_RETURN` when created |
| `claimId` | ObjectId → `claims` | yes | **Unique**: at most one record per claim |
| `claimantId` | ObjectId → `users` | yes | Copied from the claim |
| `createdBy` | ObjectId → `users` | yes | The administrator who created it |
| `assignedTo` | ObjectId → `users` | yes | The administrator or recovery officer responsible. Role must be `admin` or `recovery_officer` |
| `collectionStatus` | String | yes | One of `COLLECTION_STATUSES`. Default `PENDING_ARRANGEMENT` |
| `collectionLocation` | String | yes | One of `COLLECTION_LOCATIONS` (authorised office) |
| `collectionDate` | Date | no | Planned collection date/time |
| `completedAt` | Date | no | Set when `COMPLETED` |
| `completedBy` | ObjectId → `users` | no | Who recorded the handover |
| `internalNotes` | String | no | Max 1000. **Staff only**; never sent to a claimant |
| `createdAt`, `updatedAt` | Date | auto | |

Allowed changes: `PENDING_ARRANGEMENT → SCHEDULED → COMPLETED`, and `PENDING_ARRANGEMENT` or `SCHEDULED → CANCELLED`. `COMPLETED` and `CANCELLED` are final.

**Indexes:** `claimId` (unique); `{ assignedTo: 1, collectionStatus: 1 }` (officer's work list); `{ collectionStatus: 1, createdAt: -1 }` (admin list).

### `notifications`

| Field | Type | Required | Rules and notes |
|---|---|---|---|
| `recipientId` | ObjectId → `users` | yes | |
| `type` | String | yes | One of `NOTIFICATION_TYPES` |
| `title` | String | yes | Max 100 |
| `message` | String | yes | Max 300. Must **not** contain private evidence or other users' contact details |
| `relatedItemId` | ObjectId → `items` | no | The item this concerns (for a match: the recipient's own report) |
| `matchedItemId` | ObjectId → `items` | no | For `POTENTIAL_MATCH`: the other report. *Addition, see section 9* |
| `relatedClaimId` | ObjectId → `claims` | no | |
| `isRead` | Boolean | yes | Default `false` |
| `readAt` | Date | no | |
| `createdAt` | Date | auto | (no `updatedAt` needed) |

**Indexes:** `{ recipientId: 1, createdAt: -1 }` (the inbox); `{ recipientId: 1, isRead: 1 }` (unread count); and a **unique** index on `{ recipientId, type, relatedItemId, matchedItemId }` applied only to `POTENTIAL_MATCH` notifications, so the same match never notifies the same person twice. *(The exact form of this partial index is verified against the real database at Stage 10.)*

---

## 8. `auditrecords`

An append-only log: records are **created, never edited or deleted** (no API exposes update or delete).

| Field | Type | Required | Rules and notes |
|---|---|---|---|
| `actorId` | ObjectId → `users` | yes | Who did it |
| `actorRole` | String | yes | The role at that moment |
| `action` | String | yes | One of the values below |
| `targetType` | String | yes | `USER`, `ITEM`, `CLAIM` or `RECOVERY` |
| `targetId` | ObjectId | yes | The affected record |
| `metadata` | Object | no | **Non-sensitive only**: e.g. `{ "from": "PENDING", "to": "APPROVED" }`. Never evidence, passwords, tokens or contact details |
| `createdAt` | Date | auto | The timestamp |

**Initial `AUDIT_ACTIONS`:** `ADMIN_LOGIN`, `CLAIM_REVIEWED`, `EVIDENCE_VIEWED`, `ITEM_STATUS_CHANGED`, `ITEM_CLOSED_BY_ADMIN`, `ITEM_EDITED_BY_ADMIN`, `USER_ROLE_CHANGED`, `USER_STATUS_CHANGED`, `RECOVERY_CREATED`, `RECOVERY_UPDATED`, `RECOVERY_COMPLETED`.

**Indexes:** `{ targetType: 1, targetId: 1, createdAt: -1 }` (history of one record); `{ actorId: 1, createdAt: -1 }` (what did this person do); `{ createdAt: -1 }` (latest activity).

---

## 9. Differences from the brief

The brief lists the collections and fields below as "initial". These small changes were made deliberately. Each can be reversed on request:

| Change | Reason |
|---|---|
| `items.imageUrls` → `items.images` (`{ url, publicId }`) | Cloudinary needs the `publicId` to delete or replace an image later. Storing only the URL would make that impossible |
| `items`: *private identifying details* and *distinguishing characteristics* are **one** field, `privateDetails` | Same purpose (private facts used for verification), simpler |
| `items`: `approximateTime` is a time **band** (morning, afternoon, …) | Easy to pick on a phone, and easy to compare in matching |
| `items`: "additional details" and per-report "contact preference" are not separate fields | Additional details fold into `description`. Contact preference lives on the user (one place, and contact details are never public anyway) |
| `claims`: added `additionalInfo` | Needed so a claimant can answer a "needs more information" request |
| `recoveryrecords`: one staff field became `createdBy`, `assignedTo`, `completedBy`; added `collectionLocation`, `completedAt` | Needed so recovery officers can see *assigned* work, and to record where and when the handover happened |
| `notifications`: added `matchedItemId`, `readAt` | Match notifications need to say *which* report matched, and to prevent duplicates |
| `auditrecords`: "affected record" → `targetType` + `targetId`; added `actorRole` | An ID alone does not say which collection it belongs to |
| `users`: nothing removed | |

## 10. Data lifecycle and privacy

- **Passwords** are stored only as bcrypt hashes.
- **Private fields** use `select: false` *and* are removed by explicit "serializer" functions before any response. Two safety layers, so one mistake does not cause a leak.
- **Deleting reports** is not offered. Closing is a soft state change, so the audit trail and claims stay consistent.
- **Retention** (how long closed reports, claims and evidence are kept) is a policy decision recorded at Stage 16. No automatic deletion is built in the first version.
- **Development data** is fake. Real personal data is never committed to Git.
