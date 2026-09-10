# ADR-002: Cloudflare Workers as Backend

> **This record no longer describes the system.** It is kept as the historical
> record of a design that was evaluated in 2025-02 and later abandoned.

## Status

**Superseded**

### Superseded by: Supabase

The Cloudflare Workers + R2 + D1 backend described below was never built. The
shipped backend is **Supabase**, which provides auth, Postgres, storage and
realtime, and is documented in [Tech Stack: Backend](../tech-stack/backend.md).

Cloudflare Workers still exist in the repository, but for two narrow jobs only,
neither of which is covered by this record:

- `workers/mcp` — the Model Context Protocol endpoint.
- `workers/referral` — the referral code endpoint.

Neither worker declares a D1, R2, KV or Durable Object binding. There is no R2
object store, no per-user JSON file storage, and no Hono application in the
codebase. Data sync is RxDB replication to Supabase over PostgREST plus a
Realtime websocket (`src/lib/supabase-replication.ts`).

## Context

We needed a backend platform for:
- User authentication
- Data sync (upload/download)
- User metadata storage
- Low operational cost
- Global availability

## Alternatives Considered

### 1. Vercel + Vercel KV/Blob
- **Pros:** Tight Next.js integration, easy deployment
- **Cons:** Higher costs at scale, vendor lock-in

### 2. AWS Lambda + S3 + DynamoDB
- **Pros:** Mature ecosystem, any scale
- **Cons:** Complex setup, higher operational overhead

### 3. Supabase
- **Pros:** PostgreSQL, real-time, auth built-in
- **Cons:** Not edge-native, cold starts

### 4. Cloudflare Workers + R2 + D1
- **Pros:** Edge-native, generous free tier, R2 no egress fees
- **Cons:** D1 is newer, limited compute time

## Decision

**Selected: Cloudflare Workers + R2 + D1**

| Component | Purpose |
|-----------|---------|
| Workers | Serverless API runtime |
| R2 | User data storage (JSON files) |
| D1 | Auth, user metadata, invite codes |

### Cost Analysis

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| Workers | 100K requests/day | Generous |
| R2 | 10GB storage | No egress fees |
| D1 | 5GB storage | Sufficient for metadata |

## Implementation

```typescript
// workers/api/src/index.ts
const app = new Hono<HonoEnv>();

// Routes
app.route('/auth', authRoutes);
app.route('/sync', syncRoutes);
app.route('/user', userRoutes);

// Middleware
app.use('*', authMiddleware);
app.use('*', errorMiddleware);
```

### Data Storage Strategy

- **D1:** Minimal data (user IDs, invite codes, timestamps)
- **R2:** Bulk data (user's exported JSON)
- **No server-side processing of user data**

## Consequences

### Positive
- Near-zero operational cost for typical usage
- Global edge deployment (low latency)
- Simple architecture ( Workers → R2/D1)
- No egress fees on R2

### Negative
- D1 has some limitations (no full-text search)
- 30s CPU time limit per request
- Debugging edge workers can be harder

## Related

- [Tech Stack: Backend](../tech-stack/backend.md)
