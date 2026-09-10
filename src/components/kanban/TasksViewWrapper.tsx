"use client";

import { TasksDisplayPanel } from "@/components/kanban/TasksDisplayPanel";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useFilterStore } from "@/stores/filter-store";
import { SlidersHorizontal } from "lucide-react";
import { useNavVisibilityStore } from "@/stores/nav-visibility-store";
import {
	isHiddenTaskViewPath,
	resolveTaskHref,
} from "@/lib/navigation/nav-visibility";

type TasksViewWrapperProps = {
	children: React.ReactNode;
	availableLabels?: string[];
};

export function TasksViewWrapper({
	children,
	availableLabels = [],
}: TasksViewWrapperProps) {
	const pathname = usePathname();
	const filters = useFilterStore((state) => state.filters);

	// Extract just the view segment (ignore boardId path segment if present).
	const currentView =
		pathname.replace("/tasks/", "").split("/")[0] || "kanban-view";

	const hasActiveFilters = useMemo(() => {
		return (
			filters.searchText !== "" ||
			filters.date !== "all" ||
			filters.deadline !== "all" ||
			!filters.priorities.includes("all") ||
			filters.labels.length > 0
		);
	}, [filters]);

	const router = useRouter();
	const hiddenTaskViewIds = useNavVisibilityStore((s) => s.hiddenTaskViewIds);

	// Adaptive guard: if the user deep-links to a task view they have hidden
	// (e.g. a stale bookmark), bounce to the first visible view.
	useEffect(() => {
		if (!pathname.startsWith("/tasks/")) return;
		if (isHiddenTaskViewPath(pathname, hiddenTaskViewIds)) {
			router.replace(resolveTaskHref(pathname, hiddenTaskViewIds));
		}
	}, [pathname, hiddenTaskViewIds, router]);

	if (!pathname.startsWith("/tasks/")) {
		return <div className="relative h-full w-full">{children}</div>;
	}

	return (
		<div className="relative h-full w-full">
			{children}

			<div className="fixed bottom-20 left-4 z-50 md:bottom-6 md:left-auto md:right-4">
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="relative h-10 w-10 rounded-full border-border/60 bg-background/95 shadow-lg backdrop-blur-sm"
							title="Display options"
						>
							<SlidersHorizontal className="h-4 w-4" />
							{hasActiveFilters && (
								<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
							)}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						side="top"
						align="end"
						sideOffset={12}
						className="w-72 rounded-xl border bg-card p-0 shadow-xl"
					>
						<TasksDisplayPanel
							currentView={currentView}
							availableLabels={availableLabels}
							variant="sticky"
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
