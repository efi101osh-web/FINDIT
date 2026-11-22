# End-to-end flow (the main demo scenario)

This is the full journey the final demonstration will walk through, and the first test that must pass at Stage 17:

**Register, log in, report lost, report found, potential match, claim, admin review, authorised recovery, final status.**

```mermaid
sequenceDiagram
    actor Owner
    actor Finder
    actor Admin
    participant API as FINDIT API
    participant DB as MongoDB

    Owner->>API: POST /auth/register then POST /auth/login
    Owner->>API: POST /items with reportType LOST
    API->>DB: save lost report, status OPEN
    Finder->>API: POST /items with reportType FOUND
    API->>DB: save found report, status OPEN
    API->>API: matching service scores the two reports
    API-->>Owner: notification POTENTIAL_MATCH
    Owner->>API: GET /items/:id/matches
    Owner->>API: POST /claims with private evidence
    API->>DB: claim PENDING, found item UNDER_VERIFICATION
    API-->>Admin: notification CLAIM_SUBMITTED
    Admin->>API: PATCH /admin/claims/:id/review with APPROVE
    API->>DB: claim APPROVED, found item APPROVED_FOR_RETURN
    API-->>Owner: notification CLAIM_STATUS_CHANGED
    Admin->>API: POST /admin/recovery-records
    Admin->>API: PATCH /admin/recovery-records/:id with COMPLETED
    API->>DB: found item and lost report become RETURNED
    API-->>Owner: notification RECOVERY_UPDATE
```
