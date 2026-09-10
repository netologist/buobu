"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type FullCalendarRef from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { Swimlane, Task } from "@/lib/types";
import {
  getAllTasks,
} from "@/lib/db";
import { AppLayout } from "@/components/layout/AppLayout";
import { TasksCalendarAgendaItem } from "@/components/kanban/TasksCalendarAgendaItem";
import { TasksCalendarPreviewDialog } from "@/components/kanban/TasksCalendarPreviewDialog";
import { useBoards } from "@/stores/hooks/use-boards";
import { filterItems } from "@/stores/swimlane-selection-store";
import { useDbStore } from "@/stores/db-store";
import { cn } from "@/lib/utils";
import { formatTimebox } from "@/lib/timeblocks/formatters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

const FullCalendar = dynamic(() => import("@/components/kanban/TasksCalendarFullCalendar"), {
  ssr: false,
});

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    boardId: string;
    swimlaneId: string;
    boardName: string;
    swimlaneName: string;
    priority: Task["priority"];
    swimlaneColor?: string;
    timeboxMinutes?: number | null;
  };
};

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return `rgba(0, 0, 0, ${alpha})`;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TasksCalendar() {
  const db = useDbStore((s) => s.db);
  const calendarRef = useRef<FullCalendarRef | null>(null);
  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    labels: namingLabels,
    selections,
    hasSelections,
    selectedSwimlaneIds,
    isAllSelected,
    isArchivedSelectionMode,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
  } = useBoards();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarView, setCalendarView] = useState<"dayGridMonth" | "timeGridWeek">("timeGridWeek");
  const [currentTitle, setCurrentTitle] = useState("");
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const handleAddSwimlane = useCallback(async (boardId: string, data: Partial<Swimlane>) => {
    await storePutSwimlane({ ...data, boardId });
  }, [storePutSwimlane]);

  const handleEditSwimlane = useCallback(async (swimlane: Swimlane) => {
    await storePutSwimlane(swimlane);
  }, [storePutSwimlane]);

  const handleDeleteSwimlane = useCallback(async (swimlaneId: string) => {
    await storeDeleteSwimlane(swimlaneId);
  }, [storeDeleteSwimlane]);

  useEffect(() => {
    async function loadTasks() {
      const tasks = await getAllTasks();
      setAllTasks(tasks);
    }
    loadTasks();
  }, []);

  const boardNameMap = useMemo(() => {
    return Object.fromEntries(boards.map((board) => [board.id, board.name]));
  }, [boards]);

  const swimlaneNameMap = useMemo(() => {
    return Object.fromEntries(
      swimlanes.map((lane) => [lane.id, lane.name] as const)
    );
  }, [swimlanes]);

  const swimlaneColorMap = useMemo(() => {
    return Object.fromEntries(
      swimlanes.map((lane) => [lane.id, lane.color ?? ""] as const)
    );
  }, [swimlanes]);

  const weekStart = useMemo(() => {
    const value = boards[0]?.weekStart;
    if (value === undefined || value === null) return 1;
    const normalized = Math.min(6, Math.max(0, Number(value)));
    return Number.isFinite(normalized) ? normalized : 1;
  }, [boards]);

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "Events";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Events";
    }
    return `${selectedSwimlaneIds.size} ${namingLabels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, namingLabels.swimlanePlural, selectedSwimlaneIds, swimlanes]);

  const tasksWithDate = useMemo(() => {
    return allTasks.filter((task) =>
      Boolean(task.date) && (isArchivedSelectionMode ? task.archived === true : !task.archived)
    );
  }, [allTasks, isArchivedSelectionMode]);

  const filteredTasks = useMemo(() => filterItems(tasksWithDate, selections), [tasksWithDate, selections]);

  const visibleTasks = useMemo(() => {
    let tasks = filteredTasks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q)
      );
    }

    return [...tasks].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }, [filteredTasks, searchQuery]);

  const agendaTasks = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (calendarView === "dayGridMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      const dayOfWeek = now.getDay();
      const diff = (dayOfWeek - weekStart + 7) % 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    return visibleTasks.filter((task) => {
      if (!task.date) return false;
      const taskDate = new Date(task.date);
      return taskDate >= startDate && taskDate <= endDate;
    });
  }, [visibleTasks, calendarView, weekStart]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return visibleTasks.map((task) => {
      const rawDate = task.date as string;
      const hasTime = rawDate.includes("T");
      let end: string | undefined;
      if (hasTime && task.timeboxMinutes && task.timeboxMinutes > 0) {
        const startMs = new Date(rawDate).getTime();
        end = new Date(startMs + task.timeboxMinutes * 60 * 1000).toISOString();
      }
      return {
        id: task.id,
        title: task.title,
        start: rawDate,
        ...(end ? { end } : {}),
        allDay: !hasTime,
        extendedProps: {
          boardId: task.boardId,
          swimlaneId: task.swimlaneId,
          boardName: boardNameMap[task.boardId] ?? `Unknown ${namingLabels.board.toLowerCase()}`,
          swimlaneName: swimlaneNameMap[task.swimlaneId] ?? `Unknown ${namingLabels.swimlane.toLowerCase()}`,
          priority: task.priority ?? "medium",
          swimlaneColor: swimlaneColorMap[task.swimlaneId] ?? undefined,
          timeboxMinutes: task.timeboxMinutes,
        },
      };
    });
  }, [
    visibleTasks,
    boardNameMap,
    namingLabels.board,
    namingLabels.swimlane,
    swimlaneNameMap,
    swimlaneColorMap,
  ]);

  const archivedSwimlaneIdSet = useMemo(
    () => new Set(swimlanes.filter((s) => s.archived).map((s) => s.id)),
    [swimlanes]
  );
  const countsBySwimlane = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of allTasks) {
      if (!Boolean(task.date)) continue;
      const inArchivedSwimlane = archivedSwimlaneIdSet.has(task.swimlaneId);
      if (inArchivedSwimlane ? task.archived === true : (isArchivedSelectionMode ? task.archived === true : !task.archived)) {
        map[task.swimlaneId] = (map[task.swimlaneId] || 0) + 1;
      }
    }
    return map;
  }, [allTasks, isArchivedSelectionMode, archivedSwimlaneIdSet]);

  const totalEventsCount = filteredTasks.filter((t) =>
    Boolean(t.date) && (isArchivedSelectionMode ? t.archived === true : !t.archived)
  ).length;

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        <span className="text-[10px] text-muted-foreground">
          {calendarView === "dayGridMonth" ? "Month" : "Week"}
        </span>
      </div>

      <div className="relative border-b px-3 py-2">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events…"
          className="h-7 pl-7 text-xs"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {agendaTasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No events for this {calendarView === "dayGridMonth" ? "month" : "week"}
            </div>
          ) : (
            agendaTasks.map((task) => (
              <TasksCalendarAgendaItem
                key={task.id}
                task={task}
                isActive={previewTask?.id === task.id}
                onClick={() => setPreviewTask(task)}
                swimlaneColor={swimlaneColorMap[task.swimlaneId]}
                swimlaneName={swimlaneNameMap[task.swimlaneId]}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );

  const rightPanel = (
    <div className="flex flex-1 flex-col bg-background overflow-hidden p-2 md:p-4">
      <div className="mb-3 md:mb-4 flex flex-wrap items-center justify-between gap-2 md:gap-3">
        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm"
            onClick={() => calendarRef.current?.getApi().prev()}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm"
            onClick={() => calendarRef.current?.getApi().next()}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs md:h-9 md:px-3 md:text-sm"
            onClick={() => calendarRef.current?.getApi().today()}
          >
            Today
          </Button>
        </div>
        <div className="order-last w-full text-center text-xs font-semibold md:order-0 md:w-auto md:text-sm">{currentTitle}</div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {[
            { id: "dayGridMonth" as const, label: "Month" },
            { id: "timeGridWeek" as const, label: "Week" },
          ].map((view) => (
            <Button
              key={view.id}
              size="sm"
              variant={calendarView === view.id ? "default" : "ghost"}
              className={cn("h-8", calendarView === view.id ? "" : "text-muted-foreground")}
              onClick={() => {
                setCalendarView(view.id);
                const api = calendarRef.current?.getApi();
                if (api) {
                  api.changeView(view.id);
                }
              }}
            >
              {view.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border bg-background">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          height="100%"
          headerToolbar={false}
          dayMaxEvents={3}
          displayEventTime={true}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
          nowIndicator={true}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          scrollTime="06:00:00"
          firstDay={weekStart}
          events={calendarEvents}
          datesSet={(info) => {
            setCurrentTitle(info.view.title);
          }}
          eventDidMount={(info) => {
            const color = info.event.extendedProps.swimlaneColor as string | undefined;
            if (!color) return;
            const isDarkTheme = document.documentElement.classList.contains("dark");
            info.el.style.backgroundColor = hexToRgba(color, isDarkTheme ? 0.3 : 0.18);
            info.el.style.borderColor = hexToRgba(color, isDarkTheme ? 0.72 : 1);
          }}
          eventClassNames={(arg) => {
            const priority = arg.event.extendedProps.priority as Task["priority"];
            if (!priority) return [];
            return [`fc-priority-${priority}`];
          }}
          eventContent={(arg) => {
            const timebox = arg.event.extendedProps.timeboxMinutes as number | null | undefined;
            return (
              <div className="space-y-1 py-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold leading-tight">
                  {arg.timeText ? (
                    <span className="text-[10px] text-muted-foreground">
                      {arg.timeText}
                    </span>
                  ) : null}
                  <span>{arg.event.title}</span>
                </div>
                {timebox != null && timebox > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    ⏱ {formatTimebox(timebox)}
                  </div>
                )}
              </div>
            );
          }}
          eventClick={(info) => {
            const task = allTasks.find((t) => t.id === info.event.id);
            if (task) setPreviewTask(task);
          }}
        />
      </div>

      <TasksCalendarPreviewDialog
        task={previewTask}
        open={Boolean(previewTask)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTask(null);
          }
        }}
        boardName={previewTask ? boardNameMap[previewTask.boardId] ?? "Unknown" : undefined}
        swimlaneName={previewTask ? swimlaneNameMap[previewTask.swimlaneId] ?? "Unknown" : undefined}
        swimlaneColor={previewTask ? swimlaneColorMap[previewTask.swimlaneId] ?? undefined : undefined}
      />
    </div>
  );

  return (
    <AppLayout
      sidebarConfig={{
        boards: activeBoards,
        swimlanes: activeSwimlanes,
        allBoards: boards,
        allSwimlanes: swimlanes,
        swimlaneCounts: countsBySwimlane,
        allItemVisible: true,
        allItemLabel: "Events",
        allItemCount: totalEventsCount,
        isArchivedSelectionMode,
        onAddSwimlane: handleAddSwimlane,
        onEditSwimlane: handleEditSwimlane,
        onDeleteSwimlane: handleDeleteSwimlane,
        db,
      }}
      middlePanel={middlePanel}
      rightPanel={rightPanel}
      middlePanelClassName="w-72"
    />
  );
}
