# FINDIT Backend

The REST API for FINDIT (Node.js + Express + MongoDB). Design: [../documentation/ARCHITECTURE.md](../documentation/ARCHITECTURE.md). Endpoints: [../documentation/API_CONTRACT.md](../documentation/API_CONTRACT.md). Step-by-step setup: [../documentation/SETUP_GUIDE.md](../documentation/SETUP_GUIDE.md).

## Requirements

- Node.js 22 or 24 (LTS) and npm. Check with `node --version`.
- A free MongoDB Atlas database (the setup guide, Part 3, walks you through it).

## Setup and run

```bash
npm install                 # download the libraries (first time, and after pulling changes)
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

Stop the server with **Ctrl+C**.

## Settings (`.env`)

`.env` is **private and never committed**. Copy `.env.example` and edit.

| Name | Default | Meaning |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | Port the API listens on |
| `MONGODB_URI` | *(required)* | Atlas connection string. **A secret** (it contains the database password) |
| `MONGODB_DB_NAME` | `findit` | Database name inside the cluster |
| `CORS_ORIGINS` | `http://localhost:5173` | Websites allowed to call the API from a browser (comma-separated, no `*`) |

## What exists now

| Method | URL | Notes |
|---|---|---|
| GET | `/api/v1/health` | Server alive, and whether the database is `connected` |

## Folder map

```text
src/
├── config/        env.js (validates settings), db.js (MongoDB connection and error explanations)
├── controllers/   Receive a request, send a response
├── middleware/    cors, notFound, errorHandler (more in later stages)
├── models/        Database schemas (Stage 4 onwards)
├── routes/        Which URL goes to which controller
├── services/      Business logic (Stage 4 onwards)
├── validators/    Input rules (Stage 4 onwards)
├── utils/         Small helpers
├── app.js         createApp(config): builds the Express app (does not listen)
└── server.js      Settings -> database -> web server -> clean shutdown
scripts/           checkDatabase.js, testWithDatabase.js
tests/             Automated tests (Jest + Supertest); setup/ and helpers/ support them
```

Folders containing only a `.gitkeep` file are intentionally empty until their stage.

## Testing notes

- Tests build the app from explicit settings and **never read your `.env`**, so they cannot touch your real database.
- Tests that need MongoDB use `describeWithDatabase` and `tests/helpers/database.js`. Use that helper for any new test that connects (it works around a MongoDB-driver problem under Jest; see `documentation/DECISIONS.md` D-026).
