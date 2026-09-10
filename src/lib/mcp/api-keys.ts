import { supabase } from "@/lib/supabase";

const KEY_PREFIX = "buobu_live_";

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

async function requireCurrentUser(expectedUserId?: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required");
  }

  if (expectedUserId && user.id !== expectedUserId) {
    throw new Error("Unauthorized user context");
  }

  return user.id;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashKey(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[],
  expiresInDays: number | null
): Promise<{ rawKey: string; keyRow: ApiKeyRow }> {
  const currentUserId = await requireCurrentUser(userId);
  const raw = KEY_PREFIX + randomHex(24);
  const hash = await hashKey(raw);
  const prefix = raw.slice(0, 16);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: currentUserId,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { rawKey: raw, keyRow: data as ApiKeyRow };
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const currentUserId = await requireCurrentUser(userId);
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at")
    .eq("user_id", currentUserId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApiKeyRow[];
}

export async function revokeApiKey(
  userId: string,
  keyId: string
): Promise<void> {
  const currentUserId = await requireCurrentUser(userId);
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", currentUserId);

  if (error) throw new Error(error.message);
}
