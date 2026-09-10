"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { BookmarksBoard } from "@/components/bookmarks/BookmarksBoard";
import { MobileResourceGate } from "@/components/layout/MobileResourceGate";
import { useAuthContext } from "@/components/auth/AuthProvider";

function BookmarksContent() {
  return (
    <MobileResourceGate>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        }
      >
        <BookmarksBoard />
      </Suspense>
    </MobileResourceGate>
  );
}

export default function BookmarksPage() {
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

  return <BookmarksContent />;
}

