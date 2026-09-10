"use client";

import Link from "next/link";
import { Archive, Clock, Flame, Package, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";
import { cn } from "@/lib/utils";

export type KanbanSwimlanePanelRow = {
  laneId: string;
  laneName: string;
  laneLabel?: string | null;
  laneColor?: string | null;
  laneDeadline?: string | null;
  laneDeadlineLabel?: string | null;
  laneDeadlineHover?: string | null;
  taskCount: number;
  doneCount: number;
  pomodoroCount: number;
  habitCount: number;
  backlogCount: number;
  archivedCount: number;
  currentTotal: number;
  scheduledTotal: number;
  scheduledCount: number;
  currency: string;
};

export type KanbanSwimlanePanelProps = {
  headerLabel: string;
  headerCount: number;
  rows: KanbanSwimlanePanelRow[];
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  onOpenBacklog: (laneId: string) => void;
  onOpenArchive: (laneId: string) => void;
  onOpenPomodoros: (laneId: string) => void;
  onOpenCurrentTransactions: (laneId: string) => void;
  onOpenScheduledTransactions: (laneId: string) => void;
};

export function KanbanSwimlanePanel({
  headerLabel,
  headerCount,
  rows,
  scrollRef,
  onScroll,
  onOpenBacklog,
  onOpenArchive,
  onOpenPomodoros,
  onOpenCurrentTransactions,
  onOpenScheduledTransactions,
}: KanbanSwimlanePanelProps) {
  return (
    <>
      <div className="shrink-0 border-b px-3 py-3 min-h-14">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {headerLabel}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {headerCount}
          </Badge>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
      >
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div
              key={row.laneId}
              data-swimlane-id={row.laneId}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div
                className="flex items-center gap-2 px-3 py-2.5 border-b"
                style={{ borderLeftWidth: 3, borderLeftColor: row.laneColor ?? "var(--muted-foreground)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/habits?swimlane=${row.laneId}`}
                      className="text-sm font-semibold truncate transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                    >
                      {row.laneName}
                    </Link>
                    {row.laneLabel && (
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {row.laneLabel}
                      </Badge>
                    )}
                  </div>
                  {row.laneDeadline && row.laneDeadlineLabel && (
                    <p
                      className="mt-0.5 text-[10px] text-muted-foreground"
                      title={row.laneDeadlineHover ?? row.laneDeadline}
                    >
                      <Target className="inline h-3 w-3 mr-0.5" />
                      {row.laneDeadlineLabel}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-px bg-muted/40">
                <div className="bg-card px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums">{row.taskCount}</p>
                  <p className="text-[9px] text-muted-foreground">tasks</p>
                </div>
                <div className="bg-card px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{row.doneCount}</p>
                  <p className="text-[9px] text-muted-foreground">done</p>
                </div>
                <div className="bg-card px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums">{row.pomodoroCount}</p>
                  <p className="text-[9px] text-muted-foreground">🍅</p>
                </div>
                <div className="bg-card px-2 py-1.5 text-center">
                  <p className="text-sm font-bold tabular-nums">{row.habitCount}</p>
                  <p className="text-[9px] text-muted-foreground">habits</p>
                </div>
              </div>

              <div className="px-3 py-2 space-y-1">
                <button
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => onOpenBacklog(row.laneId)}
                >
                  <Package className="h-3 w-3" />
                  <span className="flex-1 text-left">
                    {row.backlogCount === 0 ? "Add to backlog" : `${row.backlogCount} backlog`}
                  </span>
                </button>

                {row.archivedCount > 0 && (
                  <button
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => onOpenArchive(row.laneId)}
                  >
                    <Archive className="h-3 w-3" />
                    <span className="flex-1 text-left">{row.archivedCount} archived</span>
                  </button>
                )}

                {row.pomodoroCount > 0 && (
                  <button
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    onClick={() => onOpenPomodoros(row.laneId)}
                  >
                    <Timer className="h-3 w-3" />
                    <span className="flex-1 text-left">{row.pomodoroCount} pomodoros</span>
                  </button>
                )}

                {row.habitCount > 0 && (
                  <Link
                    href={`/habits?swimlane=${row.laneId}`}
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Flame className="h-3 w-3" />
                    <span className="flex-1 text-left">{row.habitCount} habits</span>
                  </Link>
                )}

                {row.currentTotal !== 0 && (
                  <button
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs transition-colors hover:bg-muted"
                    onClick={() => onOpenCurrentTransactions(row.laneId)}
                  >
                    {row.currentTotal > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                    )}
                    <span
                      className={cn(
                        "flex-1 text-left font-medium",
                        row.currentTotal > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {row.currentTotal > 0 ? "" : "-"}
                      {formatAmountWithSymbol(Math.abs(row.currentTotal), row.currency)}
                    </span>
                  </button>
                )}

                {row.scheduledCount > 0 && (
                  <button
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs text-blue-600 dark:text-blue-400 transition-colors hover:bg-muted"
                    onClick={() => onOpenScheduledTransactions(row.laneId)}
                  >
                    <Clock className="h-3 w-3" />
                    <span className="flex-1 text-left font-medium">
                      {row.scheduledTotal > 0 ? "" : "-"}
                      {formatAmountWithSymbol(Math.abs(row.scheduledTotal), row.currency)} scheduled
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
