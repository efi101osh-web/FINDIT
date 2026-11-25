# FINDIT

**Smart Campus Lost & Found Management System.** *Find. Report. Reclaim.*

FINDIT is a connected system that helps campus users report lost and found items, discover likely matches, prove ownership through an administrator-verified claim, and recover property through an authorised handover. It has three parts that all share one REST API:

| Part | Technology | State |
|---|---|---|
| **Backend API** | Node.js, Express, MongoDB, JWT | Foundation, database, accounts and login, lost and found reporting, and browse and search (see below) |
| **Mobile app** | React Native, Expo Go | Not started (Stage 7) |
| **Admin dashboard** | React, Vite | Not started (Stage 12) |

## Current status

**Stages 1 to 6 of 20 are complete and verified. Next is Stage 7, the mobile app.**

What exists and is tested:
- The backend connects to MongoDB and answers `GET /api/v1/health` (including whether the database is connected).
- Security headers and a CORS allow-list are in place.
- Unknown URLs and malformed requests get clean, standard JSON error replies.
- Bad settings and database problems stop the server with a plain-English explanation, never showing the password.
- 425 automated tests pass (156 of them need a real database; see the setup guide).
- The connection to a real **MongoDB Atlas** cluster has been verified from the owner's laptop.
- **Accounts and login (Stage 4):** sign-up, login, profile and password change; login tokens; roles (nobody can make themselves an administrator); a safe script for the first administrator; password-guessing protection. A Postman collection in `documentation/postman` lets you try it by clicking.
- **Lost and found reports (Stage 5):** report a lost or found item (the campus place is chosen as a zone plus a detail, such as which hall); see your own reports; edit and close them. Private details are visible only to the reporter and to administrators.
- **Browse and search (Stage 6):** a public list of everyone's active reports with keyword search (partial words work), filters, sorting and paging. Closed reports and private details never appear, and search text is treated as plain text, never as a pattern.

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
