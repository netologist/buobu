import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type MetadataResponse = {
  title?: string;
  description?: string;
  previewImage?: string;
  favicon?: string;
  siteName?: string;
  domain?: string;
  canonicalUrl?: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseMeta(html: string, key: string, attr: "property" | "name" = "property"): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<meta[^>]*${attr}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(re);
  return match?.[1]?.trim();
}

function parseTagText(html: string, tag: string): string | undefined {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}[^>]*>([^<]+)</${escaped}>`, "i");
  return html.match(re)?.[1]?.trim();
}

function parseLinkHref(html: string, rel: string): string | undefined {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<link[^>]*rel=["'][^"']*${escaped}[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>`, "i");
  return html.match(re)?.[1]?.trim();
}

function toAbsoluteUrl(candidate: string | undefined, base: URL): string | undefined {
  if (!candidate) return undefined;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return undefined;
  }
}

function isAllowedUrl(url: URL): boolean {
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    // IPv4 private range guard
    if (host.startsWith("10.") || host.startsWith("127.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
    const second = Number(host.split(".")[1] || "0");
    if (host.startsWith("172.") && second >= 16 && second <= 31) return false;
  }
  return true;
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "buobu-bookmark-bot/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      throw new Error("Invalid response");
    }

    const html = await response.text();
    return { html: html.slice(0, 1_000_000), finalUrl: response.url };
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const rawUrl = String(body.url || "").trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const inputUrl = new URL(rawUrl);
    if (!isAllowedUrl(inputUrl)) {
      return new Response(JSON.stringify({ error: "URL is not allowed" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { html, finalUrl } = await fetchHtml(inputUrl.toString());
    const final = new URL(finalUrl);

    // Re-validate the final URL after redirects (guards against SSRF via HTTP redirects
    // or DNS rebinding where the initial check passes but the resolved target is private).
    if (!isAllowedUrl(final)) {
      return new Response(JSON.stringify({ error: "URL is not allowed" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const title = parseMeta(html, "og:title") || parseTagText(html, "title");
    const description = parseMeta(html, "og:description") || parseMeta(html, "description", "name");
    const previewImage = toAbsoluteUrl(parseMeta(html, "og:image"), final);
    const siteName = parseMeta(html, "og:site_name");
    const canonicalUrl = toAbsoluteUrl(parseMeta(html, "og:url") || parseLinkHref(html, "canonical"), final) || final.toString();
    const favicon = toAbsoluteUrl(parseLinkHref(html, "icon") || "/favicon.ico", final);

    const payload: MetadataResponse = {
      title,
      description,
      previewImage,
      favicon,
      siteName,
      domain: final.hostname.replace(/^www\./, ""),
      canonicalUrl,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "metadata fetch failed";
    const status = message.includes("timeout") || message.includes("aborted") ? 504 : 502;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
