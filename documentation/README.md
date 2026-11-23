# FINDIT Documentation

**Smart Campus Lost & Found Management System.** *Find. Report. Reclaim.*

Start with [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md). To see what is actually built and tested, read [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## The documents

| Document | What it is | State |
|---|---|---|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | What FINDIT is, who uses it, the trust model, the stack, cost, glossary | Complete (Stage 1) |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Numbered functional and non-functional requirements, and the roles and permissions matrix | Complete (Stage 1) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, folder structure, request flow, status flows, matching, design tokens | Design (Stage 1) |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Collections, fields, validation, indexes, relationships | Design (Stage 1) |
| [API_CONTRACT.md](API_CONTRACT.md) | All 37 planned endpoints with requests, responses, errors, examples | 7 of 37 endpoints implemented (health, sign-up, login, profile) |
| [SECURITY_PLAN.md](SECURITY_PLAN.md) | Threats, the 27 controls, accepted risks, rules for the repository | Plan. Nine controls implemented, seven partly started |
| [DECISIONS.md](DECISIONS.md) | Why each technical choice was made | Living |
| [TEST_PLAN.md](TEST_PLAN.md) | Test strategy, test cases, checklists, the end-to-end script | Plan. 200 automated tests so far (see results log) |
| [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) | What exists and what is verified | Living |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | How to set up and run the project | Partial (laptop setup, database, first administrator, Postman) |
| [USER_GUIDE.md](USER_GUIDE.md) | How to use the finished app | Outline only (written in Stage 19) |
| [TEAM_RESPONSIBILITIES.md](TEAM_RESPONSIBILITIES.md) | Who does what (non-coding roles for the team) | Draft. Names needed |
| [postman/](postman/) | Postman collection for trying the API by clicking (11 requests with built-in checks) | Living (extended each stage) |
| [diagrams/](diagrams/) | Mermaid diagrams (GitHub draws them automatically) | Complete (Stage 1) |

## Documentation rules

1. **Never describe an unbuilt feature as done.** Design documents say *planned*. Only `IMPLEMENTATION_STATUS.md` records completion.
2. **Update in the same change.** When code changes behaviour, the affected documents change in that same commit.
3. **One home for each fact.** Status lives in `IMPLEMENTATION_STATUS.md`, the API in `API_CONTRACT.md`, fields in `DATABASE_SCHEMA.md`, status rules in `ARCHITECTURE.md`. Other files link to them instead of copying.
4. **No secrets, no real personal data**, including in screenshots and examples.

## When each document is updated

| Stage | Documents touched |
|---|---|
| Every stage | `IMPLEMENTATION_STATUS.md`, `DECISIONS.md` (when a decision is made) |
| 2–3 | `SETUP_GUIDE.md`, `ARCHITECTURE.md` (if reality differs from the plan) |
| 4–15 | `API_CONTRACT.md`, `DATABASE_SCHEMA.md`, `TEST_PLAN.md` (results) |
| 16 | `SECURITY_PLAN.md` (real status of every control) |
| 17–18 | `TEST_PLAN.md` (defect log) |
| 19 | `USER_GUIDE.md`, `SETUP_GUIDE.md` final, all documents proofread |
