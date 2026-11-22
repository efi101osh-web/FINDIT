# Item status flow

Every report (lost or found) has one `status`. A status can only change along the arrows below; anything else is rejected by the backend with `INVALID_STATE_TRANSITION`. The full rules (who may trigger each arrow, and the conditions) are in the transition table in [ARCHITECTURE.md](../ARCHITECTURE.md#7-status-flows).

```mermaid
stateDiagram-v2
    [*] --> OPEN: report created
    OPEN --> POTENTIAL_MATCH: system finds a likely match
    POTENTIAL_MATCH --> OPEN: no likely match remains
    OPEN --> UNDER_VERIFICATION: first claim submitted
    POTENTIAL_MATCH --> UNDER_VERIFICATION: first claim submitted
    UNDER_VERIFICATION --> APPROVED_FOR_RETURN: admin approves a claim
    UNDER_VERIFICATION --> OPEN: every claim rejected or withdrawn
    APPROVED_FOR_RETURN --> RETURNED: handover completed
    APPROVED_FOR_RETURN --> OPEN: admin cancels the recovery
    OPEN --> CLOSED: reporter or admin closes
    POTENTIAL_MATCH --> CLOSED: reporter or admin closes
    UNDER_VERIFICATION --> CLOSED: admin closes
    APPROVED_FOR_RETURN --> CLOSED: admin closes
    CLOSED --> OPEN: admin reopens
    RETURNED --> [*]
```

Notes:

- `UNDER_VERIFICATION` and `APPROVED_FOR_RETURN` only ever apply to **FOUND** items (claims are made on found items).
- A **LOST** report only uses `OPEN`, `POTENTIAL_MATCH`, `RETURNED` and `CLOSED`. It becomes `RETURNED` when the found item linked to the same claim is handed over.
- `RETURNED` is final.
