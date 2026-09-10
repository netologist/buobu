# ADR-005: CRDT Sync Strategy with RxDB and Cloudflare D1

## Status

**Rejected** - 2025-08-29

The option selected below, RxDB replication against Cloudflare D1, was never
implemented. Multi-device sync shipped as RxDB replication to **Supabase**: push
and pull over PostgREST, plus a Realtime websocket that triggers a resync
(`src/lib/supabase-replication.ts`), gated behind a sync entitlement. There is
no D1 database, no `sync_state` table and no `/sync/*` route in the codebase —
the D1 schema and client snippets below are the design that was rejected, not a
description of the shipped system.

## Context

We need to implement multi-device data synchronization for the application. Requirements:
- Offline-first: users must be able to work without internet
- Conflict-free: multiple devices can edit data simultaneously
- Low cost: personal project with minimal infrastructure costs
- Integration: must work with existing RxDB setup and Cloudflare Workers auth

Current state:
- RxDB v16.21.1 with Dexie storage (IndexedDB)
- All entities have CRDT metadata (`_version`, `_createdAt`, `_updatedAt`, `_deleted`, `_deviceId`)
- Cloudflare Workers API with JWT authentication
- Per-user database isolation

## Alternatives Considered

### Option 1: Yjs + Durable Objects (Previous Plan)

- **Pros:**
  - Real-time collaboration
  - Built-in CRDT merging
  - Sub-second sync latency
  
- **Cons:**
  - Durable Objects have per-request costs
  - Requires WebSocket connections (always-on)
  - Complex state management in Durable Objects
  - Overkill for single-user multi-device scenario
  - R2 storage adds complexity

### Option 2: Supabase Realtime

- **Pros:**
  - Managed service, minimal setup
  - Built-in auth and realtime subscriptions
  - PostgreSQL with good tooling
  
- **Cons:**
  - Would require migrating existing auth system
  - Higher monthly costs at scale
  - Vendor lock-in
  - Overkill for personal use case

### Option 3: ElectricSQL

- **Pros:**
  - True Postgres-CRDT sync
  - Strong consistency guarantees
  - Active development
  
- **Cons:**
  - Early stage, potential instability
  - Requires PostgreSQL hosting
  - Learning curve
  - More complex than needed

### Option 4: RxDB Replication + Cloudflare D1 (Selected)

- **Pros:**
  - Leverages existing RxDB setup
  - Uses existing Cloudflare Workers infrastructure
  - D1 is free tier friendly
  - Simple HTTP-based sync (no WebSockets)
  - Works with existing auth system
  - Easy to understand and maintain
  
- **Cons:**
  - Not real-time (polling or event-triggered)
  - Manual conflict resolution implementation
  - D1 has row limits (may need cleanup)

### Option 5: P2P WebRTC

- **Pros:**
  - No server costs
  - True peer-to-peer
  
- **Cons:**
  - Only syncs when devices are online simultaneously
  - Complex NAT traversal
  - No persistent server state
  - Not suitable for backup/disaster recovery

## Decision

**Selected at the time (never implemented): RxDB Replication + Cloudflare D1**

Implement CRDT sync using RxDB's built-in replication plugin with Cloudflare D1 as the sync server. Use Last-Write-Wins (LWW) conflict resolution based on `_updatedAt` timestamp.

### Architecture

```
┌──────────────┐     HTTP      ┌─────────────────┐     ┌─────────┐
│   Client     │──────────────▶│ Cloudflare      │────▶│   D1    │
│   (RxDB)     │◀──────────────│   Workers       │◀────│ Database│
└──────────────┘               └─────────────────┘     └─────────┘
     Local                      /sync/push               Sync State
     IndexedDB                  /sync/pull               Tables
                                /sync/checkpoint
```

### Key Decisions

1. **Conflict Resolution**: Last-Write-Wins using `_updatedAt` timestamp
2. **Sync Trigger**: On app focus, on reconnect, every 30s when online
3. **Batch Size**: 100 documents per request
4. **Auth**: Reuse existing JWT system

## Implementation

### D1 Schema

```sql
CREATE TABLE sync_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  collection TEXT NOT NULL,
  checkpoint_updated_at TEXT,
  checkpoint_id TEXT,
  UNIQUE(user_id, collection)
);

CREATE TABLE sync_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL,
  _version INTEGER,
  _updatedAt TEXT,
  _deviceId TEXT,
  _deleted INTEGER DEFAULT 0
);
```

### Client Replication

```typescript
import { replicateRxCollection } from 'rxdb/plugins/replication';

const replicationState = replicateRxCollection({
  collection: db.tasks,
  replicationIdentifier: 'tasks-d1-sync',
  push: {
    handler: pushHandler,
    batchSize: 100,
  },
  pull: {
    handler: pullHandler,
    batchSize: 100,
  },
});
```

## Consequences

### Positive
- Minimal additional infrastructure (just D1 tables)
- Works with existing auth without changes
- Low cost (D1 free tier covers personal use)
- Offline-first maintained
- Simple to debug (HTTP-based, no WebSocket complexity)

### Negative
- Not real-time (second-scale latency)
- Manual conflict resolution code to maintain
- D1 has 500K row limit on free tier (may need cleanup of old deleted records)
- Polling creates some unnecessary requests

## Related

- [ADR-001: RxDB as Database](./001-rxdb-as-database.md)
- [ADR-002: Cloudflare Workers](./002-cloudflare-workers.md) — the backend this
  design assumed, itself superseded by Supabase.
- [Tech Stack: Backend](../tech-stack/backend.md) — what actually syncs data now.
