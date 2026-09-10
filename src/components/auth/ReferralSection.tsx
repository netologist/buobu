"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Loader2,
  Users,
  RefreshCw,
  CalendarClock,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  fetchReferralInfo,
  regenerateReferralCode,
  type ReferralInfo,
} from "@/lib/referral";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// -----------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------

function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Uses</span>
        <span className="font-medium text-foreground">
          {used} / {max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            used >= max ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UseRow({ ordinal, usedAt }: { ordinal: number; usedAt: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md bg-muted/40 px-3 py-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        {ordinal}
      </span>
      <span className="text-sm text-muted-foreground">
        User #{ordinal} joined{" "}
        <span className="font-medium text-foreground">{formatDate(usedAt)}</span>
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export function ReferralSection() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const data = await fetchReferralInfo(token);
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy() {
    if (!info) return;
    await navigator.clipboard.writeText(info.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const result = await regenerateReferralCode(token);
      if (!result.ok) {
        if (result.reason === "not_expired") {
          setRegenError("Your code hasn't expired yet. You can regenerate it once it expires.");
        } else {
          setRegenError("Failed to regenerate code. Try again.");
        }
        return;
      }
      await load();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to regenerate code");
    } finally {
      setRegenerating(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !info) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error ?? "Could not load referral info."}
      </div>
    );
  }

  const days = info.expired ? 0 : daysUntil(info.expires_at);

  return (
    <div className="space-y-5">
      {/* Header -------------------------------------------------------- */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Gift className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Your referral code</p>
          <p className="text-xs text-muted-foreground">
            Share this code with friends to invite them to Buobu.
          </p>
        </div>
      </div>

      {/* Code input + copy --------------------------------------------- */}
      {info.expired ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            <CalendarClock className="h-4 w-4 shrink-0" />
            Your code expired on {formatDate(info.expires_at)}. Generate a new one to keep
            inviting friends.
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Generate new code
          </Button>
          {regenError && (
            <p className="text-xs text-destructive">{regenError}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={info.code}
            className="font-mono text-base tracking-widest"
            aria-label="Your referral code"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleCopy}
            aria-label="Copy referral code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Usage bar ----------------------------------------------------- */}
      <UsageBar used={info.uses_count} max={info.max_uses} />

      {/* Expiry -------------------------------------------------------- */}
      {!info.expired && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          Expires in{" "}
          <span className="font-medium text-foreground">{days} day{days !== 1 ? "s" : ""}</span>
          {" "}({formatDate(info.expires_at)})
        </div>
      )}

      {/* Uses list ----------------------------------------------------- */}
      {info.uses.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            People who joined with your code
          </div>
          <div className="space-y-1.5">
            {info.uses.map((u) => (
              <UseRow key={u.ordinal} ordinal={u.ordinal} usedAt={u.used_at} />
            ))}
          </div>
        </div>
      )}

      {info.uses_count === 0 && !info.expired && (
        <p className="text-xs text-muted-foreground">
          Nobody has used your code yet. Share it and help grow the community!
        </p>
      )}

      {/* Future rewards note ------------------------------------------- */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Rewards coming soon.</span> Every referral
        helps us grow — thank you for spreading the word!
      </div>
    </div>
  );
}
