import { replicateRxCollection, type RxReplicationState } from 'rxdb/plugins/replication';
import type { RxCollection } from 'rxdb';
import type { Database, Collections } from './rxdb';
import { supabase } from './supabase';
import { useSyncStore } from '@/stores/sync-store';

type Checkpoint = {
  _modified: number;
  id: string;
};

type ReplicatedCollectionName =
  | 'tasks'
  | 'backlogs'
  | 'habits'
  | 'habitLogs'
  | 'visionItems'
  | 'notes'
  | 'bookmarks'
  | 'mindmaps'
  | 'boards'
  | 'swimlanes'
  | 'routines'
  | 'routineLogs'
  | 'timeblocks';

type SyncDoc = {
  id: string;
  user_id: string;
  _modified: number;
  _deleted: boolean;
  [key: string]: unknown;
};

const PULL_BATCH_SIZE = 100;
const PUSH_BATCH_SIZE = 100;
const RESYNC_INTERVAL_MS = 30_000;
const ACTIVE_RESYNC_INTERVAL_MS = 6_000;
const ACTIVE_RESYNC_WINDOW_MS = 30_000;
const REALTIME_HEARTBEAT_MS = 25_000;
const REALTIME_RECONNECT_BASE_MS = 1_000;
const REALTIME_RECONNECT_MAX_MS = 30_000;

const COLLECTION_TABLES: Record<ReplicatedCollectionName, string> = {
  tasks: 'tasks',
  backlogs: 'backlogs',
  habits: 'habits',
  habitLogs: 'habit_logs',
  visionItems: 'vision_items',
  notes: 'notes',
  bookmarks: 'bookmarks',
  mindmaps: 'mindmaps',
  boards: 'boards',
  swimlanes: 'swimlanes',
  routines: 'routines',
  routineLogs: 'routine_logs',
  timeblocks: 'timeblocks',
};

const replicatedCollections = Object.keys(COLLECTION_TABLES) as ReplicatedCollectionName[];

type ReplicationBundle = {
  states: RxReplicationState<SyncDoc, Checkpoint>[];
  intervalId: number | null;
  onlineHandler: () => void;
  realtime: SupabaseRealtimeResync | null;
  subscriptions: Array<{ unsubscribe: () => void }>;
  activeByState: boolean[];
  paused: boolean;
};

const replicationByUser = new Map<string, ReplicationBundle>();
const statusByUser = new Map<string, SyncStatusState>();
const listenersByUser = new Map<string, Set<(status: SyncStatusState) => void>>();
const lastWriteByUser = new Map<string, number>();

type RealtimeMessage = {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
  ref?: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'paused';

export type SyncStatusState = {
  status: SyncStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  remoteChangesCount: number;
};

const IDLE_STATUS: SyncStatusState = {
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  remoteChangesCount: 0,
};

function assertSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !apiKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }
  return { url, apiKey };
}

function emitStatus(userId: string, next: SyncStatusState): void {
  statusByUser.set(userId, next);
  const listeners = listenersByUser.get(userId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(next);
  }
}

function updateStatus(userId: string, patch: Partial<SyncStatusState>): void {
  const current = statusByUser.get(userId) ?? IDLE_STATUS;
  emitStatus(userId, { ...current, ...patch });
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Sync failed';
}

export function getSyncStatus(userId?: string): SyncStatusState {
  if (!userId) return IDLE_STATUS;
  return statusByUser.get(userId) ?? IDLE_STATUS;
}

export function subscribeSyncStatus(
  userId: string,
  listener: (status: SyncStatusState) => void
): () => void {
  const listeners = listenersByUser.get(userId) ?? new Set<(status: SyncStatusState) => void>();
  listeners.add(listener);
  listenersByUser.set(userId, listeners);

  listener(getSyncStatus(userId));

  return () => {
    const current = listenersByUser.get(userId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listenersByUser.delete(userId);
    }
  };
}

export function markLocalChange(userId: string): void {
  const bundle = replicationByUser.get(userId);
  if (!bundle || bundle.paused) return;

  lastWriteByUser.set(userId, Date.now());

  // Trigger immediate resync to push local changes quickly
  for (const state of bundle.states) {
    state.reSync();
  }

  // Reschedule with the active (shorter) interval if not already in that window
  if (bundle.intervalId !== null) {
    window.clearTimeout(bundle.intervalId);
    bundle.intervalId = null;
  }
  bundle.intervalId = scheduleResync(userId);
}

