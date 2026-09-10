"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TasksListBoard } from "@/components/kanban/TasksListBoard";
import { TasksViewWrapper } from "@/components/kanban/TasksViewWrapper";
import { useAuthContext } from "@/components/auth/AuthProvider";

export default function ListViewPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <TasksViewWrapper>
      <TasksListBoard />
    </TasksViewWrapper>
  );
}
