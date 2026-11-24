# FINDIT: Architecture

> **Status:** Stage 1 design. The folders and files below are the *plan*. They are created stage by stage, and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) records what really exists.

---

## 1. Big picture

Diagram: [diagrams/system-architecture.md](diagrams/system-architecture.md)

- **Mobile app** (React Native, Expo Go) and **admin dashboard** (React, Vite) are two *clients*. They show screens and collect input. They contain **no business rules** and never touch the database.
- **Backend** (Node.js, Express) is the single source of truth. It checks who you are, what you may do, whether your data is valid, applies the rules (matching, status changes, claims) and talks to the database and Cloudinary.
- **MongoDB Atlas** stores the data. **Cloudinary** stores the photos.

**Why this shape?** One backend means one set of rules. Whatever a client does (including a modified or malicious one), the backend still enforces permissions and validation. It also means the mobile app and dashboard stay thin and easy to change.

**Where things run during development**

| Piece | Runs on |
|---|---|
| Backend | Your laptop (`http://<laptop-ip>:4000`). Your phone reaches it over the same Wi-Fi |
| Mobile app | Expo Go on your phone, served by Expo's dev server on your laptop |
| Admin dashboard | Browser on your laptop (Vite dev server) |
| Database | MongoDB Atlas (cloud, free) |
| Images | Cloudinary (cloud, free) |

---

## 2. Repository layout

```text
FINDIT/
├── README.md                  Project front page (Stage 2)
├── .gitignore                 Keeps secrets and node_modules out of Git (Stage 2)
├── backend/                   Node + Express API (Stages 2–16)
├── mobile-app/                React Native + Expo app (folder created in Stage 7, D-020)
├── admin-dashboard/           React + Vite website (folder created in Stage 12, D-020)
└── documentation/             These documents
    └── diagrams/
```

Each of the three code folders has its **own** `package.json` and `node_modules` and is installed and run independently. They talk only through the HTTP API.

---

## 3. Backend structure

```text
backend/
├── src/
│   ├── config/         Settings: reads .env, connects to MongoDB, shared constants
│   ├── controllers/    Receive a request, call a service, send the response
│   ├── middleware/     Checkpoints: authentication, role check, validation, rate limits, errors
│   ├── models/         Mongoose schemas (the database definitions)
│   ├── routes/         Maps URLs to middleware + controller
│   ├── services/       The actual business logic
│   ├── validators/     Input rules (one schema per endpoint)
│   ├── utils/          Small helpers
│   ├── app.js          Builds the Express app (does not start listening)
│   └── server.js       Connects to the database, then starts listening
├── scripts/            One-off tools: create first admin, load demo data
├── tests/              Automated tests
├── .env.example        Names of required settings, with fake values (committed)
├── .gitignore
├── package.json
└── README.md
```