function scheduleResync(userId: string): number {
  const lastWrite = lastWriteByUser.get(userId) ?? 0;
  const delay = Date.now() - lastWrite < ACTIVE_RESYNC_WINDOW_MS ? ACTIVE_RESYNC_INTERVAL_MS : RESYNC_INTERVAL_MS;

  return window.setTimeout(() => {
    const bundle = replicationByUser.get(userId);
    if (!bundle || bundle.paused) return;
    for (const state of bundle.states) {
      state.reSync();
    }
    // Recalculate delay at callback time so the next interval correctly reflects
    // whether we're still within the active write window.
    bundle.intervalId = scheduleResync(userId);
  }, delay);
}

export function triggerSupabaseResync(userId: string): void {
  const bundle = replicationByUser.get(userId);
  if (!bundle || bundle.paused) return;
  for (const state of bundle.states) {
    state.reSync();
  }
}

export function isSupabaseReplicationPaused(userId?: string): boolean {
  if (!userId) return false;
  return replicationByUser.get(userId)?.paused === true;
}

export function getReplicationStates(userId: string): RxReplicationState<SyncDoc, Checkpoint>[] {
  return replicationByUser.get(userId)?.states ?? [];
}

export async function awaitInitialSync(userId: string): Promise<void> {
  const states = getReplicationStates(userId);
  if (!states.length) return;
  await Promise.all(states.map((state) => state.awaitInitialReplication()));
}

export function acknowledgeRemoteChanges(userId: string): void {
  const current = getSyncStatus(userId);
  emitStatus(userId, {
    ...current,
    remoteChangesCount: 0,
  });
}

class SupabaseRealtimeResync {
  private socket: WebSocket | null = null;
  private heartbeatId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private reconnectAttempts = 0;
  private refCounter = 0;
  private running = false;

  constructor(
    private userId: string,
    private tables: string[],
    private onChange: () => void
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.heartbeatId !== null) {
      window.clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private nextRef(): string {
    this.refCounter += 1;
    return String(this.refCounter);
  }

  private scheduleReconnect(): void {
    if (!this.running) return;

    const wait = Math.min(
      REALTIME_RECONNECT_MAX_MS,
      REALTIME_RECONNECT_BASE_MS * 2 ** this.reconnectAttempts
    );
    this.reconnectAttempts += 1;

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Realtime reconnect failed:', error);
        this.scheduleReconnect();
      });
    }, wait);
  }

  private send(msg: RealtimeMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(msg));
  }

  private async connect(): Promise<void> {
    const { url, apiKey } = assertSupabaseEnv();
    const token = await getAccessToken();
    const websocketUrl = new URL('/realtime/v1/websocket', url);
    websocketUrl.protocol = websocketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    websocketUrl.searchParams.set('apikey', apiKey);
    websocketUrl.searchParams.set('vsn', '1.0.0');

    this.socket = new WebSocket(websocketUrl.toString());

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;

      this.heartbeatId = window.setInterval(() => {
        this.send({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: this.nextRef(),
        });
      }, REALTIME_HEARTBEAT_MS);

      for (const table of this.tables) {
        this.send({
          topic: `realtime:public:${table}`,
          event: 'phx_join',
          payload: {
            config: {
              broadcast: { self: false },
              presence: { key: '' },
              postgres_changes: [
                {
                  event: '*',
                  schema: 'public',
                  table,
                  filter: `user_id=eq.${this.userId}`,
                },
              ],
            },
            access_token: token,
          },
          ref: this.nextRef(),
        });
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as RealtimeMessage;
        if (message.event === 'postgres_changes') {
          this.onChange();
        }
      } catch (error) {
        console.error('Failed to parse realtime message:', error);
      }
    };

    this.socket.onerror = () => {
      // onclose handles reconnect logic
    };

    this.socket.onclose = () => {
      if (this.heartbeatId !== null) {
        window.clearInterval(this.heartbeatId);
        this.heartbeatId = null;
      }
      this.socket = null;
      this.scheduleReconnect();
    };
  }
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No Supabase access token found for replication');
  }
  return token;
}

async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, apiKey } = assertSupabaseEnv();
  const token = await getAccessToken();

  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = (await response.json().catch(() => null)) as T | { message?: string };
  if (!response.ok) {
    const message = (data as { message?: string } | null)?.message || 'Supabase replication request failed';
    throw new Error(message);
  }

  return data as T;
}

function buildPullPath(tableName: string, userId: string, checkpoint: Checkpoint | undefined, batchSize: number): string {
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('user_id', `eq.${userId}`);
  params.set('order', '_modified.asc,id.asc');
  params.set('limit', String(batchSize));

  if (checkpoint) {
    params.set(
      'or',
      `(and(_modified.gt.${checkpoint._modified}),and(_modified.eq.${checkpoint._modified},id.gt.${checkpoint.id}))`
    );
  }

  return `/rest/v1/${tableName}?${params.toString()}`;
}

