// SSRF guard for the bookmark metadata fetcher.
//
// The previous implementation compared the hostname *string* against a list of
// private prefixes. That never resolves anything, so any DNS name pointing at an
// internal address passed ("169.254.169.254.nip.io"), as did every IPv6 literal,
// and `redirect: "follow"` made the request before any post-hoc check ran.
//
// This module validates the protocol, the literal address, and every address the
// hostname actually resolves to -- using the same resolver the runtime will use
// to connect -- and follows redirects manually so each hop is re-validated before
// the next request is issued.

/** Thrown when a URL is refused. Callers should surface this as a client error. */
export class UrlNotAllowedError extends Error {
  constructor(message = "URL is not allowed") {
    super(message);
    this.name = "UrlNotAllowedError";
  }
}

/** Thrown when the upstream request itself fails. */
export class UpstreamError extends Error {
  constructor(message = "Upstream request failed") {
    super(message);
    this.name = "UpstreamError";
  }
}

const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 8000;
const REDIRECT_STATUS: Record<number, true> = {
  301: true,
  302: true,
  303: true,
  307: true,
  308: true,
};

// ---------------------------------------------------------------- hostnames

const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".lan",
  ".intranet",
  ".corp",
  ".private",
];

function isBlockedHostname(host: string): boolean {
  if (host === "localhost" || host === "") return true;
  return BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

// ---------------------------------------------------------------- addresses

/** Strict dotted-quad. Returns four bytes, or null if this is not an IPv4 literal. */
export function parseIpv4(input: string): number[] | null {
  const parts = input.split(".");
  if (parts.length !== 4) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^(0|[1-9][0-9]{0,2})$/.test(part)) return null; // no leading zeros => no octal
    const n = Number(part);
    if (n > 255) return null;
    bytes.push(n);
  }
  return bytes;
}

/**
 * True when the address is not global unicast: loopback, private, link-local,
 * carrier-grade NAT, multicast, reserved, or a documentation range.
 */
export function isBlockedIpv4([a, b, c]: number[]): boolean {
  if (a === 0) return true; //                      0.0.0.0/8
  if (a === 10) return true; //                     10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; //                    127.0.0.0/8
  if (a === 169 && b === 254) return true; //       169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0) return true; //         192.0.0.0/24 and 192.0.2.0/24
  if (a === 192 && b === 88 && c === 99) return true; // 192.88.99.0/24
  if (a === 192 && b === 168) return true; //       192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24
  if (a >= 224) return true; //                     224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

/** Parses any IPv6 spelling, including a trailing dotted-quad, into 16 bytes. */
export function parseIpv6(input: string): number[] | null {
  let s = input;
  if (s.startsWith("[") && s.endsWith("]")) s = s.slice(1, -1);
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  if (s === "" || !s.includes(":")) return null;
  if (s.indexOf("::") !== s.lastIndexOf("::")) return null; // at most one "::"

  const compressed = s.indexOf("::");
  const left = compressed === -1 ? s : s.slice(0, compressed);
  const right = compressed === -1 ? "" : s.slice(compressed + 2);

  const toBytes = (groupText: string): number[] | null => {
    if (groupText === "") return [];
    const groups = groupText.split(":");
    const out: number[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group === "") return null;
      if (group.includes(".")) {
        if (i !== groups.length - 1) return null; // dotted quad must come last
        const v4 = parseIpv4(group);
        if (!v4) return null;
        out.push(...v4);
      } else {
        if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
        const n = parseInt(group, 16);
        out.push((n >> 8) & 0xff, n & 0xff);
      }
    }
    return out;
  };

  const head = toBytes(left);
  const tail = toBytes(right);
  if (!head || !tail) return null;

  if (compressed === -1) return head.length === 16 ? head : null;

  const gap = 16 - head.length - tail.length;
  if (gap < 1) return null; // "::" must stand for at least one group
  return [...head, ...new Array<number>(gap).fill(0), ...tail];
}

