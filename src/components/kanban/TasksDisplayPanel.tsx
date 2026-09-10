"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useFilterStore, DEFAULT_FILTERS } from "@/stores/filter-store";

const DATE_OPTIONS = [
  { value: "all", label: "All dates" },
  { value: "none", label: "No date" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "next-7", label: "Next 7 days" },
  { value: "month", label: "This month" },
  { value: "next-30", label: "Next 30 days" },
];

const DEADLINE_OPTIONS = [
  { value: "all", label: "All deadlines" },
  { value: "none", label: "No deadline" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "next-7", label: "Next 7 days" },
  { value: "month", label: "This month" },
  { value: "next-30", label: "Next 30 days" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const DISPLAY_VIEWS = [
  { value: "kanban-view", label: "Kanban Board" },
  { value: "list-view", label: "Task List" },
  { value: "calendar-view", label: "Calendar" },
  { value: "cash-flow-view", label: "Cash Flow" },
] as const;

export function TasksDisplayPanel({
  currentView,
  availableLabels = [],
  variant = "default",
  onClose,
}: {
  currentView: string;
  availableLabels?: string[];
  variant?: "default" | "header" | "sticky";
  onClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { filters, setFilters } = useFilterStore();

  const isStickyVariant = variant === "sticky";
  const [pendingView, setPendingView] = useState<string | null>(null);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchText !== "" ||
      filters.date !== "all" ||
      filters.deadline !== "all" ||
      !filters.priorities.includes("all") ||
      filters.labels.length > 0
    );
  }, [filters]);

  const updateFilter = useCallback(
    <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
      setFilters({ ...filters, [key]: value });
    },
    [filters, setFilters]
  );

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  const handleViewChange = useCallback((view: string) => {
    if (isStickyVariant) {
      setPendingView(view);
      startTransition(() => {
        router.push(`/tasks/${view}`);
      });
    } else {
      setOpen(false);
      if (onClose) onClose();
      startTransition(() => {
        router.push(`/tasks/${view}`);
      });
    }
  }, [router, onClose, isStickyVariant]);

  const selectedPriority =
    filters.priorities.length === 0 || filters.priorities.includes("all")
      ? "all"
      : filters.priorities[0];

  const selectedLabel = filters.labels.length === 0 ? "all" : filters.labels[0];

  const isHeaderVariant = variant === "header";

  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/tasks/") && !isStickyVariant) {
    return null;
  }

  if (isStickyVariant) {
    return (
      <>
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.searchText}
              onChange={(event) => updateFilter("searchText", event.target.value)}
              placeholder="Search tasks..."
              className="h-8 rounded-lg pl-7 pr-7 text-xs"
            />
            {filters.searchText && (
              <button
                type="button"
                onClick={() => updateFilter("searchText", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
        </div>

        <div className="hidden border-b px-3 py-2 md:block">
          <div className="grid grid-cols-4 gap-1">
            {DISPLAY_VIEWS.map((view) => {
              const isActive = currentView === view.value;
              const isLoading = isPending && pendingView === view.value;
              return (
                <button
                  key={view.value}
                  type="button"
                  onClick={() => handleViewChange(view.value)}
                  disabled={isPending}
                  className={`relative rounded-lg px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                  ) : (
                    view.label
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Date</span>
            <div className="flex-1">
              <Select value={filters.date} onValueChange={(value) => updateFilter("date", value)}>
                <SelectTrigger className="h-8 w-full rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Deadline</span>
            <div className="flex-1">
              <Select
                value={filters.deadline}
                onValueChange={(value) => updateFilter("deadline", value)}
              >
                <SelectTrigger className="h-8 w-full rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEADLINE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Priority</span>
            <div className="flex-1">
              <Select
                value={selectedPriority}
                onValueChange={(value) =>
                  updateFilter("priorities", value === "all" ? ["all"] : [value])
                }
              >
                <SelectTrigger className="h-8 w-full rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Label</span>
            <div className="flex-1">
              <Select
                value={selectedLabel}
                onValueChange={(value) =>
                  updateFilter("labels", value === "all" ? [] : [value])
                }
              >
                <SelectTrigger className="h-8 w-full rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableLabels.map((label: string) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-center text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Reset filters
          </Button>
        </div>
      </>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        {isHeaderVariant ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 rounded-full border border-border/60 bg-background/95 shadow-xs"
            title="Display"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            size="default"
            className="h-10 gap-2 rounded-full bg-primary/90 hover:bg-primary px-4 text-sm font-semibold shadow-lg backdrop-blur-sm transition-all text-primary-foreground"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LayoutGrid className="h-4 w-4" />
            )}
            <span>Display</span>
            {hasActiveFilters && !isPending && (
              <span className="h-5 min-w-5 rounded-full bg-primary-foreground/20 px-1 text-[10px] flex items-center justify-center font-bold">
                {filters.searchText ? 1 : 0}
              </span>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-xl border bg-card p-0 shadow-xl"
      >
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.searchText}
              onChange={(event) => updateFilter("searchText", event.target.value)}
              placeholder="Search tasks..."
              className="h-8 rounded-lg pl-7 pr-7 text-xs"
            />
            {filters.searchText && (
              <button
                type="button"
                onClick={() => updateFilter("searchText", "")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
        </div>

        <div className="border-b px-3 py-2">
          <div className="grid grid-cols-4 gap-1">
            {DISPLAY_VIEWS.map((view) => (
              <button
                key={view.value}
                type="button"
                onClick={() => handleViewChange(view.value)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                  currentView === view.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Date</span>
            <div className="flex-1">
              <Select value={filters.date} onValueChange={(value) => updateFilter("date", value)}>
                <SelectTrigger className="w-full h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Deadline</span>
            <div className="flex-1">
              <Select
                value={filters.deadline}
                onValueChange={(value) => updateFilter("deadline", value)}
              >
                <SelectTrigger className="w-full h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEADLINE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Priority</span>
            <div className="flex-1">
              <Select
                value={selectedPriority}
                onValueChange={(value) =>
                  updateFilter("priorities", value === "all" ? ["all"] : [value])
                }
              >
                <SelectTrigger className="w-full h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">Label</span>
            <div className="flex-1">
              <Select
                value={selectedLabel}
                onValueChange={(value) =>
                  updateFilter("labels", value === "all" ? [] : [value])
                }
              >
                <SelectTrigger className="w-full h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {availableLabels.map((label: string) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-center text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Reset filters
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