async function fetchExistingByIds(tableName: string, userId: string, ids: string[]): Promise<Map<string, SyncDoc>> {
  if (!ids.length) return new Map();

  const quotedIds = ids.map((id) => `"${id}"`).join(',');
  const params = new URLSearchParams();
  params.set('select', '*');
  params.set('user_id', `eq.${userId}`);
  params.set('id', `in.(${quotedIds})`);

  const rows = await supabaseRest<SyncDoc[]>(`/rest/v1/${tableName}?${params.toString()}`);
  return new Map(rows.map((row) => [row.id, row]));
}

function ensureSyncFields(doc: SyncDoc, userId: string): SyncDoc {
  return {
    ...doc,
    user_id: userId,
    _modified: typeof doc._modified === 'number' ? doc._modified : Date.now(),
    _deleted: !!doc._deleted,
  };
}

function groupByObjectShape(docs: SyncDoc[]): SyncDoc[][] {
  const groups = new Map<string, SyncDoc[]>();

  for (const doc of docs) {
    const shapeKey = Object.keys(doc).sort().join('|');
    const existing = groups.get(shapeKey);
    if (existing) {
      existing.push(doc);
    } else {
      groups.set(shapeKey, [doc]);
    }
  }

  return Array.from(groups.values());
}

function createCollectionReplication(
  db: Database,
  collectionName: ReplicatedCollectionName,
  userId: string
): RxReplicationState<SyncDoc, Checkpoint> {
  const tableName = COLLECTION_TABLES[collectionName];
  const collection = db[collectionName as keyof Collections] as unknown as RxCollection<SyncDoc>;

  return replicateRxCollection<SyncDoc, Checkpoint>({
    replicationIdentifier: `supabase-${collectionName}-${userId}`,
    collection,
    live: true,
    deletedField: '_deleted',
    waitForLeadership: false,
    pull: {
      batchSize: PULL_BATCH_SIZE,
      handler: async (lastCheckpoint, batchSize) => {
        const path = buildPullPath(tableName, userId, lastCheckpoint, batchSize);
        const documents = await supabaseRest<SyncDoc[]>(path);
        const normalized = documents.map((doc) => ensureSyncFields(doc, userId));
        const lastDoc = normalized[normalized.length - 1];

        return {
          documents: normalized,
          checkpoint: lastDoc
            ? {
                _modified: lastDoc._modified,
                id: lastDoc.id,
              }
            : lastCheckpoint,
        };
      },
    },
    push: {
      batchSize: PUSH_BATCH_SIZE,
      handler: async (rows) => {
        const ids = rows.map((row) => row.newDocumentState.id);
        const existingById = await fetchExistingByIds(tableName, userId, ids);

        const conflicts: SyncDoc[] = [];
        const docsToUpsert: SyncDoc[] = [];

        for (const row of rows) {
          const incoming = ensureSyncFields(row.newDocumentState as SyncDoc, userId);
          const assumed = row.assumedMasterState as SyncDoc | undefined;
          const current = existingById.get(incoming.id);

          if (current && assumed && current._modified !== assumed._modified) {
            conflicts.push(current);
            continue;
          }

          docsToUpsert.push(incoming);
        }

        if (docsToUpsert.length > 0) {
          const shapedBatches = groupByObjectShape(docsToUpsert);
          for (const batch of shapedBatches) {
            await supabaseRest<SyncDoc[]>(
              `/rest/v1/${tableName}?on_conflict=id`,
              {
                method: 'POST',
                headers: {
                  Prefer: 'resolution=merge-duplicates,return=representation',
                },
                body: JSON.stringify(batch),
              }
            );
          }
        }

        return conflicts;
      },
    },
  });
}

