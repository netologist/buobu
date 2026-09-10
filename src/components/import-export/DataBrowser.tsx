"use client";

import { useState } from "react";
import {
  CheckSquare,
  Activity,
  FileText,
  Bookmark as BookmarkIcon,
  LayoutDashboard,
  GitFork,
  X,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ExportFileData } from "@/lib/import-export/types";
import { useDataBrowser, type DataBrowserSection } from "./useDataBrowser";
import { TasksSection } from "./sections/TasksSection";
import { HabitsSection } from "./sections/HabitsSection";
import { NotesSection } from "./sections/NotesSection";
import { BookmarksSection } from "./sections/BookmarksSection";
import { WhiteboardsSection } from "./sections/WhiteboardsSection";
import { MindmapsSection } from "./sections/MindmapsSection";
import { DetailSheet } from "./details/DetailSheet";
import { TaskDetail } from "./details/TaskDetail";
import { HabitDetail } from "./details/HabitDetail";
import { NoteDetail } from "./details/NoteDetail";
import { BookmarkDetail } from "./details/BookmarkDetail";
import { WhiteboardDetail } from "./details/WhiteboardDetail";
import { MindmapDetail } from "./details/MindmapDetail";

type DataBrowserProps = {
  data: ExportFileData;
  exportedAt?: string;
};

type SectionConfig = {
  id: DataBrowserSection;
  label: string;
  icon: React.ReactNode;
};

const SECTIONS: SectionConfig[] = [
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="size-4" /> },
  { id: "habits", label: "Habits", icon: <Activity className="size-4" /> },
  { id: "notes", label: "Notes", icon: <FileText className="size-4" /> },
  { id: "bookmarks", label: "Bookmarks", icon: <BookmarkIcon className="size-4" /> },
  { id: "whiteboards", label: "Whiteboards", icon: <LayoutDashboard className="size-4" /> },
  { id: "mindmaps", label: "Mindmaps", icon: <GitFork className="size-4" /> },
];

