"use client";

import type { Task, Board, Swimlane } from "@/lib/types";
import { markdownToPlainText } from "@/components/kanban/task-detail/MarkdownRenderer";
import { CheckSquare, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TasksSectionProps = {
	tasks: Task[];
	boardMap: Map<string, Board>;
	swimlaneMap: Map<string, Swimlane>;
	onSelect?: (task: Task) => void;
};

const PRIORITY_CONFIG = {
	high: {
		label: "High",
		className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
	},
	medium: {
		label: "Medium",
		className:
			"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
	},
	low: {
		label: "Low",
		className:
			"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
	},
} as const;

function formatDate(dateStr?: string | null) {
	if (!dateStr) return null;
	try {
		return new Date(dateStr).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return null;
	}
}

export function TasksSection({
	tasks,
	boardMap,
	swimlaneMap,
	onSelect,
}: TasksSectionProps) {
	if (tasks.length === 0) {
		return (
			<EmptyState
				icon={<CheckSquare className="size-8 text-muted-foreground/40" />}
				message="No tasks match the current filter"
			/>
		);
	}

	// Group tasks by board → swimlane
	const grouped = new Map<string, Map<string, Task[]>>();
	for (const task of tasks) {
		const bid = task.boardId ?? "__unknown__";
		const sid = task.swimlaneId ?? "__unknown__";
		if (!grouped.has(bid)) grouped.set(bid, new Map());
		const byBoard = grouped.get(bid)!;
		if (!byBoard.has(sid)) byBoard.set(sid, []);
		byBoard.get(sid)!.push(task);
	}

	return (
		<div className="space-y-6">
			{Array.from(grouped.entries()).map(([boardId, bySwimlane]) => {
				const board = boardMap.get(boardId);
				return (
					<div key={boardId}>
						<h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
							<span className="inline-block size-2 rounded-full bg-primary" />
							{board?.name ?? "Unknown Board"}
							<span className="ml-auto text-xs font-normal text-muted-foreground">
								{Array.from(bySwimlane.values()).flat().length} tasks
							</span>
						</h3>

						<div className="space-y-4 pl-4 border-l border-border/60">
							{Array.from(bySwimlane.entries()).map(
								([swimlaneId, swimlaneTasks]) => {
									const swimlane = swimlaneMap.get(swimlaneId);
									return (
										<div key={swimlaneId}>
											<h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
												<ChevronRight className="size-3" />
												{swimlane?.name ?? "Unknown Swimlane"}
												<span className="ml-1 font-normal normal-case">
													({swimlaneTasks.length})
												</span>
											</h4>
											<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
												{swimlaneTasks.map((task) => (
													<TaskCard
														key={task.id}
														task={task}
														onSelect={onSelect}
													/>
												))}
											</div>
										</div>
									);
								},
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

function TaskCard({
	task,
	onSelect,
}: {
	task: Task;
	onSelect?: (task: Task) => void;
}) {
	const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null;
	const checklistTotal = task.checklists.reduce(
		(sum, cl) => sum + cl.items.length,
		0,
	);
	const checklistDone = task.checklists.reduce(
		(sum, cl) => sum + cl.items.filter((i) => i.done).length,
		0,
	);
	const hasChecklist = checklistTotal > 0;
	const worklogMinutes = task.worklogs.reduce(
		(sum, w) => sum + (w.durationMinutes ?? 0),
		0,
	);

	return (
		<div
			className={cn(
				"group rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors",
				"hover:border-primary/30 hover:bg-card/80",
				task.archived && "opacity-60",
				onSelect && "cursor-pointer",
			)}
			onClick={onSelect ? () => onSelect(task) : undefined}
		>
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">
					<p className="font-medium leading-snug line-clamp-2 text-foreground">
						{task.title}
					</p>
					{task.description && (
						<p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
							{markdownToPlainText(task.description)}
						</p>
					)}
				</div>
				{priorityCfg && (
					<span
						className={cn(
							"shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
							priorityCfg.className,
						)}
					>
						{priorityCfg.label}
					</span>
				)}
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
				{task.labels.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{task.labels.slice(0, 3).map((label) => (
							<span
								key={label}
								className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]"
							>
								{label}
							</span>
						))}
						{task.labels.length > 3 && (
							<span className="text-[10px] text-muted-foreground">
								+{task.labels.length - 3}
							</span>
						)}
					</div>
				)}

				{hasChecklist && (
					<span className="flex items-center gap-0.5">
						<CheckSquare className="size-3" />
						{checklistDone}/{checklistTotal}
					</span>
				)}

				{worklogMinutes > 0 && (
					<span className="flex items-center gap-0.5">
						<Clock className="size-3" />
						{Math.round(worklogMinutes / 60)}h
					</span>
				)}

				{task.deadline && (
					<span className="flex items-center gap-0.5 text-orange-500 dark:text-orange-400">
						<AlertCircle className="size-3" />
						{formatDate(task.deadline)}
					</span>
				)}

				{task.archived && (
					<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
						Archived
					</span>
				)}
			</div>

			{task.comments.length > 0 && (
				<p className="mt-1.5 text-[11px] text-muted-foreground">
					{task.comments.length} comment{task.comments.length !== 1 ? "s" : ""}
				</p>
			)}
		</div>
	);
}

function EmptyState({
	icon,
	message,
}: {
	icon: React.ReactNode;
	message: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
			{icon}
			<p className="text-sm text-muted-foreground">{message}</p>
		</div>
	);
}
