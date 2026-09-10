import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Env {
  ALLOWED_ORIGIN?: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  NEXT_PUBLIC_INVITE_CODES_ENABLED?: boolean;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

function jsonResponse(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function getSupabaseAdmin(env: Env): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN ?? "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
    }

    const authHeader = request.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return jsonResponse({ error: "Unauthorized" }, 401, allowedOrigin);
    }

    const supabase = getSupabaseAdmin(env);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401, allowedOrigin);
    }

    const userId = user.id;
    const path = url.pathname;

    if (path === "/me" && request.method === "GET") {
      const { data, error } = await supabase.rpc("get_my_referral_info", { p_user_id: userId });
      if (error) {
        console.error("[referral] get_my_referral_info error:", error);
        return jsonResponse({ error: "Failed to fetch referral info" }, 500, allowedOrigin);
      }
      return jsonResponse(data, 200, allowedOrigin);
    }

    if (path === "/regenerate" && request.method === "POST") {
      const { data, error } = await supabase.rpc("regenerate_referral_code", { p_user_id: userId });
      if (error) {
        console.error("[referral] regenerate_referral_code error:", error);
        return jsonResponse({ error: "Failed to regenerate referral code" }, 500, allowedOrigin);
      }
      return jsonResponse(data, 200, allowedOrigin);
    }

    if (path === "/use" && request.method === "POST") {
      let code: string;
      try {
        const body = (await request.json()) as { code?: unknown };
        code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      } catch {
        return jsonResponse({ error: "Invalid request body" }, 400, allowedOrigin);
      }

      if (!code || !/^[A-Z0-9]{8}$/.test(code)) {
        return jsonResponse({ error: "Invalid code format" }, 400, allowedOrigin);
      }

      const { data, error } = await supabase.rpc("use_referral_code", { p_code: code, p_user_id: userId });
      if (error) {
        console.error("[referral] use_referral_code error:", error);
        return jsonResponse({ error: "Failed to apply referral code" }, 500, allowedOrigin);
      }
      return jsonResponse(data, 200, allowedOrigin);
    }

    return jsonResponse({ error: "Not Found" }, 404, allowedOrigin);
  },
};
