# FINDIT: Requirements

> **Status:** Stage 1 blueprint. These are the *agreed requirements*, not a statement that they are built. Build status: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

**Priority key:** **Must** = system is not acceptable without it. **Should** = important, do if time allows within its stage. **Could** = nice to have. **Won't (now)** = explicitly postponed.
**Stage** = the development stage (1–20) in which it is built.

---

## 1. Actors

| Actor | Description |
|---|---|
| Visitor | Not logged in. Can only register, log in and check server health |
| Regular user (`user`) | A logged-in campus member |
| Administrator (`admin`) | Reviews claims, manages users and reports, creates recovery records |
| Recovery officer (`recovery_officer`) | Handles *assigned* handovers only |
| System | The backend acting automatically (matching, status changes, notifications) |

## 2. Functional requirements

### 2.1 Authentication and accounts (AUTH)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| AUTH-01 | A visitor can register with full name, email and password | Must | 4 |
| AUTH-02 | Public registration always creates the role `user`. A role can never be supplied by the client | Must | 4 |
| AUTH-03 | Duplicate email addresses are rejected (case-insensitive) | Must | 4 |
| AUTH-04 | Login returns a JWT. A wrong email and a wrong password produce the *same* generic error | Must | 4 |
| AUTH-05 | The app can fetch the current user from a valid token | Must | 4 |
| AUTH-06 | Passwords are hashed. Minimum 8 characters, maximum 72, containing at least one letter and one number | Must | 4 |
| AUTH-07 | A suspended account cannot log in, and its existing tokens stop working immediately | Must | 4 |
| AUTH-08 | A logged-in user can change their password (current password required) | Should | 4 |
| AUTH-09 | Logout discards the token on the device. The limitation (the server cannot revoke an unexpired token) is documented | Must | 8 |
| AUTH-10 | Optionally restrict registration to configured campus email domains | Could | 4 |
| AUTH-11 | Administrator and officer accounts are created only by a seed script or by an existing administrator | Must | 4 |

### 2.2 Profile (PROF)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| PROF-01 | A user can view and update their full name, phone number, contact preference and profile image | Must | 4 |
| PROF-02 | A user cannot change their email, role or account status | Must | 4 |
| PROF-03 | The profile shows the user's own reports and claims | Should | 7–8 |

### 2.3 Reporting items (ITEM)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| ITEM-01 | A user can submit a **lost** report: item name, category, description, colour, brand (optional), general location, date, approximate time, private distinguishing details (optional), photo(s) (optional) | Must | 5 |
| ITEM-02 | A user can submit a **found** report with the same fields, plus whether it was handed to an authorised office and an optional private storage location | Must | 5 |
| ITEM-03 | Up to 3 photos per report; JPEG, PNG or WebP; maximum 5 MB each; type verified by file content, not just name | Must | 9 |
| ITEM-04 | Public item responses never include private fields (private details, private storage location, reporter identity) | Must | 5 |
| ITEM-05 | The reporter can edit their report while it is `OPEN` or `POTENTIAL_MATCH`. Fields that identify or move the report (type, owner, status) can never be edited this way. *(Administrator editing arrives in Stage 12 with the audit log.)* | Must | 5 |
| ITEM-06 | The reporter can close their own report, unless a found item is under verification or approved for return | Must | 5 |
| ITEM-07 | All status changes follow the state machine; illegal transitions are rejected | Must | 5, 11 |
| ITEM-08 | The event date cannot be in the future (one day of slack for clocks running ahead) or more than a year ago. Category, colour, location zone and time band must come from the allowed lists, and the location detail must fit its zone (a hall from the list, a short description for the library or a classroom) | Must | 5 |
| ITEM-09 | Found-item reporters are told to hand items to the authorised office. The system never arranges private exchanges | Must | 5, 7 |

### 2.4 Browsing and search (BRW)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| BRW-01 | Users can browse lost items, found items and recent reports as cards (photo, title, category, general location, date, status) | Must | 6–7 |
| BRW-02 | Keyword search across title, description, brand and location (partial words work). Several words must all match. Private details are never searched | Must | 6 |
| BRW-03 | Filters: report type, category, colour, location, status, date range | Must | 6 |
| BRW-04 | Pagination (default 20, maximum 50) and sorting (newest, oldest, by event date) | Must | 6 |
| BRW-05 | Closed reports never appear in public browsing | Must | 6 |
| BRW-06 | Every list screen has loading, empty and error states | Must | 7 |
| BRW-07 | A user can list "my reports" | Must | 5–7 |

