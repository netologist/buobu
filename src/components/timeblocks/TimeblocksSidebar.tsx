"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Archive,
  Trash2,
  RotateCcw,
  Clock,
  ChevronRight,
  ChevronDown,
  Repeat2,
  Flame,
} from "lucide-react";
import type { Timeblock, Swimlane, Board } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchivedTimeblocks, timeblockActions } from "@/stores/hooks/use-timeblocks";
import { useActiveHabits } from "@/stores/hooks/use-habits";
import { useActiveRoutines } from "@/stores/hooks/use-routines";
import { recurrenceSummary } from "@/lib/timeblocks/formatters";
import { cn } from "@/lib/utils";

type Props = {
  /** Timeblocks filtered to the currently selected swimlane(s) — passed in from TimeblocksBoard */
  filteredTimeblocks: Timeblock[];
  selectedTimeblockId: string | null;
  onSelect: (id: string) => void;
  onNew: (boardId?: string, swimlaneId?: string) => void;
  onEdit: (timeblock: Timeblock) => void;
  boards: Board[];
  swimlanes: Swimlane[];
};

export function TimeblocksSidebar({
  filteredTimeblocks,
  selectedTimeblockId,
  onSelect,
  onNew,
  onEdit,
  boards,
  swimlanes,
}: Props) {
  const archivedTimeblocks = useArchivedTimeblocks();

  const allHabits = useActiveHabits();
  const allRoutines = useActiveRoutines();

  const boardNameMap = useMemo(
    () => Object.fromEntries(boards.map((b) => [b.id, b.name])),
    [boards],
  );
  const swimlaneNameMap = useMemo(
    () => Object.fromEntries(swimlanes.map((s) => [s.id, s.name])),
    [swimlanes],
  );

  // displayList always uses filteredTimeblocks — archive mode is managed
  // globally via AppHeader's archive mode switch.
  const displayList = filteredTimeblocks;

  async function handleArchive(tb: Timeblock) {
    await timeblockActions.archive(tb.id);
  }

  async function handleUnarchive(tb: Timeblock) {
    await timeblockActions.unarchive(tb.id);
  }

  async function handleDelete(tb: Timeblock) {
    if (!confirm(`Permanently delete "${tb.title}"? This cannot be undone.`)) return;
    await timeblockActions.permanentDelete(tb.id);
  }

  return (
    <>
      {/* Boş ilk child — AppLayoutMiddlePanelContent'in [&>*:first-child]:hidden kuralı için */}
      <div />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <span className="text-sm font-semibold">Time Blocks</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => onNew()}
        >
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {displayList.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No time blocks in this swimlane yet.
          </div>
        )}

        {displayList.map((tb) => (
          <TimeblockItem
            key={tb.id}
            timeblock={tb}
            selected={selectedTimeblockId === tb.id}
            onSelect={() => onSelect(tb.id)}
            onEdit={() => onEdit(tb)}
            onArchive={() => handleArchive(tb)}
            onUnarchive={() => handleUnarchive(tb)}
            onDelete={() => handleDelete(tb)}
            showArchiveActions={tb.archived === true}
            linkedHabits={allHabits.filter((h) => h.timeblockId === tb.id)}
            linkedRoutines={allRoutines.filter((r) => r.timeblockId === tb.id)}
            boardName={boardNameMap[tb.boardId ?? ""]}
            swimlaneName={swimlaneNameMap[tb.swimlaneId ?? ""]}
          />
        ))}
      </div>
    </>
  );
}

type LinkedItem = { id: string; title: string };

function TimeblockItem({
  timeblock,
  selected,
  onSelect,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  showArchiveActions,
  linkedHabits,
  linkedRoutines,
  boardName,
  swimlaneName,
}: {
  timeblock: Timeblock;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  showArchiveActions: boolean;
  linkedHabits: LinkedItem[];
  linkedRoutines: LinkedItem[];
  boardName?: string;
  swimlaneName?: string;
}) {
  const summary = recurrenceSummary(timeblock.recurrence);
  const hasLinked = linkedHabits.length > 0 || linkedRoutines.length > 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="mx-2 mb-1 border-l-[3px] rounded-sm overflow-hidden"
      style={{ borderLeftColor: timeblock.color ?? "#3b82f6" }}
    >
      {/* Main row */}
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 transition-colors",
          selected
            ? "border border-primary/40 bg-muted"
            : "border border-transparent hover:bg-muted/50",
        )}
        onClick={onSelect}
      >
        {/* Expand toggle — only if there are linked items */}
        {hasLinked ? (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          >
            {expanded
              ? <ChevronDown className="size-3" />
              : <ChevronRight className="size-3" />}
          </button>
        ) : (
          <span className="size-3 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-snug">{timeblock.title}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5 shrink-0" />
            <span>{timeblock.startTime}–{timeblock.endTime}</span>
            <span className="mx-0.5">·</span>
            <span className="truncate">{summary}</span>
          </div>
          {(boardName ?? swimlaneName) && (
            <div className="hidden group-hover:flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
              {boardName && <span className="truncate">{boardName}</span>}
              {boardName && swimlaneName && <span className="shrink-0">·</span>}
              {swimlaneName && <span className="truncate">{swimlaneName}</span>}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="mr-2 size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {showArchiveActions ? (
              <DropdownMenuItem onSelect={onUnarchive}>
                <RotateCcw className="mr-2 size-3.5" />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={onArchive}>
                <Archive className="mr-2 size-3.5" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Linked habits & routines */}
      {hasLinked && expanded && (
        <div className="ml-5 mt-0.5 mb-1 space-y-0.5">
          {linkedHabits.map((h) => (
            <Link
              key={h.id}
              href="/habits"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Flame className="size-3 shrink-0 text-orange-400" />
              <span className="truncate">{h.title}</span>
            </Link>
          ))}
          {linkedRoutines.map((r) => (
            <Link
              key={r.id}
              href="/routines"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Repeat2 className="size-3 shrink-0 text-blue-400" />
              <span className="truncate">{r.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
