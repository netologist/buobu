"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { HOME_PAGE_ENABLED } from "@/lib/feature-flags";
import { MobileResourceGate } from "@/components/layout/MobileResourceGate";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function HomeRoutePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (!HOME_PAGE_ENABLED) {
      const destination = isMobile ? "/tasks/list-view" : "/tasks/kanban-view";
      router.replace(destination);
    }
  }, [isAuthenticated, isLoading, router, isMobile]);

  if (isLoading || !isAuthenticated || !HOME_PAGE_ENABLED) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <MobileResourceGate>
      <HomeDashboard />
    </MobileResourceGate>
  );
}