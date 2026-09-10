"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTimer } from "@/lib/formatters/timerFormatter";
import type { Task } from "@/lib/types";

type PomodoroIndicatorProps = {
  task: Task | null;
  phase: "work" | "break" | "idle";
  workMinutes: number;
  breakMinutes: number;
  remaining: number;
  onCancel: () => void;
};

export function PomodoroIndicator({
  task,
  phase,
  workMinutes,
  breakMinutes,
  remaining,
  onCancel,
}: PomodoroIndicatorProps) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-2xl rounded-xl bg-background p-8 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Pomodoro {phase === "work" ? "Focus" : "Break"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{task.title}</h2>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 text-center">
          <p className="text-6xl font-semibold tracking-tight">{formatTimer(remaining)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {phase === "work" ? `${workMinutes} min focus` : `${breakMinutes} min break`}
          </p>
        </div>
        <div className="mt-8 flex items-center justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
