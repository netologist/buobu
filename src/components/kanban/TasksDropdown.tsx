"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";

const TASKS_VIEWS = [
  { value: "kanban-view", label: "Kanban Board" },
  { value: "list-view", label: "Task List" },
  { value: "calendar-view", label: "Calendar" },
  { value: "cash-flow-view", label: "Cash Flow" },
] as const;

export function TasksDropdown() {
  const pathname = usePathname();
  const router = useRouter();

  const isTasksPage = pathname.startsWith("/tasks/");
  // Extract just the view segment (ignore boardId if present).
  const currentView = pathname.replace("/tasks/", "").split("/")[0] || "kanban-view";

  const handleViewChange = useCallback((view: string) => {
    router.push(`/tasks/${view}`);
  }, [router]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto rounded-lg px-2 py-1 text-xs md:px-3 md:py-1.5 md:text-sm font-medium transition-colors",
            isTasksPage
              ? "bg-muted/70 text-foreground shadow-sm ring-1 ring-border/60 dark:bg-muted dark:ring-white/20 dark:shadow-none"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          Tasks
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {TASKS_VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => handleViewChange(view.value)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
              currentView === view.value
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {view.label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
