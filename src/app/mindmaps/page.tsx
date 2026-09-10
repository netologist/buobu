"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { MindmapBoard } from "@/components/mindmap/MindmapBoard";
import { MobileResourceGate } from "@/components/layout/MobileResourceGate";
import { useAuthContext } from "@/components/auth/AuthProvider";

function MindmapContent() {
  return (
    <MobileResourceGate>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <MindmapBoard />
      </Suspense>
    </MobileResourceGate>
  );
}

export default function MindmapPage() {
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

  return <MindmapContent />;
}
