import { createHash } from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import type { McpContext, McpScope } from "./context";
import { McpAuthError } from "./context";

const KEY_PREFIX = "buobu_";

export interface ResolvedKey {
  userId: string;
  scopes: McpScope[];
  keyId: string;
}

/**
 * Validate a Bearer token from the Authorization header.
 * Returns user info or throws McpAuthError.
 */
export async function resolveApiKey(
  authHeader: string | null
): Promise<ResolvedKey> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new McpAuthError("Missing or invalid Authorization header");
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith(KEY_PREFIX)) {
    throw new McpAuthError("Invalid API key format");
  }

  const hash = hashKey(rawKey);
  const supabase = getSupabaseAdmin();

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

  // Fire-and-forget last_used_at update
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    userId: data.user_id,
    scopes: data.scopes as McpScope[],
    keyId: data.id,
  };
}

/**
 * Build a full McpContext from a resolved key.
 */
export function buildContext(resolved: ResolvedKey): McpContext {
  return {
    userId: resolved.userId,
    scopes: resolved.scopes,
    keyId: resolved.keyId,
    supabase: getSupabaseAdmin(),
  };
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
