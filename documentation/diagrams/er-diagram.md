# Database relationship diagram (ER diagram)

Boxes are collections, lines are references (a stored `_id` pointing at a document in another collection). Field lists here are abbreviated; the full definitions, validation rules and indexes are in [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md).

```mermaid
erDiagram
    USERS ||--o{ ITEMS : "reports"
    USERS ||--o{ CLAIMS : "submits"
    USERS |o--o{ CLAIMS : "reviews"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ AUDIT_RECORDS : "performs"
    USERS ||--o{ RECOVERY_RECORDS : "collects an item via"
    USERS |o--o{ RECOVERY_RECORDS : "is assigned to handle"
    ITEMS ||--o{ CLAIMS : "found item claimed in"
    ITEMS |o--o{ CLAIMS : "linked lost report"
    ITEMS ||--o{ RECOVERY_RECORDS : "returned through"
    CLAIMS ||--o| RECOVERY_RECORDS : "approved claim leads to"

    USERS {
        ObjectId _id PK
        string fullName
        string email UK
        string passwordHash
        string role
        string contactPreference
        string accountStatus
    }

    ITEMS {
        ObjectId _id PK
        string reportType
        string title
        string category
        string colour
        string generalLocation
        date dateOccurred
        string status
        ObjectId reporterId FK
        string privateDetails
        string privateStorageLocation
    }

    CLAIMS {
        ObjectId _id PK
        ObjectId foundItemId FK
        ObjectId relatedLostItemId FK
        ObjectId claimantId FK
        string privateEvidence
        string status
        ObjectId reviewedBy FK
    }

    RECOVERY_RECORDS {
        ObjectId _id PK
        ObjectId itemId FK
        ObjectId claimId FK
        ObjectId claimantId FK
        ObjectId createdBy FK
        ObjectId assignedTo FK
        string collectionStatus
        string internalNotes
    }

    NOTIFICATIONS {
        ObjectId _id PK
        ObjectId recipientId FK
        string type
        ObjectId relatedItemId FK
        ObjectId relatedClaimId FK
        boolean isRead
    }

    AUDIT_RECORDS {
        ObjectId _id PK
        ObjectId actorId FK
        string action
        string targetType
        ObjectId targetId
        date createdAt
    }
```
