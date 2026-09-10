"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { DailyBriefingModal } from "./DailyBriefingModal";
import {
  useApprovalRequiredRoutines,
  useRoutineLogsSubscription,
  useRoutineLogs,
  useRoutinesSubscription,
} from "@/stores/hooks/use-routines";
import {
  useActiveHabits,
  useHabitLogs,
  useHabitLogsSubscription,
  useHabitsSubscription,
} from "@/stores/hooks/use-habits";
import { useActiveTasks, useTasksSubscription } from "@/stores/hooks/use-tasks";
import { useTimeblocksSubscription } from "@/stores/hooks/use-timeblocks";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { getDateKeyFromIsoLike, getTodayDateKey } from "@/lib/date";
import { useBoards } from "@/stores/hooks/use-boards";
import { filterItems } from "@/stores/swimlane-selection-store";

type DailyBriefingContextType = {
  openBriefing: () => void;
  pendingCount: number;
};

const DailyBriefingContext = createContext<DailyBriefingContextType | undefined>(undefined);

export function useDailyBriefing(): DailyBriefingContextType {
  const ctx = useContext(DailyBriefingContext);
  if (!ctx) throw new Error("useDailyBriefing must be used within DailyBriefingProvider");
  return ctx;
}

export function DailyBriefingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuthContext();

  const [modalOpen, setModalOpen] = useState(false);

  useRoutinesSubscription();
  useRoutineLogsSubscription();
  useHabitsSubscription();
  useHabitLogsSubscription();
  useTasksSubscription();
  useTimeblocksSubscription();

  // ── Data for pending count ────────────────────────────────────────────────
  const approvalRoutines = useApprovalRequiredRoutines();
  const routineLogs = useRoutineLogs();
  const activeHabits = useActiveHabits();
  const habitLogs = useHabitLogs();
  const allTasks = useActiveTasks();
  const { selections } = useBoards();

  const today = getTodayDateKey();
  const todayDayOfWeek = new Date().getDay();

  const pendingCount = useMemo(() => {
    // Routines: approval-required and not yet logged today
    const pendingRoutines = approvalRoutines.filter(
      (r) => !routineLogs.some((log) => log.routineId === r.id && log.date === today),
    ).length;

    // Habits: due today (in selection + frequency) and not yet logged
    const habitsInSelection = filterItems(activeHabits, selections);
    const pendingHabits = habitsInSelection.filter((h) => {
      const dueToday =
        !h.frequencyDays || h.frequencyDays.length === 0
          ? true
          : h.frequencyDays.includes(todayDayOfWeek);
      if (!dueToday) return false;
      return !habitLogs.some(
        (log) => log.habitId === h.id && getDateKeyFromIsoLike(log.date) === today,
      );
    }).length;

    // Tasks: scheduled today and not completed
    const pendingTasks = allTasks.filter(
      (t) =>
        !t.archived &&
        getDateKeyFromIsoLike(t.date ?? null) === today &&
        !t.completedAt,
    ).length;

    return pendingRoutines + pendingHabits + pendingTasks;
  }, [
    approvalRoutines,
    routineLogs,
    activeHabits,
    habitLogs,
    allTasks,
    selections,
    today,
    todayDayOfWeek,
  ]);

  const dismissForToday = useCallback(() => {
    setModalOpen(false);
  }, []);

  const openBriefing = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <DailyBriefingContext.Provider value={{ openBriefing, pendingCount }}>
      {children}

      {isAuthenticated && (
        <DailyBriefingModal open={modalOpen} onDismiss={dismissForToday} />
      )}

    </DailyBriefingContext.Provider>
  );
}
