# FINDIT Backend

The REST API for FINDIT (Node.js + Express). Design: [../documentation/ARCHITECTURE.md](../documentation/ARCHITECTURE.md). Endpoints: [../documentation/API_CONTRACT.md](../documentation/API_CONTRACT.md).

## Requirements

Node.js 22 or 24 (LTS) and npm. Check with `node --version`.

## Setup and run

```bash
npm install                 # download the libraries (first time, and after pulling changes)
cp .env.example .env        # optional for now; on Windows: copy .env.example .env
npm run dev                 # start with auto-restart when you save a file
```

Other commands:

| Command | What it does |
|---|---|
| `npm start` | Start the server once, without auto-restart |
| `npm run dev` | Start and automatically restart when files change |
| `npm test` | Run the automated tests |

The server prints the health-check address when it is ready. Stop it with **Ctrl+C**.

## Settings (`.env`)

| Name | Default | Meaning |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4000` | Port the API listens on |

More settings (database, secrets) are added in later stages and documented in `.env.example`. **`.env` is private and never committed.**

## What exists now

| Method | URL | Notes |
|---|---|---|
| GET | `/api/v1/health` | Says the server is alive. The `database` field arrives in Stage 3 |

## Folder map

```text
src/
├── config/        Settings (env.js)
├── controllers/   Receive a request, send a response
├── middleware/    notFound, errorHandler (more in later stages)
├── models/        Database schemas (Stage 3 onwards)
├── routes/        Which URL goes to which controller
├── services/      Business logic (Stage 3 onwards)
├── validators/    Input rules (Stage 4 onwards)
├── utils/         Small helpers
├── app.js         Builds the Express app (does not listen)
└── server.js      Starts listening
scripts/           One-off tools (create first admin, demo data)
tests/             Automated tests (Jest + Supertest)
```

Folders containing only a `.gitkeep` file are intentionally empty until their stage.
