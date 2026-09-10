"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function TasksPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    } else if (!isLoading && isAuthenticated) {
      const destination = isMobile ? "/tasks/list-view" : "/tasks/kanban-view";
      router.replace(destination);
    }
  }, [isLoading, isAuthenticated, router, isMobile]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return null;
}