export function DataBrowser({ data, exportedAt }: DataBrowserProps) {
  const {
    filter,
    activeSection,
    setActiveSection,
    boardMap,
    swimlaneMap,
    swimlanesByBoard,
    toggleBoard,
    toggleSwimlane,
    clearFilter,
    tasks,
    habits,
    habitLogsByHabit,
    notes,
    bookmarks,
    whiteboards,
    mindmaps,
    counts,
    boards,
    detailItem,
    openDetail,
    closeDetail,
  } = useDataBrowser(data);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());

  const hasFilter = filter.boardIds.length > 0 || filter.swimlaneIds.length > 0;

  const toggleBoardExpand = (boardId: string) => {
    setExpandedBoards((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      return next;
    });
  };

  const activeCount = counts[activeSection];

  return (
    <>
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
          {/* Filter header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="size-3" />
              Filters
            </span>
            {hasFilter && (
              <button
                onClick={clearFilter}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                <X className="size-3" />
                Clear
              </button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {boards.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                  No boards in data
                </p>
              ) : (
                boards.map((board) => {
                  const isBoardSelected = filter.boardIds.includes(board.id);
                  const isExpanded = expandedBoards.has(board.id);
                  const boardSwimlanes = swimlanesByBoard.get(board.id) ?? [];

                  return (
                    <div key={board.id}>
                      {/* Board row */}
                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer select-none",
                          "hover:bg-accent transition-colors",
                          isBoardSelected && "bg-primary/10 text-primary font-medium"
                        )}
                      >
                        {boardSwimlanes.length > 0 ? (
                          <button
                            onClick={() => toggleBoardExpand(board.id)}
                            className="flex shrink-0 items-center justify-center size-4"
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}

                        <button
                          className="flex-1 text-left text-xs font-medium line-clamp-1"
                          onClick={() => toggleBoard(board.id)}
                        >
                          {board.name}
                        </button>

                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {isBoardSelected ? "✓" : ""}
                        </span>
                      </div>

                      {/* Swimlane rows */}
                      {isExpanded && boardSwimlanes.length > 0 && (
                        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                          {boardSwimlanes.map((sl) => {
                            const isSwimlaneSelected = filter.swimlaneIds.includes(sl.id);
                            return (
                              <button
                                key={sl.id}
                                onClick={() => toggleSwimlane(sl.id)}
                                className={cn(
                                  "w-full text-left rounded-md px-2 py-1 text-[11px] transition-colors",
                                  "hover:bg-accent",
                                  isSwimlaneSelected && "bg-primary/10 text-primary font-medium"
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  {sl.color && (
                                    <span
                                      className="size-2 rounded-full shrink-0"
                                      style={{ backgroundColor: sl.color }}
                                    />
                                  )}
                                  <span className="line-clamp-1">{sl.name}</span>
                                  {isSwimlaneSelected && (
                                    <span className="ml-auto shrink-0">✓</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Active filter summary */}
          {hasFilter && (
            <div className="border-t px-3 py-2 text-[10px] text-muted-foreground space-y-0.5">
              {filter.boardIds.length > 0 && (
                <p>
                  {filter.boardIds.length} board{filter.boardIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
              {filter.swimlaneIds.length > 0 && (
                <p>
                  {filter.swimlaneIds.length} swimlane{filter.swimlaneIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </aside>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top nav: section tabs */}
        <div className="flex items-center gap-0.5 border-b px-3 py-1.5 overflow-x-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 mr-1 shrink-0"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Hide filters" : "Show filters"}
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1 shrink-0" />

          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const count = counts[section.id];
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {section.icon}
                {section.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {exportedAt && (
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground hidden sm:inline">
              Exported {new Date(exportedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {/* Section content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {activeSection === "tasks" && (
              <TasksSection
                tasks={tasks}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(task) => openDetail({ type: "task", item: task })}
              />
            )}
            {activeSection === "habits" && (
              <HabitsSection
                habits={habits}
                habitLogsByHabit={habitLogsByHabit}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(habit) => openDetail({ type: "habit", item: habit })}
              />
            )}
            {activeSection === "notes" && (
              <NotesSection
                notes={notes}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(note) => openDetail({ type: "note", item: note })}
              />
            )}
            {activeSection === "bookmarks" && (
              <BookmarksSection
                bookmarks={bookmarks}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(bookmark) => openDetail({ type: "bookmark", item: bookmark })}
              />
            )}
            {activeSection === "whiteboards" && (
              <WhiteboardsSection
                whiteboards={whiteboards}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(wb) => openDetail({ type: "whiteboard", item: wb })}
              />
            )}
            {activeSection === "mindmaps" && (
              <MindmapsSection
                mindmaps={mindmaps}
                boardMap={boardMap}
                swimlaneMap={swimlaneMap}
                onSelect={(mm) => openDetail({ type: "mindmap", item: mm })}
              />
            )}
          </div>
        </ScrollArea>

        {/* Footer: total counts */}
        <div className="border-t px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
          <span className="font-medium text-foreground">
            {activeCount} {SECTIONS.find((s) => s.id === activeSection)?.label.toLowerCase()}
          </span>
          {hasFilter && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span>filtered</span>
              <button
                onClick={clearFilter}
                className="flex items-center gap-0.5 hover:text-foreground transition-colors"
              >
                <X className="size-3" />
                Clear filter
              </button>
            </>
          )}
          <span className="ml-auto">
            {Object.values(counts).reduce((a, b) => a + b, 0)} total items
          </span>
        </div>
      </div>
    </div>

    {/* Detail sheets – rendered outside the flex container so they overlay correctly */}
    {detailItem?.type === "task" && (() => {
      const d = detailItem as { type: "task"; item: import("@/lib/types").Task };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title} icon={<CheckSquare className="size-4" />}>
          <TaskDetail task={d.item} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    {detailItem?.type === "habit" && (() => {
      const d = detailItem as { type: "habit"; item: import("@/lib/types").Habit };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title} icon={<Activity className="size-4" />}>
          <HabitDetail habit={d.item} logs={habitLogsByHabit.get(d.item.id) ?? []} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    {detailItem?.type === "note" && (() => {
      const d = detailItem as { type: "note"; item: import("@/lib/types").Note };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title || "Untitled Note"} icon={<FileText className="size-4" />}>
          <NoteDetail note={d.item} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    {detailItem?.type === "bookmark" && (() => {
      const d = detailItem as { type: "bookmark"; item: import("@/lib/types").Bookmark };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title || d.item.domain || "Bookmark"} icon={<BookmarkIcon className="size-4" />}>
          <BookmarkDetail bookmark={d.item} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    {detailItem?.type === "whiteboard" && (() => {
      const d = detailItem as { type: "whiteboard"; item: import("@/lib/types").VisionBoardItem };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title || "Untitled Whiteboard"} icon={<LayoutDashboard className="size-4" />}>
          <WhiteboardDetail whiteboard={d.item} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    {detailItem?.type === "mindmap" && (() => {
      const d = detailItem as { type: "mindmap"; item: import("@/lib/types").Mindmap };
      return (
        <DetailSheet open onClose={closeDetail} title={d.item.title || "Untitled Mindmap"} icon={<GitFork className="size-4" />}>
          <MindmapDetail mindmap={d.item} board={boardMap.get(d.item.boardId ?? "")} swimlane={swimlaneMap.get(d.item.swimlaneId ?? "")} />
        </DetailSheet>
      );
    })()}
    </>
  );
}