export function startSupabaseReplication(db: Database, userId: string): RxReplicationState<SyncDoc, Checkpoint>[] {
  const existing = replicationByUser.get(userId);
  if (existing) {
    return existing.states;
  }
  emitStatus(userId, IDLE_STATUS);

  const states = replicatedCollections.map((collectionName) =>
    createCollectionReplication(db, collectionName, userId)
  );

  const activeByState = states.map(() => false);
  const subscriptions: Array<{ unsubscribe: () => void }> = [];
  let hasSeenAnyActivity = false;
  let trackIncomingChanges = false;

  states.forEach((state, index) => {
    subscriptions.push(
      state.active$.subscribe((active) => {
        // Do not overwrite 'paused' status from internal RxDB events
        if (replicationByUser.get(userId)?.paused) return;

        activeByState[index] = active;
        const anyActive = activeByState.some(Boolean);
        if (anyActive) {
          hasSeenAnyActivity = true;
          updateStatus(userId, { status: 'syncing' });
          return;
        }

        const current = getSyncStatus(userId);
        if (current.status !== 'error') {
          updateStatus(userId, {
            status: 'ok',
            lastSyncAt: Date.now(),
            lastError: null,
          });
        }

        // Ignore initial bootstrap pulls for counter; start tracking afterwards.
        if (hasSeenAnyActivity && !trackIncomingChanges) {
          trackIncomingChanges = true;
          updateStatus(userId, { remoteChangesCount: 0 });
        }
      })
    );

    subscriptions.push(
      state.sent$.subscribe(() => {
        if (replicationByUser.get(userId)?.paused) return;
        updateStatus(userId, {
          status: 'ok',
          lastSyncAt: Date.now(),
          lastError: null,
        });
      })
    );

    subscriptions.push(
      state.received$.subscribe(() => {
        if (replicationByUser.get(userId)?.paused) return;
        const current = getSyncStatus(userId);
        const nextRemoteCount = trackIncomingChanges ? current.remoteChangesCount + 1 : current.remoteChangesCount;
        updateStatus(userId, {
          status: 'ok',
          lastSyncAt: Date.now(),
          lastError: null,
          remoteChangesCount: nextRemoteCount,
        });
      })
    );

    subscriptions.push(
      state.error$.subscribe((error) => {
        if (replicationByUser.get(userId)?.paused) return;
        console.error('Replication error:', error);
        const msg = formatError(error);
        updateStatus(userId, { status: 'error', lastError: msg });
        useSyncStore.getState().syncError(msg);
      })
    );
  });

  const onlineHandler = () => {
    for (const state of states) {
      state.reSync();
    }
  };
  window.addEventListener('online', onlineHandler);
  const intervalId = scheduleResync(userId);

  const realtime = typeof window !== 'undefined'
    ? new SupabaseRealtimeResync(userId, Object.values(COLLECTION_TABLES), onlineHandler)
    : null;
  if (realtime) {
    void realtime.start().catch((error) => {
      console.error('Failed to start Supabase realtime stream:', error);
    });
  }

  replicationByUser.set(userId, {
    states,
    intervalId,
    onlineHandler,
    realtime,
    subscriptions,
    activeByState,
    paused: false,
  });

  return states;
}

export async function stopSupabaseReplication(userId: string): Promise<void> {
  const bundle = replicationByUser.get(userId);
  if (!bundle) return;

  for (const state of bundle.states) {
    await state.cancel();
  }

  if (bundle.intervalId !== null) {
    window.clearTimeout(bundle.intervalId);
  }
  for (const subscription of bundle.subscriptions) {
    subscription.unsubscribe();
  }
  bundle.realtime?.stop();
  window.removeEventListener('online', bundle.onlineHandler);
  replicationByUser.delete(userId);
  lastWriteByUser.delete(userId);
  emitStatus(userId, IDLE_STATUS);
}

export async function stopAllSupabaseReplications(): Promise<void> {
  const users = Array.from(replicationByUser.keys());
  for (const userId of users) {
    await stopSupabaseReplication(userId);
  }
}

export function pauseSupabaseReplication(userId: string): void {
  const bundle = replicationByUser.get(userId);
  if (!bundle || bundle.paused) return;

  bundle.paused = true;

  // Pause RxDB-level replication so push/pull handlers stop firing
  for (const state of bundle.states) {
    void state.pause();
  }

  if (bundle.intervalId !== null) {
    window.clearTimeout(bundle.intervalId);
    bundle.intervalId = null;
  }

  window.removeEventListener('online', bundle.onlineHandler);
  bundle.realtime?.stop();

  // Set status AFTER pausing states so no active$ event can race and overwrite it
  updateStatus(userId, { status: 'paused', lastError: null });
}

export function resumeSupabaseReplication(userId: string): void {
  const bundle = replicationByUser.get(userId);
  if (!bundle || !bundle.paused) return;

  bundle.paused = false;

  // Resume RxDB-level replication (state.start() resumes a paused state in RxDB v16)
  for (const state of bundle.states) {
    void state.start();
  }

  // Restart adaptive resync schedule
  bundle.intervalId = scheduleResync(userId);

  window.addEventListener('online', bundle.onlineHandler);

  // Restart realtime WebSocket
  if (bundle.realtime) {
    void bundle.realtime.start().catch((error) => {
      console.error('Failed to restart Supabase realtime stream:', error);
    });
  }

  // Trigger immediate resync after resume
  for (const state of bundle.states) {
    state.reSync();
  }

  updateStatus(userId, { status: 'ok' });
}
