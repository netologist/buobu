"use client";

import { useState } from "react";
import { Sparkles, Zap, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CappedFeature } from "@/lib/subscriptions/limits";
import { startCheckout } from "@/lib/subscriptions/checkout";

// ---------------------------------------------------------------------------
// Feature display metadata
// ---------------------------------------------------------------------------

const FEATURE_META: Record<
  CappedFeature,
  { label: string; icon: string; description: string }
> = {
  boards: {
    label: "Boards",
    icon: "🗂️",
    description: "Organise your work into multiple project boards.",
  },
  swimlanesPerBoard: {
    label: "Swimlanes",
    icon: "🏊",
    description: "Add more swimlanes to break a board into focused sections.",
  },
  routines: {
    label: "Routines",
    icon: "🔁",
    description: "Automate recurring tasks and scheduled activities.",
  },
  habits: {
    label: "Habits",
    icon: "✅",
    description: "Track daily habits and build consistent streaks.",
  },
  bookmarks: {
    label: "Bookmarks",
    icon: "🔖",
    description: "Save and organise links from across the web.",
  },
  whiteboards: {
    label: "Whiteboards",
    icon: "🖼️",
    description: "Capture ideas visually with infinite canvas boards.",
  },
  mindmaps: {
    label: "Mindmaps",
    icon: "🧠",
    description: "Create branching mindmaps to explore connected ideas.",
  },
};

const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY ?? "";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: CappedFeature;
  current: number;
  limit: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  current,
  limit,
}: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const meta = FEATURE_META[feature];

  async function handleUpgrade() {
    setLoading(true);
    try {
      await startCheckout(YEARLY_PRICE_ID);
    } catch {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{meta.icon}</span>
            <span>{meta.label} limit reached</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p className="text-sm text-muted-foreground">{meta.description}</p>

              {/* Limit indicator */}
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Free plan</span>
                <span className="font-semibold tabular-nums">
                  {current} / {limit}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                Upgrade to{" "}
                <span className="font-semibold text-foreground">Buobu Plus</span>{" "}
                to unlock unlimited {meta.label.toLowerCase()} and all other Plus
                features — cloud sync, API keys, MCP, and more.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full gap-2"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Upgrade to Plus
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Not now
          </Button>
        </div>

        {/* Plus feature list */}
        <ul className="space-y-1.5 border-t pt-3 text-xs text-muted-foreground">
          {[
            { icon: <Zap className="h-3 w-3 text-yellow-500" />, text: "Cloud sync across all devices" },
            { icon: <Zap className="h-3 w-3 text-yellow-500" />, text: "Unlimited boards, habits, routines & more" },
            { icon: <Zap className="h-3 w-3 text-yellow-500" />, text: "API keys & MCP integration" },
            { icon: <Zap className="h-3 w-3 text-yellow-500" />, text: "7-day free trial — no card surprises" },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              {icon}
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
