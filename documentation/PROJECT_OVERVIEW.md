# FINDIT: Project Overview

**Smart Campus Lost & Found Management System**
*Find. Report. Reclaim.*

> **Status:** Stage 1 blueprint. This document describes what FINDIT *will be*. What is actually built and tested is tracked only in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

---

## 1. What FINDIT is

FINDIT is one connected system that helps people on a campus get lost belongings back:

1. A person who **lost** something reports it.
2. A person who **found** something reports it.
3. FINDIT compares the two kinds of report and **suggests likely matches**.
4. The owner submits a **claim** with private proof (details only the real owner would know).
5. An **administrator verifies** the claim.
6. The item is handed over at an **authorised office**, and the handover is **recorded**.

## 2. The problem it solves

Lost-and-found on a campus is usually a noticeboard, a WhatsApp group, or a box at a security desk. Items are hard to search, nobody can tell whether a claimant is the real owner, and there is no record of who received what. FINDIT replaces that with one searchable system with a verification step and an audit trail.

## 3. Objectives

- Let campus users report, browse, search and track lost and found items from a phone.
- Suggest likely matches automatically, with a plain explanation of *why*.
- Make sure property is only released to a verified owner, through an authorised person.
- Give administrators a dashboard to review claims, manage users, record handovers and see real statistics.
- Protect personal and identifying information at every step.

## 4. Who uses it

| Role | Who they are | Main use |
|---|---|---|
| **Regular user** | Student or staff member | Reports items, searches, submits claims, tracks their own reports and claims |
| **Administrator** | Designated campus staff | Reviews claims, manages users and reports, records handovers, views analytics |
| **Recovery officer** | Staff at an authorised collection office | Handles *assigned* handovers and records them. Sees nothing else |

## 5. The three parts (and how they connect)

```text
 Phone (React Native + Expo Go) ──┐
                                   ├──►  Backend REST API (Node + Express) ──►  MongoDB database
 Admin website (React + Vite)  ───┘                    │
                                                       └──►  Cloudinary (photos)
```

- The **mobile app** is for everyday users.
- The **admin dashboard** is a website for staff, designed for a laptop screen.
- The **backend** is the only thing that reads or writes the database. Both apps ask it for everything. That means the rules (who is allowed to do what) are enforced **in one place**, and nobody can bypass them by editing the app.

See the diagram: [diagrams/system-architecture.md](diagrams/system-architecture.md).

## 6. Trust and safety model (the "rules of the game")

These are design rules that every feature must respect:

1. **No public contact details.** Users never see each other's email or phone. All contact goes through the system or through staff.
2. **No private meet-ups.** FINDIT never arranges for two strangers to swap property. Found items go to an **authorised office**, and the owner collects them there after approval.
3. **Private evidence stays private.** Claim evidence and "identifying details" are visible only to the person who wrote them and to administrators. They are never part of a public response.
4. **A match score is a hint, never proof.** Ownership is decided by a human administrator reviewing evidence.
5. **Permissions live on the server.** Hiding a button in the app is cosmetic. The backend refuses forbidden actions regardless of what the app shows.
6. **Everything important leaves a trace.** Administrative actions are written to an audit log.

## 7. Technology stack

| Part | Technology |
|---|---|
| Mobile | React Native, Expo Go, JavaScript, React Navigation, Context API |
| Backend | Node.js, Express, JavaScript, REST, JWT, bcrypt (via `bcryptjs`, see [DECISIONS.md](DECISIONS.md) D-006), Mongoose |
| Database | MongoDB (MongoDB Atlas free tier) |
| Admin dashboard | React, JavaScript, plain CSS, Vite, Chart.js |
| Images | Cloudinary (free plan), uploaded through the backend |
| Tools | VS Code, Git, GitHub, Postman, Markdown, Mermaid |

The stack is fixed by the project brief. Changes need your explicit approval.

## 8. Cost: everything is free

| Need | Free option | Notes |
|---|---|---|
| Database | MongoDB Atlas **M0** free cluster | Small (about 512 MB). Plenty for a campus demo. Verify limits when signing up |
| Image storage | Cloudinary **free plan** | Verify the current free allowance when signing up |
| Backend (development and demo) | **Your laptop** | Free, and required anyway so your phone can reach it over Wi-Fi |
| Backend (optional online hosting) | A free web-service tier (e.g. Render) | Free tiers usually "sleep" when idle, so the first request after a pause is slow. Decided at Stage 17 |
| Admin dashboard (optional online hosting) | A free static host (Netlify, Vercel or Cloudflare Pages) | Decided at Stage 17 |
| Mobile app | **Expo Go** (free) | No app-store account needed |
| Code hosting | GitHub (free) | |

Free-tier limits change over time. They will be re-checked when each account is created. No paid service is required for the core system.

## 9. Plain-English glossary

| Term | Meaning |
|---|---|
| **API** | The set of web addresses the backend answers. The apps "call the API" to get or save data |
| **REST** | A convention: each kind of thing (items, claims) has its own address, and HTTP verbs (GET, POST, PATCH) say what to do |
| **Endpoint** | One specific address plus verb, e.g. `POST /api/v1/items` |
| **JSON** | The text format apps and backend use to exchange data |
| **JWT** | A signed "ticket" the backend gives you when you log in. Your app shows it with every request to prove who you are |
| **Hashing (bcrypt)** | One-way scrambling of passwords. The database never stores real passwords |
| **Middleware** | A checkpoint a request passes through before reaching the real code (is the user logged in? are they an admin? is the data valid?) |
| **Model / Schema** | The definition of what a database record looks like |
| **Mongoose** | The library that lets Node code work with MongoDB records as JavaScript objects |
| **Authentication** | Proving *who you are* (logging in) |
| **Authorisation** | Deciding *what you may do* (roles and ownership) |
| **Validation** | Rejecting bad or malicious input before it reaches the database |
| **Rate limiting** | Slowing down anyone who makes too many requests, e.g. password guessing |
| **Environment variable** | A secret or setting kept in a `.env` file on your machine, never in Git |

## 10. Where to find things

See [README.md](README.md) in this folder for an index of every document and when it is updated.
