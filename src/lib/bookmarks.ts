import { supabase } from '@/lib/supabase';
import { LOCAL_MODE } from '@/lib/feature-flags';

export type BookmarkMetadata = {
  title?: string;
  description?: string;
  previewImage?: string;
  favicon?: string;
  siteName?: string;
  domain?: string;
};

function toAbsoluteUrl(path: string | null | undefined, base: URL): string | undefined {
  if (!path) return undefined;
  try {
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
}

export function normalizeBookmarkUrl(rawUrl: string): string {
  const url = new URL(rawUrl.trim());
  url.hash = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  if (url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  }
  return url.toString();
}

export function getDomainFromUrl(rawUrl: string): string {
  return new URL(rawUrl).hostname.replace(/^www\./, '');
}

export async function fetchBookmarkMetadata(url: string): Promise<BookmarkMetadata> {
  // Local Mode has no server to scrape OpenGraph tags, so derive what we can from
  // the URL itself instead of reporting a fetch failure the user cannot act on.
  if (LOCAL_MODE) return makeFallbackMetadata(url);

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Missing Supabase config');
  }

  const response = await fetch(`${baseUrl}/functions/v1/fetch-bookmark-metadata`, {
    method: 'POST',
    headers: {
      apikey: apiKey,
      Authorization: token ? `Bearer ${token}` : `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(`Metadata fetch failed (${response.status})`);
  }

  const payload = await response.json() as {
    title?: string;
    description?: string;
    previewImage?: string;
    favicon?: string;
    siteName?: string;
    domain?: string;
    canonicalUrl?: string;
  };

  let domain = payload.domain;
  if (!domain) {
    domain = getDomainFromUrl(payload.canonicalUrl || url);
  }

  return {
    title: payload.title,
    description: payload.description,
    previewImage: payload.previewImage,
    favicon: payload.favicon,
    siteName: payload.siteName,
    domain,
  };
}

export function makeFallbackMetadata(url: string): BookmarkMetadata {
  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, '');
  const inferredTitle = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || domain)
    .replace(/[-_]+/g, ' ')
    .trim();

  return {
    domain,
    title: inferredTitle || domain,
    favicon: toAbsoluteUrl('/favicon.ico', parsed),
  };
}

