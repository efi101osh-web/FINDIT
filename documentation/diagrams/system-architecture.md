# System architecture diagram

Two clients (the phone app and the admin website) talk to **one** backend. Only the backend talks to the database and to the image service. Neither client ever touches MongoDB or Cloudinary directly, which is what keeps secrets and permissions under the backend's control.

```mermaid
flowchart LR
    subgraph Clients
        M["Mobile app<br/>React Native + Expo Go"]
        A["Admin dashboard<br/>React + Vite"]
    end

    subgraph Backend["Backend: Node.js + Express"]
        R["Routes"] --> MW["Middleware<br/>auth, roles, rate limit"]
        MW --> V["Validators"]
        V --> C["Controllers"]
        C --> S["Services<br/>matching, claims, status rules"]
        S --> MO["Mongoose models"]
    end

    DB[("MongoDB Atlas<br/>free tier")]
    IMG["Cloudinary<br/>image storage"]

    M -- "JSON over HTTP(S), /api/v1" --> R
    A -- "JSON over HTTP(S), /api/v1" --> R
    MO --> DB
    S -- "image upload" --> IMG
```

Related: [ARCHITECTURE.md](../ARCHITECTURE.md)
