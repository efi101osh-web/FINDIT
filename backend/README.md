# FINDIT Backend

The REST API for FINDIT (Node.js + Express + MongoDB). Design: [../documentation/ARCHITECTURE.md](../documentation/ARCHITECTURE.md). Endpoints: [../documentation/API_CONTRACT.md](../documentation/API_CONTRACT.md). Step-by-step setup: [../documentation/SETUP_GUIDE.md](../documentation/SETUP_GUIDE.md).

## Requirements

- Node.js 22 or 24 (LTS) and npm. Check with `node --version`.
- A free MongoDB Atlas database (the setup guide, Part 3, walks you through it).

## Setup and run

```bash
npm ci                      # download the exact library versions (first time, and after pulling changes)
cp .env.example .env        # on Windows: copy .env.example .env  -- then put your MONGODB_URI in it
npm run check:db            # checks your database connection (read-only)
npm run dev                 # start with auto-restart when you save a file
```

| Command | What it does |
|---|---|
| `npm start` | Start the server once, without auto-restart |
| `npm run dev` | Start and automatically restart when files change |
| `npm test` | Run the automated tests. The tests that need a real database are **skipped** (and reported as skipped) |
| `npm run test:db` | Run **all** tests, using a throwaway MongoDB on your machine. The first run downloads it (about 120 MB on Linux, 500 to 800 MB on Windows). Never touches Atlas |
| `npm run check:db` | Connect to the database in your `.env`, read its version, disconnect. Never prints the password |
| `npm run make:secret` | Print a strong random key to use as `JWT_SECRET` |
| `npm run seed:admin` | Create the first administrator from `SEED_ADMIN_*` in your `.env` (safe to repeat; never changes an existing password) |

Stop the server with **Ctrl+C**.

## Settings (`.env`)

`.env` is **private and never committed**. Copy `.env.example` and edit.

| Name | Default | Meaning |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | Port the API listens on |
| `MONGODB_URI` | *(required)* | Atlas connection string. **A secret** (it contains the database password) |
| `MONGODB_DB_NAME` | `findit` | Database name inside the cluster |
| `MONGODB_TIMEOUT_MS` | `10000` | How long to wait when connecting to the database (milliseconds). Try `30000` on a slow or mobile connection |
| `CORS_ORIGINS` | `http://localhost:5173` | Websites allowed to call the API from a browser (comma-separated, no `*`) |
| `JWT_SECRET` | *(required)* | Key that signs login tokens. **A secret.** At least 32 characters; make one with `npm run make:secret` |
| `JWT_EXPIRES_IN` | `7d` | How long a login lasts (`15m`, `12h`, `7d`; at most `30d`) |
| `BCRYPT_ROUNDS` | `12` | Password hashing strength, 4 to 15 (never below 10 in production) |
| `ALLOWED_EMAIL_DOMAINS` | *(any)* | Optional: only these email domains may sign up |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | | Used **only** by `npm run seed:admin`. Delete the password line afterwards |
| `RATE_LIMIT_GLOBAL_MAX`, `RATE_LIMIT_LOGIN_FAILURES`, `RATE_LIMIT_REGISTER_MAX` | `600`, `10`, `20` | Optional rate-limit tuning |

## What exists now

| Method | URL | Notes |
|---|---|---|
| GET | `/api/v1/health` | Server alive, and whether the database is `connected` |
| POST | `/api/v1/auth/register` | Create a regular-user account; returns the user and a login token |
| POST | `/api/v1/auth/login` | Log in; returns the user and a login token |
| GET | `/api/v1/auth/me` | The logged-in user (checks that a stored token is still valid) |
| GET | `/api/v1/users/me` | The logged-in user's profile |
| PATCH | `/api/v1/users/me` | Change your name, phone number or contact preference |
| PATCH | `/api/v1/users/me/password` | Change your password |
| GET | `/api/v1/meta/options` | The allowed values for dropdowns, including the campus places (no login needed) |
| POST | `/api/v1/items` | Report a lost or found item |
| GET | `/api/v1/items` | Browse and search everyone's active reports (public cards only; filters, sorting, paging) |
| GET | `/api/v1/items/mine` | My own reports (newest first, paged) |
| GET | `/api/v1/items/:id` | One report. Private fields only for its reporter and administrators |
| PATCH | `/api/v1/items/:id` | Edit my report (only while it is open) |
| PATCH | `/api/v1/items/:id/close` | Close my report |

## Folder map

```text
src/
├── config/        env.js (validates settings), db.js (MongoDB connection), constants.js, campusLocations.js (the campus places)
├── controllers/   Receive a request, send a response
├── middleware/    authenticate, authorize, validate, rateLimiters, cors, notFound, errorHandler
├── models/        Database schemas (User, Item)
├── routes/        Which URL goes to which controller
├── services/      Business logic: passwords, tokens, sign-up and login, profile, first-admin seeding, lost and found reports, browse and search, status rules
├── validators/    Input rules (Zod; unknown fields are refused)
├── utils/         ApiError, respond, serializers
├── app.js         createApp(config): builds the Express app (does not listen)
└── server.js      Settings -> database -> web server -> clean shutdown
scripts/           checkDatabase.js, testWithDatabase.js, generateSecret.js, seedAdmin.js
tests/             Automated tests (Jest + Supertest); setup/ and helpers/ support them
```

Folders containing only a `.gitkeep` file are intentionally empty until their stage.

## Testing notes

- Tests build the app from explicit settings and **never read your `.env`**, so they cannot touch your real database.
- Tests that need MongoDB use `describeWithDatabase` and `tests/helpers/database.js`. Use that helper for any new test that connects (it works around a MongoDB-driver problem under Jest; see `documentation/DECISIONS.md` D-026).
