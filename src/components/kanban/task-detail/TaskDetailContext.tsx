"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { TaskDetailContextValue } from "./types";

const TaskDetailContext = createContext<TaskDetailContextValue | null>(null);

type TaskDetailProviderProps = TaskDetailContextValue & {
  children: ReactNode;
};

export function TaskDetailProvider({ children, ...value }: TaskDetailProviderProps) {
  return <TaskDetailContext.Provider value={value}>{children}</TaskDetailContext.Provider>;
}

export function useTaskDetailContext() {
  const context = useContext(TaskDetailContext);
  if (!context) {
    throw new Error("useTaskDetailContext must be used within TaskDetailProvider");
  }
  return context;
}
