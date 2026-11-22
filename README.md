# FINDIT

**Smart Campus Lost & Found Management System.** *Find. Report. Reclaim.*

FINDIT is a connected system that helps campus users report lost and found items, discover likely matches, prove ownership through an administrator-verified claim, and recover property through an authorised handover. It has three parts that all share one REST API:

| Part | Technology | State |
|---|---|---|
| **Backend API** | Node.js, Express, MongoDB, JWT | Foundation only (see below) |
| **Mobile app** | React Native, Expo Go | Not started (Stage 7) |
| **Admin dashboard** | React, Vite | Not started (Stage 12) |

## Current status

**Stage 2 of 20: repository and environment setup.**

What exists and is tested:
- The backend starts, and answers `GET /api/v1/health`.
- Unknown URLs and malformed requests get clean, standard JSON error replies.
- The settings loader refuses to start on bad settings.
- 20 automated tests pass.

Everything else (database, accounts, items, claims, the apps) is **planned, not built**. The honest, always-current record is [documentation/IMPLEMENTATION_STATUS.md](documentation/IMPLEMENTATION_STATUS.md).

## Repository layout

```text
FINDIT/
├── backend/          Node + Express API (started in Stage 2)
├── documentation/    Requirements, architecture, API contract, security plan, test plan...
├── README.md
└── .gitignore
```

`mobile-app/` and `admin-dashboard/` are added in Stages 7 and 12, created by their own tools (Expo and Vite).

## Run the backend

You need **Node.js 22** and **Git** (see [documentation/SETUP_GUIDE.md](documentation/SETUP_GUIDE.md)).

```bash
cd backend
npm install
npm run dev
```

Then open <http://localhost:4000/api/v1/health> in a browser. You should see:

```json
{"success":true,"data":{"status":"ok","uptimeSeconds":3,"time":"2026-01-01T12:00:00.000Z"}}
```

Run the tests with `npm test` (inside `backend/`).

## Documentation

Start at [documentation/README.md](documentation/README.md).

## Security reminder

Never commit `.env` files, passwords, keys, real personal data or private claim evidence. The `.gitignore` is set up to help, but it is not a substitute for care. See [documentation/SECURITY_PLAN.md](documentation/SECURITY_PLAN.md).
