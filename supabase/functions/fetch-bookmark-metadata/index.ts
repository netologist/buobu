import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { fetchHtmlSafely, UrlNotAllowedError } from "./ssrf-guard.ts";

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

    // Validates the protocol, the literal address, and every address the hostname
    // resolves to, then follows redirects manually so each hop is re-validated
    // before the next request is issued.
    const { html, finalUrl } = await fetchHtmlSafely(rawUrl);
    const final = new URL(finalUrl);

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
    if (error instanceof UrlNotAllowedError) {
      return new Response(JSON.stringify({ error: "URL is not allowed" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    // Deliberately one generic message: telling the caller apart "the host did not
    // resolve" from "the host answered with a non-OK status" would make this a
    // reachability and port oracle.
    console.error("[fetch-bookmark-metadata]", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "Failed to fetch metadata" }), {
      status: 502,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
