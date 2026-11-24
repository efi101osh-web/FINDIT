# FINDIT

**Smart Campus Lost & Found Management System.** *Find. Report. Reclaim.*

FINDIT is a connected system that helps campus users report lost and found items, discover likely matches, prove ownership through an administrator-verified claim, and recover property through an authorised handover. It has three parts that all share one REST API:

| Part | Technology | State |
|---|---|---|
| **Backend API** | Node.js, Express, MongoDB, JWT | Foundation + database connection (see below) |
| **Mobile app** | React Native, Expo Go | Not started (Stage 7) |
| **Admin dashboard** | React, Vite | Not started (Stage 12) |

## Current status

**Stages 1 to 3 of 20 are complete and verified. Stage 4 (accounts and login) is built and tested; the check on the owner's laptop is pending.**

What exists and is tested:
- The backend connects to MongoDB and answers `GET /api/v1/health` (including whether the database is connected).
- Security headers and a CORS allow-list are in place.
- Unknown URLs and malformed requests get clean, standard JSON error replies.
- Bad settings and database problems stop the server with a plain-English explanation, never showing the password.
- 210 automated tests pass (60 of them need a real database; see the setup guide).
- The connection to a real **MongoDB Atlas** cluster has been verified from the owner's laptop.
- **Accounts and login (Stage 4):** sign-up, login, profile and password change; login tokens; roles (nobody can make themselves an administrator); a safe script for the first administrator; password-guessing protection. A Postman collection in `documentation/postman` lets you try it by clicking.

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

You need **Node.js 22 or 24**, **Git** and a free **MongoDB Atlas** database. Follow [documentation/SETUP_GUIDE.md](documentation/SETUP_GUIDE.md): Part 2 installs and tests the backend, Part 3 creates the database and runs the server.

In short, once the database is set up (inside `backend/`):

```bash
npm ci
npm run check:db
npm run dev
```

Then open <http://localhost:4000/api/v1/health>. You should see `"database":"connected"`. Part 4 of the guide creates your first administrator, and Part 5 tries the API with Postman.

Run the tests with `npm test`.

## Documentation

Start at [documentation/README.md](documentation/README.md).

## Security reminder

Never commit `.env` files, passwords, keys, real personal data or private claim evidence. The `.gitignore` is set up to help, but it is not a substitute for care. See [documentation/SECURITY_PLAN.md](documentation/SECURITY_PLAN.md).
