"use client";

import { Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiKeysManager } from "./ApiKeysManager";
import { useEntitlements } from "@/stores/entitlements-store";
import { startCheckout } from "@/lib/subscriptions/checkout";

const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY ?? "";

interface McpSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null | undefined;
}

export function McpSettingsModal({
  open,
  onOpenChange,
  userId,
}: McpSettingsModalProps) {
  const { isPlus } = useEntitlements();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>MCP Settings</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {!isPlus ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/40 px-6 py-8 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-semibold">Plus feature</p>
                <p className="text-sm text-muted-foreground">
                  MCP integration and API keys are available on{" "}
                  <span className="font-semibold text-foreground">Buobu Plus</span>.
                  Upgrade to connect AI tools and access your data via the Model Context Protocol.
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => startCheckout(YEARLY_PRICE_ID)}
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Plus
              </Button>
            </div>
          ) : userId ? (
            <ApiKeysManager userId={userId} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}