"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { RoutinesBoard } from "@/components/routines/RoutinesBoard";
import { MobileResourceGate } from "@/components/layout/MobileResourceGate";

function RoutinesContent() {
  return (
    <MobileResourceGate>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <RoutinesBoard />
      </Suspense>
    </MobileResourceGate>
  );
}

export default function RoutinePage() {
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

  return <RoutinesContent />;
}
