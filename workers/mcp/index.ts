import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { McpAuthError, type McpContext, type McpScope } from "../../src/lib/mcp/context";
import { createMcpServer } from "../../src/lib/mcp/server";

export interface Env {
  MCP_ALLOWED_ORIGIN?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ResolvedKey {
  userId: string;
  scopes: McpScope[];
  keyId: string;
}

interface WorkerState {
  rateLimitWindows: Map<string, number[]>;
  supabaseClients: Map<string, SupabaseClient>;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const KEY_PREFIX = "buobu_";
const MCP_PATHS = new Set(["/", "/mcp"]);

const workerState = getWorkerState();

function getWorkerState(): WorkerState {
  const globalState = globalThis as typeof globalThis & {
    __buobuMcpWorkerState?: WorkerState;
  };

  if (!globalState.__buobuMcpWorkerState) {
    globalState.__buobuMcpWorkerState = {
      rateLimitWindows: new Map<string, number[]>(),
      supabaseClients: new Map<string, SupabaseClient>(),
    };
  }

  return globalState.__buobuMcpWorkerState;
}

function getSupabaseAdmin(env: Env): SupabaseClient {
  const cacheKey = `${env.NEXT_PUBLIC_SUPABASE_URL}:${env.SUPABASE_SERVICE_ROLE_KEY}`;
  const cached = workerState.supabaseClients.get(cacheKey);
  if (cached) {
    return cached;
  }

  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  workerState.supabaseClients.set(cacheKey, client);
  return client;
}

async function hashKey(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function checkRateLimit(keyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const existing = workerState.rateLimitWindows.get(keyId) ?? [];
  const timestamps = existing.filter((timestamp) => now - timestamp < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    workerState.rateLimitWindows.set(keyId, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  workerState.rateLimitWindows.set(keyId, timestamps);

  return { allowed: true, remaining: MAX_REQUESTS - timestamps.length };
}

async function resolveApiKey(
  authHeader: string | null,
  env: Env
): Promise<ResolvedKey> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new McpAuthError("Missing or invalid Authorization header");
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith(KEY_PREFIX)) {
    throw new McpAuthError("Invalid API key format");
  }

  const hash = await hashKey(rawKey);
  const supabase = getSupabaseAdmin(env);

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, scopes, expires_at, revoked_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .single();

  if (error || !data) {
    throw new McpAuthError("Invalid or revoked API key");
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new McpAuthError("API key has expired");
  }

  // The client hides the MCP panel from free users, but that is presentation,
  // not authorization. Enforce the entitlement here too, so a key minted while
  // subscribed stops working once the subscription lapses.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", data.user_id)
    .maybeSingle();

  const entitled =
    subscription?.plan === "plus" &&
    (subscription.status === "active" || subscription.status === "trialing");

  if (!entitled) {
    throw new McpAuthError("MCP access requires an active Plus subscription");
  }

  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    userId: data.user_id,
    scopes: data.scopes as McpScope[],
    keyId: data.id,
  };
}

function buildContext(resolved: ResolvedKey, env: Env): McpContext {
  return {
    userId: resolved.userId,
    scopes: resolved.scopes,
    keyId: resolved.keyId,
    supabase: getSupabaseAdmin(env),
  };
}

async function authenticate(request: Request, env: Env): Promise<McpContext> {
  const resolved = await resolveApiKey(request.headers.get("authorization"), env);
  const { allowed } = checkRateLimit(resolved.keyId);

  if (!allowed) {
    throw new McpAuthError("Rate limit exceeded");
  }

  return buildContext(resolved, env);
}

function getCorsOrigin(request: Request, env: Env): string | null {
  const requestOrigin = request.headers.get("origin");

  if (!env.MCP_ALLOWED_ORIGIN) {
    return requestOrigin ?? "*";
  }

  if (requestOrigin === env.MCP_ALLOWED_ORIGIN) {
    return env.MCP_ALLOWED_ORIGIN;
  }

  return null;
}

function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Headers", "authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  const corsOrigin = getCorsOrigin(request, env);
  if (corsOrigin) {
    headers.set("Access-Control-Allow-Origin", corsOrigin);
  }
  headers.set("Access-Control-Expose-Headers", "mcp-protocol-version, mcp-session-id");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleMcpRequest(request: Request, env: Env): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer(await authenticate(request, env));

  await server.connect(transport);
  return transport.handleRequest(request);
}

const workerHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("origin");

    if (env.MCP_ALLOWED_ORIGIN && requestOrigin && requestOrigin !== env.MCP_ALLOWED_ORIGIN) {
      return Response.json(
        { jsonrpc: "2.0", error: { code: -32001, message: "Origin not allowed" }, id: null },
        { status: 403 }
      );
    }

    try {
      if (request.method === "OPTIONS" && MCP_PATHS.has(url.pathname)) {
        return withCors(new Response(null, { status: 204 }), request, env);
      }

      if (url.pathname === "/health") {
        return withCors(Response.json({ status: "ok" }), request, env);
      }

      if (!MCP_PATHS.has(url.pathname)) {
        return withCors(new Response("Not found", { status: 404 }), request, env);
      }

      const response = await handleMcpRequest(request, env);
      return withCors(response, request, env);
    } catch (error) {
      if (error instanceof McpAuthError) {
        return withCors(
          Response.json(
            { jsonrpc: "2.0", error: { code: -32001, message: error.message }, id: null },
            { status: 401 }
          ),
          request,
          env
        );
      }

      console.error("Unhandled MCP worker error", error);

      return withCors(
        Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal server error" },
            id: null,
          },
          { status: 500 }
        ),
        request,
        env
      );
    }
  },
};

export default workerHandler;