### 2.5 Matching (MAT)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| MAT-01 | The system scores a lost/found pair from 0 to 100 using weighted *public* signals and returns a list of human-readable reasons | Must | 10 |
| MAT-02 | Only same-category, opposite-type, still-active, different-reporter reports are compared | Must | 10 |
| MAT-03 | A user can list potential matches for **their own** report | Must | 10 |
| MAT-04 | A strong new match creates an in-app notification | Must | 10, 14 |
| MAT-05 | The interface always states that a score is a hint, not proof of ownership | Must | 10, 7 |
| MAT-06 | Similarity between private details/evidence is shown to **administrators only**, as a review aid | Should | 11–12 |
| MAT-07 | The scoring formula is documented so anyone can explain it | Must | 10 |

### 2.6 Claims (CLM)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| CLM-01 | A user can claim a found item by giving an explanation and private evidence | Must | 11 |
| CLM-02 | Evidence is visible only to the claimant and administrators | Must | 11 |
| CLM-03 | A user cannot claim their own found item | Must | 11 |
| CLM-04 | A user may have only one active claim per found item | Must | 11 |
| CLM-05 | Administrators can start review, request more information, approve or reject (notes required for reject/request) | Must | 11–12 |
| CLM-06 | A claimant can respond to a request for information | Must | 11 |
| CLM-07 | A claimant can withdraw a claim that is not yet decided | Should | 11 |
| CLM-08 | A claimant can track their claims and see decisions and reviewer notes | Must | 8, 11 |
| CLM-09 | Approving a claim automatically rejects other active claims on the same item and notifies those claimants | Must | 11 |
| CLM-10 | Administrator and officer accounts cannot submit claims (conflict of interest) | Must | 11 |
| CLM-11 | Each time an administrator opens private evidence, an audit record is written | Should | 16 |

### 2.7 Recovery (REC)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| REC-01 | An administrator can create a recovery record only for an *approved* claim | Must | 13 |
| REC-02 | A recovery record holds the item, claim, claimant, responsible staff member, status, collection location, collection date and internal notes | Must | 13 |
| REC-03 | Marking a recovery `COMPLETED` sets the found item (and any linked lost report) to `RETURNED` | Must | 13 |
| REC-04 | A recovery officer sees and updates only records assigned to them, and never sees claim evidence | Must | 13 |
| REC-05 | Internal notes are visible to staff only | Must | 13 |
| REC-06 | Handover always happens at an authorised location, never by exchanging contact details | Must | all |

### 2.8 Notifications (NOT)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| NOT-01 | In-app notifications for: potential matches, claim submitted, claim status changes, requests for information, recovery updates | Must | 14 |
| NOT-02 | Users can list their notifications, see an unread count, mark one as read and mark all as read | Must | 14 |
| NOT-03 | A user can only ever see their own notifications | Must | 14 |
| NOT-04 | Push notifications (phone alerts when the app is closed) | Won't (now) | future |

### 2.9 Administration (ADM)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| ADM-01 | Overview page with statistics calculated from real database data | Must | 12 |
| ADM-02 | List, search and filter all lost and found reports; apply allowed status changes | Must | 12 |
| ADM-03 | Claim review page showing the claim, the item, the claimant and the private evidence | Must | 12 |
| ADM-04 | User management: list, search, suspend or reactivate, change role. An administrator cannot change their own role or status, and the last active administrator cannot be removed | Must | 12 |
| ADM-05 | Recovery records page | Must | 13 |
| ADM-06 | Analytics charts from real data | Should | 15 |
| ADM-07 | Audit records page (who did what, and when) | Should | 12, 16 |
| ADM-08 | Settings page (own profile, change password) | Could | 12 |

### 2.10 User interface (UI)

