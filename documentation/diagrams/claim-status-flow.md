# Claim status flow

A claim is one person's request to be given one found item, supported by private evidence. Only the arrows below are allowed. The three bottom states are final.

```mermaid
stateDiagram-v2
    [*] --> PENDING: claim submitted
    PENDING --> UNDER_REVIEW: admin starts review
    PENDING --> REJECTED: admin rejects
    PENDING --> WITHDRAWN: claimant withdraws
    UNDER_REVIEW --> NEEDS_MORE_INFORMATION: admin asks for more
    UNDER_REVIEW --> APPROVED: admin approves
    UNDER_REVIEW --> REJECTED: admin rejects
    UNDER_REVIEW --> WITHDRAWN: claimant withdraws
    NEEDS_MORE_INFORMATION --> UNDER_REVIEW: claimant responds
    NEEDS_MORE_INFORMATION --> REJECTED: admin rejects
    NEEDS_MORE_INFORMATION --> WITHDRAWN: claimant withdraws
    APPROVED --> [*]
    REJECTED --> [*]
    WITHDRAWN --> [*]
```

Side effects (decided in [ARCHITECTURE.md](../ARCHITECTURE.md#7-status-flows)):

- Submitting a claim moves the found item to `UNDER_VERIFICATION`.
- Approving a claim moves the item to `APPROVED_FOR_RETURN` and automatically rejects every other active claim on that item.
- Only an administrator can approve or reject. Staff accounts cannot submit claims (conflict of interest).
