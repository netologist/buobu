"use client";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TasksViewWrapper } from "@/components/kanban/TasksViewWrapper";
import { LandingPage } from "@/components/landing/LandingPage";
import { MobileResourceGate } from "@/components/layout/MobileResourceGate";

export default function KanbanViewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <MobileResourceGate>
      <TasksViewWrapper>
        <KanbanBoard />
      </TasksViewWrapper>
    </MobileResourceGate>
  );
}