| ID | Requirement | Priority | Stage |
|---|---|---|---|
| UI-01 | Consistent FINDIT brand using the defined palette (see [ARCHITECTURE.md](ARCHITECTURE.md#12-design-tokens)) | Must | 7, 12 |
| UI-02 | Loading indicators, empty states and readable error messages on every data screen | Must | 7, 12 |
| UI-03 | Confirmation dialogs before destructive or irreversible actions | Must | 7, 12 |
| UI-04 | Text contrast of at least 4.5:1; touch targets of at least 44 × 44 points on mobile | Must | 7, 18 |
| UI-05 | The dashboard is laptop-oriented and responsive down to tablet width | Should | 12 |

## 3. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Security | Controls in [SECURITY_PLAN.md](SECURITY_PLAN.md) are implemented and individually tested. A control is never described as present before it is |
| NFR-02 | Privacy | Collect the minimum personal data. No personal data in logs. No real personal data in the repository, test data or screenshots |
| NFR-03 | Compatibility | Mobile app runs in **Expo Go on a physical Android phone**. Dashboard runs in current Chrome, Edge and Firefox |
| NFR-04 | Cost | Runs entirely on free tiers (see [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md#8-cost-everything-is-free)) |
| NFR-05 | Maintainability | Modular structure, one responsibility per file, documentation updated with each stage |
| NFR-06 | Consistency | One API for both clients; one response and error format (see [API_CONTRACT.md](API_CONTRACT.md)) |
| NFR-07 | Reliability | Server errors never crash the process or leak internals. Clients always get a structured error |
| NFR-08 | Performance | Target: typical list requests feel responsive on free-tier infrastructure. Measured and reported honestly at Stage 17, with no guaranteed numbers |
| NFR-09 | Testability | Automated backend tests for the core rules; manual test scripts for mobile and dashboard ([TEST_PLAN.md](TEST_PLAN.md)) |

## 4. Roles and permissions matrix

✔ = allowed, ✘ = refused by the backend, **own** = only for records the user owns, **assigned** = only for records assigned to them.

| Action | Visitor | User | Recovery officer | Administrator |
|---|---|---|---|---|
| Register / log in | ✔ | n/a | n/a | n/a |
| View and edit own profile, change own password | ✘ | ✔ | ✔ | ✔ |
| Browse and search reports (public view) | ✘ | ✔ | ✔ | ✔ |
| Create a lost or found report | ✘ | ✔ | ✔ | ✔ |
| Edit / close a report | ✘ | **own** | **own** | ✔ any (state rules still apply) |
| See private fields of a report | ✘ | **own** | ✘ (storage location of **assigned** recovery only) | ✔ |
| See a report's matches | ✘ | **own** | **own** | ✔ |
| Submit, respond to, or withdraw a claim | ✘ | ✔ (**own**) | ✘ | ✘ |
| See a claim and its private evidence | ✘ | **own** | ✘ | ✔ |
| Review a claim (start, request info, approve, reject) | ✘ | ✘ | ✘ | ✔ |
| List all reports / claims / users with admin detail | ✘ | ✘ | ✘ | ✔ |
| Suspend a user or change a role | ✘ | ✘ | ✘ | ✔ (not self; not the last admin) |
| Create a recovery record | ✘ | ✘ | ✘ | ✔ |
| View recovery records | ✘ | ✘ | **assigned** | ✔ |
| Update a recovery record / record handover | ✘ | ✘ | **assigned** | ✔ |
| Overview, analytics, audit records | ✘ | ✘ | ✘ | ✔ |
| Read own notifications | ✘ | ✔ | ✔ | ✔ |

## 5. Explicitly out of scope for now

Interactive campus map · QR codes · AI image similarity · real-time chat · push notifications · multiple campuses · advanced analytics · reputation system. These come only after the core system works end to end.

## 6. Assumptions

- One campus (Babcock University, Ilishan-Remo, with the Iperu-Remo campus). The places are kept in a single configuration file, `backend/src/config/campusLocations.js`, as zones (male halls, female halls, churches, library, classrooms and so on) that ask for a little more detail. A location is only a hint, because items get moved. (Built in Stage 5.)
- Authorised collection offices are a small configured list (Stage 13).
- "Contact preference" (in-app, email or phone) tells *staff* how to reach a user. It never exposes contact details to other users.
- Data in development is fake test data only.