export function isBlockedIpv6(b: number[]): boolean {
  if (b.every((x) => x === 0)) return true; //                                  ::
  if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true; //      ::1
  // ::ffff:0:0/96 IPv4-mapped, ::/96 IPv4-compatible, 64:ff9b::/96 NAT64
  if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) {
    return isBlockedIpv4([b[12], b[13], b[14], b[15]]);
  }
  if (b.slice(0, 12).every((x) => x === 0)) return isBlockedIpv4([b[12], b[13], b[14], b[15]]);
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) {
    return isBlockedIpv4([b[12], b[13], b[14], b[15]]);
  }
  if ((b[0] & 0xfe) === 0xfc) return true; //                           fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; //          fe80::/10 link-local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true; //          fec0::/10 site-local
  if (b[0] === 0xff) return true; //                                    ff00::/8 multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // 2001:db8::/32
  if (b[0] === 0x20 && b[1] === 0x02) return isBlockedIpv4([b[2], b[3], b[4], b[5]]); // 6to4
  return false;
}

/** Resolves through the runtime's own resolver -- the same one `fetch` will use. */
async function resolveHostAddresses(host: string): Promise<string[]> {
  const answers: string[] = [];
  let resolved = false;

  for (const type of ["A", "AAAA"] as const) {
    try {
      answers.push(...(await Deno.resolveDns(host, type)));
      resolved = true;
    } catch (error) {
      if (error instanceof Deno.errors.NotCapable) throw error; // cannot verify => do not proceed
      // NotFound simply means this host has no record of that type.
    }
  }

  if (!resolved) throw new UrlNotAllowedError("Host could not be resolved");
  return answers;
}

function assertAddressAllowed(address: string): void {
  const v4 = parseIpv4(address);
  if (v4) {
    if (isBlockedIpv4(v4)) throw new UrlNotAllowedError();
    return;
  }
  const v6 = parseIpv6(address);
  if (v6) {
    if (isBlockedIpv6(v6)) throw new UrlNotAllowedError();
    return;
  }
  throw new UrlNotAllowedError("Unrecognised address");
}

/**
 * Throws `UrlNotAllowedError` unless the URL is http(s) and every address it
 * leads to is a public one.
 *
 * Residual risk: this validates the addresses the resolver returns, then `fetch`
 * resolves again, so a hostile authority that changes its answer between the two
 * lookups (DNS rebinding) is not fully ruled out -- closing that requires pinning
 * the connection to a specific IP, which `fetch` cannot do. Manual redirect
 * handling below means each hop is still validated, which is the material part
 * of the original finding.
 */
export async function assertUrlAllowed(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UrlNotAllowedError();

  const host = url.hostname.toLowerCase();
  const bare = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;

  if (parseIpv4(bare) || parseIpv6(bare)) {
    assertAddressAllowed(bare);
    return;
  }

  if (isBlockedHostname(bare)) throw new UrlNotAllowedError();

  for (const address of await resolveHostAddresses(bare)) {
    assertAddressAllowed(address);
  }
}

// ---------------------------------------------------------------- fetching

async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new UpstreamError("Response too large");

  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        chunks.push(value.subarray(0, value.byteLength - (total - MAX_BYTES)));
        break;
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const merged = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Fetches HTML, following at most `MAX_REDIRECTS` redirects manually so that
 * every hop is validated *before* the request is made, and never buffering more
 * than `MAX_BYTES`.
 */
export async function fetchHtmlSafely(startUrl: string): Promise<{ html: string; finalUrl: string }> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = new URL(current);
    await assertUrlAllowed(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "buobu-bookmark-bot/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new UpstreamError("Upstream request timed out");
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (REDIRECT_STATUS[response.status]) {
      const location = response.headers.get("location");
      await response.body?.cancel().catch(() => {});
      if (!location) throw new UpstreamError("Redirect without a Location header");
      current = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new UpstreamError("Upstream returned a non-OK status");
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html")) {
      await response.body?.cancel().catch(() => {});
      throw new UpstreamError("Upstream did not return HTML");
    }

    return { html: await readCapped(response), finalUrl: url.toString() };
  }

  throw new UpstreamError("Too many redirects");
}
