# FINDIT: Security Plan

> **Status: 10 controls are implemented and tested (S-01 to S-04, S-07, S-10, S-14, S-15, S-16, S-24). 11 are partly started (marked `Partial`: S-05, S-06, S-08, S-09, S-11, S-12, S-13, S-17, S-19, S-20, S-23). The rest are `Planned`.** The Stage 5 controls were tested in the cloud container, and the Postman refusals were tried on the owner's laptop against Atlas (owner-reported). Every control starts as `Planned`. A control is changed to `Implemented` only after it exists in code **and** has a passing test or documented manual check, and the change is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). We never describe a control as present before that.

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
| S-01 | Password hashing | Stolen database exposes passwords | bcrypt (`bcryptjs`), cost factor 12, never log or return hashes | 4 | Implemented (Stage 4) |
| S-02 | Password policy | Weak passwords; bcrypt's 72-byte limit | 8–72 characters, a letter and a number | 4 | Implemented (Stage 4) |
| S-03 | JWT authentication | Anonymous access | Signed token; secret from `.env` (at least 32 random bytes); expiry set | 4 | Implemented (Stage 4) |
| S-04 | Fresh user lookup per request | A suspended or demoted user keeps access | Token holds only the user ID; user reloaded each request | 4 | Implemented (Stage 4) |
| S-05 | Role-based authorisation | Privilege escalation | `authorize(...roles)` middleware on every protected route | 4, 12 | Partial (Stage 4: middleware done and tested; admin routes arrive in Stage 12) |
| S-06 | Ownership checks | Reading or changing someone else's data | Checked in services (own item, own claim, own notification, assigned recovery) | 5, 11, 13, 14 | Partial (Stage 5: reports. Only the reporter can edit or close; another user gets 403, and 404 for a closed report they may not see. Claims, notifications and recovery come later) |
| S-07 | No role in public registration | Self-made admin | Role is never read from the request. Strict schema rejects it. Admins come from seed script or an admin promoting a user | 4 | Implemented (Stage 4) |
| S-08 | Strict input validation | Bad data, injection | Zod schemas on body, query and params. Unknown fields rejected. Length and enum limits | 4 on | Partial (Stages 4 and 5: sign-up, login, profile and the report endpoints; every later endpoint adds its own) |
| S-09 | NoSQL-injection resistance | Operators like `{"$gt": ""}` smuggled into queries | Validation only allows plain strings and known types. Queries are built from validated values, never from raw `req.body`/`req.query` | 4 on | Partial (Stages 4 to 6: sign-up, login, profile, report and browse endpoints; operator-style values such as `status[$ne]=OPEN` or `category[$ne]=KEYS` are refused with 400 and tested) |
| S-10 | Safe keyword search | Regex injection and slow patterns | User search text is **escaped** before use in a regex; length limited to 60 | 6 | Implemented (Stage 6). Pattern characters are plain text (tested, including a classic slow pattern), at most 5 words are used, operator-style values are refused, and the private fields are never searched |
| S-11 | Private fields never public | Data leaks | `select: false` on private fields **plus** whitelist serializers. Tests assert private fields are absent from public responses | 5, 11 | Partial (Stage 5: reports. Private fields are `select: false` and loaded only for the reporter or an administrator; the reporter's contact details only for an administrator; the reporter's id is never sent. Tested with planted-bug checks. Claim evidence comes in Stage 11) |
| S-12 | Mass-assignment protection | Client sets `status`, `reporterId`, etc. | Update schemas whitelist editable fields. Status only changes via `statusRules.js` | 5 | Partial (Stage 5: reports. Clients cannot send `status`, `reporterId`, `reportType` (on edit), `images`, `isMine` or `closedAt`: each is a 400 and nothing is saved. Other resources add their own) |
| S-13 | Status state machine | Illegal workflow jumps (e.g. skipping verification) | Single file of allowed transitions; others return 409 | 5, 11 | Partial (Stage 5: the report transition table is built and checked against every combination of type, status and actor; closing uses it. Claim transitions come in Stage 11) |
| S-14 | Rate limiting | Password guessing, spam, floods | Limits in [API_CONTRACT.md](API_CONTRACT.md#16-initial-rate-limits-tunable) | 4 on | Implemented (Stage 4) |
| S-15 | Security headers | Common browser attacks | Helmet | 3 | Implemented (Stage 3) |
| S-16 | CORS allow-list | Other websites calling the API from a browser | Only origins listed in `CORS_ORIGINS` | 3 | Implemented (Stage 3) |
| S-17 | Request size limits | Memory exhaustion | JSON body limit; upload 5 MB; `limit` max 50 | 3, 9 | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-18 | Image validation | Malicious or oversized uploads | Size cap, **magic-byte** type check, upload through backend, only our Cloudinary URLs accepted | 9 | Planned |
| S-19 | Secrets management | Leaked keys | `.env` only, in `.gitignore`. `.env.example` has fake values. App fails to start if a required secret is missing. Secret scan before each push | 2 on | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-20 | Safe error handling | Information leaks | One error handler. Clients get a code and message, never a stack trace or query | 3 | Partial (Stage 2, see IMPLEMENTATION_STATUS) |
| S-21 | Audit records | Unaccountable staff actions | Append-only log of admin actions, including each viewing of private evidence | 12–16 | Planned |
| S-22 | Conflict-of-interest rule | Staff approving their own claims | Staff accounts cannot submit claims | 11 | Planned |
| S-23 | Account suspension | Abusive users | `accountStatus`, checked on login and on every request | 4, 12 | Partial (Stage 4: enforced at login and on every request; administrators can suspend from Stage 12) |
| S-24 | Generic login errors | Account enumeration at login | Same message and a similar response time for unknown email and wrong password | 4 | Implemented (Stage 4) |
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
10. **Rate-limit counters live in memory.** They reset when the server restarts, and only work for a single server process.
11. **No per-account lock-out across addresses.** Login attempts are limited per address and email together, so one student's typos never lock out others on the same Wi-Fi. A guesser who uses many different addresses against one account is slowed only by the password policy and the cost of bcrypt. A true per-account lock-out would let anyone lock out a victim, so it is not used. Revisited in Stage 16.
12. **Behind a hosting proxy the server must be told to trust it.** Otherwise every user appears to come from the proxy's one address and shares the same limits. To be configured when hosting (Stage 17).
13. **Passwords are limited to 72 bytes** (a bcrypt limit), and the limit is enforced, not silently applied.
14. **No per-user limit on creating reports.** Any logged-in user can post many reports; only the general limit per address applies (600 requests per 15 minutes). Spam is limited but not prevented. A per-user daily cap and administrator tools for removing spam are considered for Stage 12 and 16.
15. **Administrators cannot yet edit or close other people's reports.** This is deliberate (their actions must be audited first, Stage 12), so it is a missing feature, not a hole: until then a bad report can only be handled by its owner or directly in the database.
16. **Search scans, it does not use an index.** A partial-word search cannot use a database index, so each search reads every report left after the other filters. This is fast at campus scale (thousands of reports). If the data ever grows to hundreds of thousands, the search would need a different design. The text is escaped and limited to 60 characters and 5 words, so a search cannot be made expensive on purpose beyond that, and the general request limit still applies.

## 5. Rules for working on this project

- **Never commit:** `.env` files, `node_modules`, passwords, tokens, API keys, database dumps, private claim evidence, real personal data, or screenshots showing any of these.
- Test and demo data is **fake**. Seed passwords come from `.env`, never from source code.
- If a secret is ever committed by accident: **treat it as compromised, rotate it immediately** (change the password/key at the provider), then clean the history. Deleting the file in a later commit is not enough because Git remembers.
- Before each push in later stages, a quick secret scan is run (`git diff --cached` review plus a scanning tool).
- If a password or key appears **anywhere except your private `.env`** (a chat, an email, a screenshot, a screen share), treat it as leaked and replace it straight away. In Atlas that means a new database user with a new password, deleting the old user, and updating `.env`. This happened once during Stage 3 and was handled this way. When asking for help, replace secrets with `***`.

## 6. Stage 16 security review checklist

At Stage 16 every row above is re-verified against the real code, and this file is updated to the real status (Implemented / Partially / Not done) with evidence. A final review will also try the common abuse cases by hand: calling admin routes as a user, reading another user's claim by ID, editing another user's report, sending a `role` field at registration, oversized and fake-extension uploads, and rapid repeated logins.
