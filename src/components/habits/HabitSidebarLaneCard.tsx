import { memo, type CSSProperties } from "react";
import Link from "next/link";
import { Archive, Pencil, Timer, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Habit, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";

type HabitSidebarLaneCardProps = {
  lane: Swimlane;
  laneHabits: Habit[];
  highlightedHabitId?: string | null;
  highlightedSwimlaneId?: string | null;
  onOpenChainDialog: (habit: Habit) => void;
  onOpenEditDialog: (habit: Habit) => void;
  onArchiveHabit: (habit: Habit) => void;
  onDeleteHabit: (habit: Habit) => void;
  onOpenAddHabitDialog: (swimlaneId: string) => void;
};

export const HabitSidebarLaneCard = memo(function HabitSidebarLaneCard({
  lane,
  laneHabits,
  highlightedHabitId,
  highlightedSwimlaneId,
  onOpenChainDialog,
  onOpenEditDialog,
  onArchiveHabit,
  onDeleteHabit,
  onOpenAddHabitDialog,
}: HabitSidebarLaneCardProps) {
  const isSwimlaneHighlighted = highlightedSwimlaneId === lane.id;
  return (
    <div
      key={lane.id}
      data-swimlane-id={lane.id}
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        isSwimlaneHighlighted && "border-primary/50 ring-1 ring-primary/20",
      )}
    >
      <div
        className="border-l-[3px] border-l-(--lane-color)"
        style={{ "--lane-color": lane.color ?? "#6B7280" } as CSSProperties}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/habits?swimlane=${lane.id}`}
                className="text-sm font-semibold truncate hover:text-emerald-600 transition-colors"
              >
                {lane.name}
              </Link>
              {lane.label && (
                <Badge variant="secondary" className="text-[9px] shrink-0">
                  {lane.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {laneHabits.length > 0 && (
          <div className="px-3 py-2 space-y-2">
            {laneHabits.map((habit) => {
              const isTimeblockProjection = habit.sourceType === "timeblock";
              return (
              <div
                key={habit.id}
                data-habit-id={habit.id}
                className={cn(
                  "group flex h-8 items-center gap-2 rounded px-1.5 transition-colors hover:bg-muted",
                  highlightedHabitId === habit.id && "border border-primary/40 bg-primary/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenChainDialog(habit)}
                  className="flex-1 text-left text-sm font-medium hover:text-emerald-600 transition-colors truncate"
                  title="View yearly chain"
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    {isTimeblockProjection ? <Timer className="h-3 w-3 shrink-0 text-blue-500" /> : null}
                    <span className="truncate">{habit.title}</span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onOpenEditDialog(habit)}
                  title="Edit habit"
                  disabled={isTimeblockProjection}
                >
                  <Pencil className="h-2 w-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onArchiveHabit(habit)}
                  title="Archive habit"
                  disabled={isTimeblockProjection}
                >
                  <Archive className="h-2 w-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive/80 opacity-70 transition-opacity hover:text-destructive hover:opacity-100 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onDeleteHabit(habit)}
                  title="Delete habit"
                  disabled={isTimeblockProjection}
                >
                  <Trash2 className="h-2 w-2" />
                </Button>
              </div>
              );
            })}
          </div>
        )}
      </div>
      {laneHabits.length === 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground">No habits yet.</div>
      )}
      <button
        className="flex w-full items-center gap-2 border-t px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        onClick={() => onOpenAddHabitDialog(lane.id)}
      >
        + Add habit
      </button>
    </div>
  );
});
