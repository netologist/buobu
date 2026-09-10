import { SupabaseClient } from "@supabase/supabase-js";

export type McpScope = "read" | "write";

export interface McpContext {
  userId: string;
  scopes: McpScope[];
  keyId: string;
  supabase: SupabaseClient;
}

/**
 * Helper: returns a query builder scoped to the authenticated user.
 * Every MCP query MUST use this to prevent cross-user data leakage.
 */
export function fromUserTable(ctx: McpContext, table: string) {
  return ctx.supabase.from(table).select().eq("user_id", ctx.userId);
}

/**
 * Throws if the caller does not hold the required scope.
 */
export function requireScope(ctx: McpContext, scope: McpScope): void {
  if (!ctx.scopes.includes(scope)) {
    throw new McpAuthError(`Missing required scope: ${scope}`);
  }
}

export class McpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}
