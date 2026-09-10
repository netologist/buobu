"use client";

import { MarkdownRenderer } from "@/components/kanban/task-detail/MarkdownRenderer";
import type { Task, Board, Swimlane } from "@/lib/types";
import { CheckSquare, Clock, DollarSign, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskDetailProps = {
	task: Task;
	board?: Board;
	swimlane?: Swimlane;
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

function formatDate(d?: string | null) {
	if (!d) return "—";
	try {
		return new Date(d).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	} catch {
		return d;
	}
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
				{title}
			</h3>
			{children}
		</div>
	);
}

export function TaskDetail({ task, board, swimlane }: TaskDetailProps) {
	const priorityCfg = task.priority ? PRIORITY_CONFIG[task.priority] : null;
	const totalWorklogMins = task.worklogs.reduce(
		(s, w) => s + (w.durationMinutes ?? 0),
		0,
	);

	return (
		<div className="space-y-5 text-sm">
			{/* Meta row */}
			<div className="flex flex-wrap gap-2 items-center">
				{board && (
					<span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
						{board.name}
					</span>
				)}
				{swimlane && (
					<span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
						{swimlane.color && (
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: swimlane.color }}
							/>
						)}
						{swimlane.name}
					</span>
				)}
				{priorityCfg && (
					<span
						className={cn(
							"rounded-full px-2 py-0.5 text-xs font-medium",
							priorityCfg.className,
						)}
					>
						{priorityCfg.label}
					</span>
				)}
				{task.archived && (
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						Archived
					</span>
				)}
			</div>

			{/* Description */}
			{task.description && (
				<Section title="Description">
					<MarkdownRenderer
						markdown={task.description}
						className="max-w-none"
					/>
				</Section>
			)}

			{/* Dates */}
			<Section title="Dates">
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-lg bg-muted/50 p-2.5">
						<p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
							Created
						</p>
						<p>{formatDate(task.createdAt)}</p>
					</div>
					<div className="rounded-lg bg-muted/50 p-2.5">
						<p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
							Deadline
						</p>
						<p
							className={cn(
								task.deadline ? "text-orange-500 dark:text-orange-400" : "",
							)}
						>
							{formatDate(task.deadline)}
						</p>
					</div>
					{task.completedAt && (
						<div className="rounded-lg bg-muted/50 p-2.5">
							<p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
								Completed
							</p>
							<p className="text-green-600 dark:text-green-400">
								{formatDate(task.completedAt)}
							</p>
						</div>
					)}
				</div>
			</Section>

			{/* Labels */}
			{task.labels.length > 0 && (
				<Section title="Labels">
					<div className="flex flex-wrap gap-1.5">
						{task.labels.map((l) => (
							<span
								key={l}
								className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs"
							>
								<Tag className="size-3" />
								{l}
							</span>
						))}
					</div>
				</Section>
			)}

			{/* Checklists */}
			{task.checklists.length > 0 && (
				<Section title="Checklists">
					<div className="space-y-3">
						{task.checklists.map((cl) => {
							const done = cl.items.filter((i) => i.done).length;
							const total = cl.items.length;
							const pct = total > 0 ? Math.round((done / total) * 100) : 0;
							return (
								<div key={cl.id}>
									<div className="flex items-center justify-between mb-1.5">
										<span className="font-medium text-foreground">
											{cl.title}
										</span>
										<span className="text-xs text-muted-foreground">
											{done}/{total}
										</span>
									</div>
									<div className="h-1 rounded-full bg-muted mb-2">
										<div
											className="h-1 rounded-full bg-primary transition-all"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<ul className="space-y-1">
										{cl.items.map((item) => (
											<li key={item.id} className="flex items-start gap-2">
												<CheckSquare
													className={cn(
														"size-3.5 mt-0.5 shrink-0",
														item.done
															? "text-primary"
															: "text-muted-foreground",
													)}
												/>
												<span
													className={cn(
														"text-xs leading-snug",
														item.done && "line-through text-muted-foreground",
													)}
												>
													{item.text}
												</span>
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				</Section>
			)}

			{/* Comments */}
			{task.comments.length > 0 && (
				<Section title={`Comments (${task.comments.length})`}>
					<div className="space-y-2">
						{task.comments.map((c) => (
							<div key={c.id} className="rounded-lg border bg-muted/30 p-3">
								<p className="text-xs text-muted-foreground mb-1">
									{formatDate(c.createdAt)}
								</p>
								<p className="text-sm leading-relaxed">{c.text}</p>
							</div>
						))}
					</div>
				</Section>
			)}

			{/* Work logs */}
			{task.worklogs.length > 0 && (
				<Section title="Work Logs">
					<div className="space-y-1.5">
						{task.worklogs.map((w) => (
							<div
								key={w.id}
								className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"
							>
								<Clock className="size-3.5 text-muted-foreground shrink-0" />
								<span className="text-muted-foreground">
									{formatDate(w.startedAt)}
								</span>
								<span className="ml-auto font-medium">
									{w.durationMinutes}m
								</span>
							</div>
						))}
						<p className="text-xs text-muted-foreground text-right mt-1">
							Total: {Math.floor(totalWorklogMins / 60)}h{" "}
							{totalWorklogMins % 60}m
						</p>
					</div>
				</Section>
			)}

			{/* Transactions */}
			{task.transactions.length > 0 && (
				<Section title="Transactions">
					<div className="space-y-1.5">
						{task.transactions.map((t) => (
							<div
								key={t.id}
								className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"
							>
								<DollarSign className="size-3.5 shrink-0" />
								<span
									className={cn(
										"rounded-full px-1.5 py-0.5 text-[10px] font-medium",
										t.type === "income"
											? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
											: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
									)}
								>
									{t.type}
								</span>
								<span className="text-muted-foreground">{t.note ?? "—"}</span>
								<span className="ml-auto font-medium">
									{t.currency} {t.amount}
								</span>
							</div>
						))}
					</div>
				</Section>
			)}

			{/* Pomodoros */}
			{task.pomodoros != null && task.pomodoros > 0 && (
				<Section title="Pomodoros">
					<p className="text-foreground">
						{task.pomodoros} session{task.pomodoros !== 1 ? "s" : ""}
					</p>
				</Section>
			)}
		</div>
	);
}
