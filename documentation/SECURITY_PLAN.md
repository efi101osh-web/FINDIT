# FINDIT: Security Plan

> **Status: PLAN. Two controls are implemented and tested (S-15, S-16). Three are partly started (marked `Partial`). The rest are `Planned`.** Every control starts as `Planned`. A control is changed to `Implemented` only after it exists in code **and** has a passing test or documented manual check, and the change is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). We never describe a control as present before that.

## 1. What we are protecting

| Asset | Why it matters |
|---|---|
| Accounts and passwords | Account takeover, impersonation |
| Claim evidence, private details, storage locations | If leaked, a stranger can falsely claim property |
| Personal data (names, emails, phone numbers) | Privacy |
| Integrity of decisions | Only an authorised administrator may approve a claim and release property |
| Secrets (database string, JWT secret, Cloudinary keys) | Full compromise if leaked |
| Availability | Abuse should not take the system down |

**Realistic threats:** a dishonest person trying to claim someone else's item · a curious user trying to see others' private data · a user trying to gain admin rights · password guessing · malformed or malicious input · spam and floods · accidentally committing secrets to GitHub.

## 2. Control checklist

| # | Control | Threat it addresses | How | Stage | Status |
|---|---|---|---|---|---|
| S-01 | Password hashing | Stolen database exposes passwords | bcrypt (`bcryptjs`), cost factor 12, never log or return hashes | 4 | Planned |
| S-02 | Password policy | Weak passwords; bcrypt's 72-byte limit | 8–72 characters, a letter and a number | 4 | Planned |
| S-03 | JWT authentication | Anonymous access | Signed token; secret from `.env` (at least 32 random bytes); expiry set | 4 | Planned |
| S-04 | Fresh user lookup per request | A suspended or demoted user keeps access | Token holds only the user ID; user reloaded each request | 4 | Planned |
| S-05 | Role-based authorisation | Privilege escalation | `authorize(...roles)` middleware on every protected route | 4, 12 | Planned |
| S-06 | Ownership checks | Reading or changing someone else's data | Checked in services (own item, own claim, own notification, assigned recovery) | 5, 11, 13, 14 | Planned |
| S-07 | No role in public registration | Self-made admin | Role is never read from the request. Strict schema rejects it. Admins come from seed script or an admin promoting a user | 4 | Planned |
| S-08 | Strict input validation | Bad data, injection | Zod schemas on body, query and params. Unknown fields rejected. Length and enum limits | 4 on | Planned |
| S-09 | NoSQL-injection resistance | Operators like `{"$gt": ""}` smuggled into queries | Validation only allows plain strings and known types. Queries are built from validated values, never from raw `req.body`/`req.query` | 4 on | Planned |
| S-10 | Safe keyword search | Regex injection and slow patterns | User search text is **escaped** before use in a regex; length limited to 60 | 6 | Planned |
| S-11 | Private fields never public | Data leaks | `select: false` on private fields **plus** whitelist serializers. Tests assert private fields are absent from public responses | 5, 11 | Planned |
| S-12 | Mass-assignment protection | Client sets `status`, `reporterId`, etc. | Update schemas whitelist editable fields. Status only changes via `statusRules.js` | 5 | Planned |
| S-13 | Status state machine | Illegal workflow jumps (e.g. skipping verification) | Single file of allowed transitions; others return 409 | 5, 11 | Planned |
| S-14 | Rate limiting | Password guessing, spam, floods | Limits in [API_CONTRACT.md](API_CONTRACT.md#16-initial-rate-limits-tunable) | 4 on | Planned |
| S-15 | Security headers | Common browser attacks | Helmet | 3 | Implemented (Stage 3) |
| S-16 | CORS allow-list | Other websites calling the API from a browser | Only origins listed in `CORS_ORIGINS` | 3 | Implemented (Stage 3) |
| S-17 | Request size limits | Memory exhaustion | JSON body limit; upload 5 MB; `limit` max 50 | 3, 9 | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-18 | Image validation | Malicious or oversized uploads | Size cap, **magic-byte** type check, upload through backend, only our Cloudinary URLs accepted | 9 | Planned |
| S-19 | Secrets management | Leaked keys | `.env` only, in `.gitignore`. `.env.example` has fake values. App fails to start if a required secret is missing. Secret scan before each push | 2 on | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-20 | Safe error handling | Information leaks | One error handler. Clients get a code and message, never a stack trace or query | 3 | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-21 | Audit records | Unaccountable staff actions | Append-only log of admin actions, including each viewing of private evidence | 12–16 | Planned |
| S-22 | Conflict-of-interest rule | Staff approving their own claims | Staff accounts cannot submit claims | 11 | Planned |
| S-23 | Account suspension | Abusive users | `accountStatus`, checked on login and on every request | 4, 12 | Planned |
| S-24 | Generic login errors | Account enumeration at login | Same message and a similar response time for unknown email and wrong password | 4 | Planned |
| S-25 | Dependency hygiene | Vulnerable packages | `npm audit` reviewed at Stage 16 and before the demo; lock files committed | 16 | Planned |
| S-26 | No personal data in logs | Privacy | Logs record request IDs and outcomes, never passwords, tokens, evidence or contact details | 3 on | Planned |
| S-27 | Dashboard hardening | XSS in the web dashboard | React escapes output by default; no raw HTML injection; `sessionStorage` for the token | 12 | Planned |

## 3. OWASP API Security Top 10 (2023): coverage map

| OWASP risk | Where FINDIT addresses it |
|---|---|
| API1 Broken Object Level Authorization | S-06, S-11, 404 for others' private records |
| API2 Broken Authentication | S-01 to S-04, S-14, S-24 |
| API3 Broken Object Property Level Authorization | S-08, S-11, S-12 |
| API4 Unrestricted Resource Consumption | S-14, S-17, pagination limits |
| API5 Broken Function Level Authorization | S-05, S-07 |
| API6 Unrestricted Access to Sensitive Business Flows | Claim rate limit, one active claim per item, S-13, S-21 |
| API7 Server-Side Request Forgery | The backend never fetches client-supplied URLs. Image URLs are only compared against our Cloudinary account (S-18) |
| API8 Security Misconfiguration | S-15, S-16, S-19, S-20 |
| API9 Improper Inventory Management | One versioned API (`/api/v1`) documented in [API_CONTRACT.md](API_CONTRACT.md) |
| API10 Unsafe Consumption of APIs | The only third-party API is Cloudinary, called with fixed parameters and validated responses |

## 4. Accepted risks and known limitations

These are deliberate trade-offs. They will be repeated honestly in the final documentation:

1. **No server-side token revocation.** Logout deletes the token on the device only. A stolen token works until it expires or the account is suspended. *(Mitigations: 7-day expiry, S-04 suspension takes effect immediately. A refresh-token design is a future improvement.)*
2. **Dashboard token in `sessionStorage`** is readable by any script running on the page. Mitigated by S-27, but it is not as strong as `httpOnly` cookies, which add their own complexity.
3. **Account-existence leak at registration.** "Email already registered" tells an attacker an email has an account. Accepted for usability at campus scale; login does not leak.
4. **Found-item photos.** A photo can show identifying marks. The report form warns finders to keep identifying details in the *private* field. Administrators can edit a report's images.
5. **`handedToOffice` is self-declared** by the finder until staff confirm or correct it.
6. **Orphan uploads.** Photos uploaded but never attached remain in Cloudinary until cleaned up.
7. **No email verification, no two-factor authentication, no email password-reset** in the first version. These are outside the brief.
8. **Free-tier infrastructure** has no uptime guarantee and limited capacity.
9. **Evidence retention** is not automated. A retention policy is decided in Stage 16.

## 5. Rules for working on this project

- **Never commit:** `.env` files, `node_modules`, passwords, tokens, API keys, database dumps, private claim evidence, real personal data, or screenshots showing any of these.
- Test and demo data is **fake**. Seed passwords come from `.env`, never from source code.
- If a secret is ever committed by accident: **treat it as compromised, rotate it immediately** (change the password/key at the provider), then clean the history. Deleting the file in a later commit is not enough because Git remembers.
- Before each push in later stages, a quick secret scan is run (`git diff --cached` review plus a scanning tool).

## 6. Stage 16 security review checklist

At Stage 16 every row above is re-verified against the real code, and this file is updated to the real status (Implemented / Partially / Not done) with evidence. A final review will also try the common abuse cases by hand: calling admin routes as a user, reading another user's claim by ID, editing another user's report, sending a `role` field at registration, oversized and fake-extension uploads, and rapid repeated logins.