| Folder | Purpose | Example files (planned) |
|---|---|---|
| `config/` | Everything "set up once": reads `.env`, validates it at start-up (fails fast if a secret is missing), connects to MongoDB, holds the enumerations from [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#3-shared-value-lists-enumerations) | `env.js`, `db.js` (`constants.js` is added in Stage 4) |
| `models/` | One Mongoose schema per collection, with validation and indexes | `User.js`, `Item.js`, `Claim.js`, `Notification.js`, `RecoveryRecord.js`, `AuditRecord.js` |
| `validators/` | Strict [Zod](https://zod.dev) schemas that describe exactly what each endpoint accepts. Unknown fields are rejected | `authValidators.js`, `itemValidators.js`, … |
| `middleware/` | Reusable checkpoints | `authenticate.js` (who are you?), `authorize.js` (are you allowed?), `validate.js`, `rateLimiters.js`, `upload.js`, `notFound.js`, `errorHandler.js` |
| `routes/` | Declares each endpoint and lists its checkpoints in order | `authRoutes.js`, `itemRoutes.js`, `claimRoutes.js`, `adminRoutes.js`, `index.js` |
| `controllers/` | **Thin.** Take the validated input, call one service function, return the standard response | `authController.js`, `itemController.js`, … |
| `services/` | **All real logic lives here**, so it is testable without HTTP | `authService.js`, `itemService.js`, `matchingService.js`, `claimService.js`, `recoveryService.js`, `notificationService.js`, `auditService.js`, `analyticsService.js`, `imageService.js`, `statusRules.js` |
| `utils/` | Tiny shared helpers. (No `asyncHandler`: Express 5 forwards async errors itself, D-021) | `ApiError.js`, `serializers.js` (decide which fields are public), `pagination.js`, `escapeRegex.js` |
| `scripts/` | Run by hand | `seedAdmin.js`, `seedDemoData.js` |
| `tests/` | Jest + Supertest | `auth.test.js`, `items.test.js`, … |

`app.js` and `server.js` are separate on purpose: tests import `app.js` and call it directly without opening a network port.

**Module system:** the backend uses CommonJS (`require`) because it works most smoothly with Jest. The mobile app and dashboard use modern ES modules (`import`), which is their default. (D-013)

---

## 4. Request lifecycle and layer rules

What happens on every request:

```text
Client request
  → security middleware    (Helmet headers, CORS, JSON size limit, rate limit)
  → route matched          (e.g. PATCH /api/v1/admin/claims/:id/review)
  → authenticate           (verify token, load user, refuse suspended accounts)
  → authorize(roles)       (is this role allowed on this route?)
  → validate(schema)       (strict check of body / query / params)
  → controller             (thin)
  → service                (business rules, ownership checks, status rules)
  → model                  (database)
  ← serializer             (strip private fields, shape the data)
  ← response envelope      ({ success, data, meta })

Any thrown error → errorHandler → { success: false, error: {...} }
```

**Layer rules** (these keep the code understandable, and are what we check in code review):

1. **Routes** never contain logic. They only wire URLs to middleware and controllers.
2. **Controllers** never touch models directly. They call services.
3. **Services** never read `req` or `res`. They take plain values and return plain values, so tests can call them directly.
4. **Authorisation is checked in two places:** *role* in `authorize` middleware, and *ownership* ("is this *your* report?") inside the service. Both are required.
5. **Nothing leaves the backend without passing through a serializer.** Serializers whitelist fields. They never "remove the bad ones".
6. **Status changes happen only through `statusRules.js`.** No other file assigns `status` directly.

---

## 5. Mobile app structure

```text
mobile-app/
├── App.js                      Entry point: providers + navigation
├── app.json                    Expo configuration
├── package.json
└── src/
    ├── api/                    client.js (fetch wrapper), authApi.js, itemsApi.js, claimsApi.js, …
    ├── context/                AuthContext.js (token + current user)
    ├── navigation/             RootNavigator, AuthStack, MainTabs
    ├── screens/                One file per screen (below)
    ├── components/             Button, TextField, ItemCard, StatusBadge, EmptyState, LoadingView, ErrorView, …
    ├── theme/                  colors.js, spacing.js, typography.js
    └── utils/                  Date formatting, constants helpers
```

**Screens (built progressively in Stage 7):** Welcome · Login · Register · Home · Lost items · Found items · Search · Item details · Report lost · Report found · Submit claim · My reports · My claims · Notifications · Profile · Edit profile.

**Approach**
- **State:** React Context only for what is genuinely global (the logged-in user and token). Each screen fetches its own data. No Redux. (D-012)
- **API calls:** one small `fetch` wrapper (`api/client.js`) adds the token, parses the standard response and turns errors into readable messages. No Axios, so there is one dependency fewer. (D-012)
- **Token storage:** `expo-secure-store` (encrypted on the device).
- **Expo-Go-safe libraries only:** React Navigation, `expo-secure-store`, `expo-image-picker`. Anything that needs a custom native build needs your explicit approval first.
- **Configuration:** the backend address is read from `EXPO_PUBLIC_API_URL`. It is public by design (it ends up inside the app), so **no secret ever goes in the mobile app**.
- **Expo SDK version:** chosen at Stage 7 to match the version your phone's Expo Go supports.

---

## 6. Admin dashboard structure

```text
admin-dashboard/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx, App.jsx       Entry + routes
    ├── api/                    Same fetch-wrapper idea as the mobile app
    ├── context/                AuthContext.js
    ├── pages/                  Login, Overview, Reports, LostItems, FoundItems, Claims, ClaimDetail, Users, Recovery, Analytics, Settings
    ├── components/             Sidebar, Topbar, DataTable, StatCard, Pagination, StatusBadge, ConfirmDialog, …
    └── styles/                 variables.css (design tokens), global.css, plus per-component CSS
```

Plain CSS with CSS variables (no Tailwind). React Router for pages, Chart.js for charts. **Reports** shows all reports; **Lost items** and **Found items** are filtered views of the same data. The dashboard accepts only accounts with the `admin` role (and `recovery_officer` for the recovery page only), and the backend enforces that regardless of what the screen shows.

---

## 7. Status flows

Diagrams: [item-status-flow](diagrams/item-status-flow.md) · [claim-status-flow](diagrams/claim-status-flow.md)

All allowed transitions live in **one file**, `backend/src/services/statusRules.js`. Every other piece of code asks it for permission, and a disallowed change returns `409 INVALID_STATE_TRANSITION`.

### 7.1 Item transitions

| From | To | Triggered by | Condition / effect |
|---|---|---|---|
| *(new)* | `OPEN` | System | On creation |
| `OPEN` | `POTENTIAL_MATCH` | System | Matching finds a candidate scoring at or above the notify threshold |
| `POTENTIAL_MATCH` | `OPEN` | System | No candidate above the threshold remains (re-checked when a counterpart changes; the exact trigger is settled in Stage 10) |
| `OPEN`, `POTENTIAL_MATCH` | `UNDER_VERIFICATION` | System | First claim submitted on a FOUND item |
| `UNDER_VERIFICATION` | `APPROVED_FOR_RETURN` | System | An administrator approves a claim |
| `UNDER_VERIFICATION` | `OPEN` | System | The last active claim is rejected or withdrawn |
| `APPROVED_FOR_RETURN` | `RETURNED` | System | The recovery record is marked `COMPLETED`. A linked lost report also becomes `RETURNED` |
| `APPROVED_FOR_RETURN` | `OPEN` | Admin | Recovery cancelled. Note required. Audit record written. The approved claim stays `APPROVED` as history |
| `OPEN`, `POTENTIAL_MATCH` | `CLOSED` | Reporter or admin | |
| `UNDER_VERIFICATION`, `APPROVED_FOR_RETURN` | `CLOSED` | **Admin only** | Note required |
| `CLOSED` | `OPEN` | **Admin only** | Reopen |
| `RETURNED` | *(none)* | | Final |

LOST reports only ever use `OPEN`, `POTENTIAL_MATCH`, `RETURNED`, `CLOSED`.

### 7.2 Claim transitions

| From | To | Triggered by | Side effects |
|---|---|---|---|
| *(new)* | `PENDING` | Claimant | Found item → `UNDER_VERIFICATION`. Admins and finder notified |
| `PENDING` | `UNDER_REVIEW` | Admin (`START_REVIEW`) | |
| `PENDING`, `UNDER_REVIEW`, `NEEDS_MORE_INFORMATION` | `REJECTED` | Admin (`REJECT`, note required) | Claimant notified. If no active claims remain, item → `OPEN` |
| `UNDER_REVIEW` | `NEEDS_MORE_INFORMATION` | Admin (`REQUEST_INFO`, note required) | Claimant notified |
| `NEEDS_MORE_INFORMATION` | `UNDER_REVIEW` | Claimant (responds) | Admins notified |
| `UNDER_REVIEW` | `APPROVED` | Admin (`APPROVE`) | Item → `APPROVED_FOR_RETURN`. **All other active claims on the item are auto-rejected** with a note and notification |
| `PENDING`, `UNDER_REVIEW`, `NEEDS_MORE_INFORMATION` | `WITHDRAWN` | Claimant | If no active claims remain, item → `OPEN` |
| `APPROVED`, `REJECTED`, `WITHDRAWN` | *(none)* | | Final |

*Active claim* = `PENDING`, `UNDER_REVIEW` or `NEEDS_MORE_INFORMATION`.

### 7.3 Recovery transitions

`PENDING_ARRANGEMENT → SCHEDULED → COMPLETED`, and `PENDING_ARRANGEMENT` or `SCHEDULED → CANCELLED`. `COMPLETED` and `CANCELLED` are final.

---

## 8. Matching design (planned for Stage 10)

**Goal:** an *explainable* score from 0 to 100 that says how alike a LOST and a FOUND report are, and *why*. It is a **hint, never proof of ownership.**

**Step 1: choose candidates (hard rules, not scored).** A report is compared only with reports that are: the opposite type · the **same category** · still active (not closed or returned) · from a **different** reporter · within the date window (the found date is not earlier than one day before the lost date, and the two are within 60 days of each other).

**Step 2: score the pair using public fields only.**

| Signal | Max points | How it is scored |
|---|---|---|
| Category | 20 | Awarded to every candidate (it is a hard rule above) |
| Item name | 20 | Word overlap between the two titles (lower-cased, punctuation and filler words removed): `20 × shared words ÷ words in the shorter title` |
| Description keywords | 15 | The same overlap idea on keywords from title + description: `15 × shared keywords ÷ keywords in the shorter set`, ignoring words shorter than 3 letters |
| Colour | 15 | Same colour 15. If either is `OTHER` or `MULTICOLOUR`, 5. Different colour 0 |
| Brand | 10 | Both given and equal (ignoring case) 10. Otherwise 0 (a missing brand is neutral, never a penalty) |
| Location | 10 | Same zone 6 (not for the `NOT_SURE` zone), plus 4 more when both reports name the same entry of a list (the same hall, church or auditorium; "Not sure which" earns nothing). Different zones 0. A place can **never rule a match out**, because items get moved |
| Date | 10 | Days apart: 0–1 → 10, 2–3 → 7, 4–7 → 4, 8–14 → 2, more → 0 |

**Step 3: bands and thresholds (initial values, tuned at Stage 10 with demo data):**

| Score | What happens |
|---|---|
| below 40 | Not shown |
| 40–54 | `POSSIBLE`: appears in the match list |
| 55–74 | `LIKELY`: also triggers a notification and sets `POTENTIAL_MATCH` |
| 75–100 | `STRONG`: same as likely, highlighted |

**Step 4: explain.** The result includes a `reasons` list built from whichever signals scored (for example "Same colour", "Same general location", "Reported 1 day apart").

**Privacy rule (important).** The user-facing score uses **public fields only**. If private details influenced the score a user could see, a dishonest person could create fake reports and watch the score rise to *guess* a found item's secret identifying details. Similarity between private details and claim evidence is calculated **only for administrators** (`evidenceOverlap`) and is shown as a review aid, never a decision. (D-010)

---

## 9. Key workflows

### 9.1 Claim and recovery

```text
User claims found item  →  Admin reviews (private evidence visible to admin only)
   →  Approve  →  Admin creates recovery record (assigns staff, picks authorised office)
   →  Claimant collects at the office, staff verifies and records the handover
   →  Record COMPLETED  →  Items RETURNED
```

The system never exchanges the claimant's and finder's contact details. The finder hands the item to the authorised office; the claimant collects it from there.

### 9.2 Image upload (Stage 9)

1. The app picks a photo (`expo-image-picker`, with the picker's compression setting on).
2. The app sends it to `POST /uploads/images`.
3. The backend (using `multer`, in memory) rejects anything over 5 MB, checks the **file's first bytes** to confirm JPEG, PNG or WebP, then uploads to Cloudinary into a `findit/` folder using secrets that exist only in the backend's `.env`.
4. The backend returns `{ url, publicId }`. The app includes these in the item or profile request.
5. When saving, the backend checks that every image URL belongs to **our** Cloudinary account, so a client cannot attach arbitrary external URLs.

Known limitation (accepted): a photo uploaded but never attached to a report stays in Cloudinary until cleaned up.

---

## 10. Authentication design

- **Registration/login** → backend verifies the password against a **bcrypt hash** and returns a **JWT** signed with `JWT_SECRET` (default lifetime 7 days, configurable).
- The token contains **only the user's ID**. On *every* request the backend reloads the user, so suspending an account or changing a role takes effect immediately. The cost is one small database read per request, which is fine at this scale.
- **Logout** deletes the token on the device. The backend does not keep a token blacklist, so a stolen, unexpired token would still work until it expires or the account is suspended. This is an accepted limitation, documented in [SECURITY_PLAN.md](SECURITY_PLAN.md).
- **Mobile** stores the token in `expo-secure-store`. **Dashboard** keeps it in `sessionStorage` (cleared when the tab closes). `localStorage` is avoided because it persists longer. This is a known trade-off for browser apps, noted in the security plan.
- Login failures return one generic message and the login route is rate-limited.

**As implemented in Stage 4**
- Files: `models/User.js`; `services/passwordService.js` (bcrypt hashing, plus a dummy hash so that unknown emails cost the same time as wrong passwords), `tokenService.js`, `authService.js`, `userService.js`, `adminSeedService.js`; `middleware/authenticate.js` (verify token, reload user, refuse suspended accounts), `authorize.js` (role check), `validate.js`, `rateLimiters.js`; `validators/` (Zod); `utils/ApiError.js`, `respond.js`, `serializers.js`.
- Services are built from the settings they need (`createServices(config)`), and the app from the config (`createApp(config)`), so tests can use their own isolated configuration.
- Controllers read only `req.valid` (the cleaned, checked input), never the raw `req.body`.
- Checks run in this order on login: rate limit, input shape, find the user, password, and only then the suspension check (so a guesser cannot learn that an account exists or is suspended).
- The first administrator is created by `npm run seed:admin`, which reads the email and password from the owner's private `.env`.

**As implemented in Stage 5 (lost and found reports)**
- Files: `models/Item.js`; `services/itemService.js` (all the rules: who may see, edit or close what), `statusRules.js` (the one table of allowed status changes, with an exhaustive test); `config/campusLocations.js` (the places, in one editable file); `validators/itemValidators.js`; `controllers/itemController.js`, `metaController.js`; `routes/itemRoutes.js`; `toItemCard` and `toItemDetail` in `utils/serializers.js`.
- **Two shapes of every report.** The *card* (lists) and the *detail* (one report) are built by whitelist functions that name every field they send, so a field added to the database later is never sent by accident. The private fields are `select: false` and are loaded by a second query **only** for the reporter or an administrator.
- **Who sees what:** everyone logged in sees the public view; the reporter also sees their private fields; an administrator also sees the reporter's contact details; a `CLOSED` report is a `404` for everyone else. The reporter's id is never sent, only `isMine`.
- **Owner-only edit and close.** Administrator edit and close need an audit record first, so they arrive with the audit log in Stage 12. Until then an administrator gets `403`, like any other non-owner.
- **Route order:** `/items/mine` is registered before `/items/:id` (a test proves it).
- **Photos** are not part of a report yet (Stage 9).

**As implemented in Stage 6 (browse and search)**
- Files: `services/itemSearch.js` (a pure file that turns the request into a database query: escaping, splitting words, the filters, the sort orders; tested without a database), `itemService.browse`, the `listItemsQuery` rules in `validators/itemValidators.js`, and the route `GET /items` (registered before `/items/mine` and `/items/:id`).
- **The query is built in one place** from validated values only, never from raw request data. The public list can see only the statuses `OPEN`, `POTENTIAL_MATCH`, `UNDER_VERIFICATION`, `APPROVED_FOR_RETURN` and (on request) `RETURNED`. As a second safety belt, a status that may not be browsed matches nothing.
- **Search reads public fields only**, so it cannot be used to guess private details. The list returns `toItemCard` cards for everyone, administrators included.

---

## 11. Environment variables (names only; values never go in Git)

**`backend/.env`** (copy from `.env.example`)

| Name | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | Default `4000` |
| `MONGODB_URI` | Atlas connection string (secret) |
| `MONGODB_DB_NAME` | Database name inside the cluster. Default `findit` |
| `MONGODB_TIMEOUT_MS` | How long to wait when connecting to the database. Default `10000`; raise to `30000` on slow or mobile connections |
| `JWT_SECRET` | Long random string, at least 32 characters (secret). Generate with `npm run make:secret` |
| `JWT_EXPIRES_IN` | Default `7d`; at most `30d` |
| `BCRYPT_ROUNDS` | Password hashing strength, 4 to 15. Default 12 (production refuses below 10) |
| `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_LOGIN_FAILURES`, `RATE_LIMIT_REGISTER_MAX` | Optional rate-limit tuning |
| `CORS_ORIGINS` | Comma-separated list of allowed browser origins (the dashboard) |
| `ALLOWED_EMAIL_DOMAINS` | Optional. Comma-separated campus domains. Empty means any |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image storage (secrets) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Used only by `scripts/seedAdmin.js` |

**`mobile-app/.env`:** `EXPO_PUBLIC_API_URL` (public, not a secret).
**`admin-dashboard/.env`:** `VITE_API_URL` (public, not a secret).

---

## 12. Design tokens

Shared by the mobile theme and the dashboard CSS variables, so both look like one product.

| Token | Hex | Use |
|---|---|---|
| `primary` | `#51258A` | Main buttons, headings, key accents |
| `secondary` | `#7652A8` | Secondary accents, icons, secondary buttons |
| `primaryLight` | `#F1EBF8` | Soft backgrounds, selected chips, highlights |
| `background` | `#FAF9FC` | Screen background |
| `surface` | `#FFFFFF` | Cards, inputs, sheets |
| `text` | `#24212A` | Body text |
| `muted` | `#706B78` | Secondary text |
| `success` | `#258653` | Success fills, icons |
| `warning` | `#D89527` | Warning **fills** only (never as text colour) |
| `error` | `#C74747` | Error fills, icons, error text on white |

**Additional tokens (not in the brief; added for accessibility, derived from measured contrast):**

| Token | Hex | Why it is needed |
|---|---|---|
| `inputBorder` | `#8F899A` | Form-field outlines must reach 3:1 against white (measured 3.38:1) |
| `successTint` / `successText` | `#E4F3EB` / `#1F6F45` | Badge background and its text. The brand green on this tint is only 3.97:1, the darker text is 5.36:1 |
| `errorTint` / `errorText` | `#FBEAEA` / `#B03B3B` | The brand red on this tint is only 4.09:1, the darker text is 5.11:1 |
| `warningTint` | `#FBF0DA` | Badge background. Use `text` colour on it (14.0:1) |
| `neutralTint` | `#ECEAF0` | "Closed" or neutral badges. Use `text` colour on it |

**Measured contrast of the brand colours (WCAG ratio; 4.5:1 is the target for normal text, 3:1 for large text and interface outlines):**

| Pair | Ratio | Verdict |
|---|---|---|
| White on `primary` | 10.60 | Pass |
| `primary` on `background` | 10.10 | Pass |
| `primary` on `primaryLight` | 9.07 | Pass |
| White on `secondary` | 5.93 | Pass |
| `text` on `background` | 15.10 | Pass |
| `muted` on white / on `background` | 5.17 / 4.93 | Pass |
| `muted` on `primaryLight` | 4.42 | **Fails for small text. Use `text` on `primaryLight` backgrounds** |
| White on `success` / on `error` | 4.55 / 4.75 | Pass |
| `warning` as text on white | 2.55 | **Fails. Warning is a fill only** |
| `text` on `warning` | 6.22 | Pass |

**Status colours (design intent):** `OPEN` → `primaryLight` + `primary` text · `POTENTIAL_MATCH` → `warningTint` + `text` · `UNDER_VERIFICATION` / `UNDER_REVIEW` / `PENDING` → `primaryLight` + `primary` text · `NEEDS_MORE_INFORMATION` → `warningTint` + `text` · `APPROVED_FOR_RETURN` / `APPROVED` → `successTint` + `successText` · `RETURNED` → `success` + white · `REJECTED` → `errorTint` + `errorText` · `CLOSED` / `WITHDRAWN` → `neutralTint` + `text`.

**Style rules:** the page background stays `background` and cards are white, so the product is *not* everything purple. Purple is the accent. Rounded cards (about 12–16 px), generous spacing, one type scale, one button style per importance level, minimum 44 × 44 touch targets on mobile, visible focus outlines, and a confirmation dialog before anything irreversible.

---

## 13. Free hosting plan

| Piece | Development / demo | Optional online hosting (decided at Stage 17) |
|---|---|---|
| Database | MongoDB Atlas free (M0) | Same |
| Images | Cloudinary free plan | Same |
| Backend | Laptop | A free web-service tier (sleeps when idle) |
| Dashboard | Vite dev server | A free static host |
| Mobile app | Expo Go | Expo Go (no store publishing needed) |

For the **final demonstration** the safest plan is everything running on your laptop plus Atlas and Cloudinary. It has no cold-start delays and no dependence on a free tier's mood. Online hosting is an optional extra.
