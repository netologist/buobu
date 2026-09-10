/**
 * Simple in-memory rate limiter (sliding window).
 * Suitable for single-instance deployments.
 * Replace with Upstash Ratelimit for distributed environments.
 */

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60;

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

export function checkRateLimit(keyId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  let entry = windows.get(keyId);

  if (!entry) {
    entry = { timestamps: [] };
    windows.set(keyId, entry);
  }

  // Prune old timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: MAX_REQUESTS - entry.timestamps.length };
}

// Periodically clean up stale entries (every 5 minutes)
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, entry] of windows) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) windows.delete(key);
    }
  }, 300_000).unref?.();
}
