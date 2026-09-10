import { Calendar, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { Task } from "@/lib/types";
import { MarkdownRenderer } from "@/components/kanban/task-detail/MarkdownRenderer";

type RoutineTaskDetailModalProps = {
	task: Task;
	open: boolean;
	onClose: () => void;
};

function parseLocalDate(value: string) {
	if (!value) return null;
	if (!value.includes("T")) {
		const [year, month, day] = value.split("-").map(Number);
		if (!year || !month || !day) return null;
		return new Date(year, month - 1, day);
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekStart(date: Date) {
	const result = new Date(date);
	const day = result.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	result.setDate(result.getDate() + diff);
	result.setHours(0, 0, 0, 0);
	return result;
}

function formatCardDate(value?: string | null) {
	if (!value) return null;
	const date = parseLocalDate(value);
	if (!date) return value;
	const now = new Date();
	const weekStart = getWeekStart(now);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 7);
	const inWeek = date >= weekStart && date < weekEnd;
	const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "long" });
	const dateFormatter = new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
	});
	return inWeek ? weekdayFormatter.format(date) : dateFormatter.format(date);
}

function formatFeedTime(iso: string): string {
	const d = new Date(iso);
	return (
		d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
		" · " +
		d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
	);
}

function getTaskStatus(task: Task): { label: string; className: string } {
	if (task.archived) {
		return {
			label: "Archived",
			className: "border-muted-foreground/40 text-muted-foreground",
		};
	}
	if (task.completedAt) {
		return {
			label: "Done",
			className: "border-green-500/40 text-green-700 dark:text-green-400",
		};
	}
	return {
		label: "Pending",
		className: "border-muted-foreground/30 text-muted-foreground",
	};
}

export function RoutineTaskDetailModal({
	task,
	open,
	onClose,
}: RoutineTaskDetailModalProps) {
	const status = getTaskStatus(task);
	const checklistDone = (task.checklists ?? []).reduce(
		(acc, list) => acc + list.items.filter((item) => item.done).length,
		0,
	);
	const checklistTotal = (task.checklists ?? []).reduce(
		(acc, list) => acc + list.items.length,
		0,
	);

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="max-h-[85vh] w-[98vw] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="pr-6 text-base">{task.title}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<Badge
							variant="outline"
							className={`text-[10px] ${status.className}`}
						>
							{status.label}
						</Badge>
						{task.priority && task.priority !== "low" && (
							<Badge
								variant="outline"
								className={
									task.priority === "high"
										? "border-rose-500/40 text-[10px] text-rose-600"
										: "border-amber-500/40 text-[10px] text-amber-600"
								}
							>
								{task.priority}
							</Badge>
						)}
						{(task.labels ?? []).map((label) => (
							<Badge key={label} variant="outline" className="text-[10px]">
								{label}
							</Badge>
						))}
					</div>

					{task.description && (
						<MarkdownRenderer
							markdown={task.description}
							className="max-w-none"
						/>
					)}

					{(task.date || task.deadline) && (
						<div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
							{task.date && (
								<span className="flex items-center gap-1">
									<Calendar className="h-3.5 w-3.5" />
									Date:{" "}
									<span className="font-medium text-foreground">
										{formatCardDate(task.date)}
									</span>
								</span>
							)}
							{task.deadline && (
								<span className="flex items-center gap-1">
									<CalendarClock className="h-3.5 w-3.5" />
									Deadline:{" "}
									<span className="font-medium text-foreground">
										{formatCardDate(task.deadline)}
									</span>
								</span>
							)}
						</div>
					)}

					<Separator />

					{(task.checklists ?? []).length > 0 && (
						<section>
							<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Checklists ({checklistDone}/{checklistTotal})
							</p>
							<div className="space-y-3">
								{task.checklists.map((list) => (
									<div key={list.id}>
										<p className="mb-1 text-xs font-medium">{list.title}</p>
										<div className="space-y-1">
											{list.items.map((item) => (
												<div
													key={item.id}
													className="flex items-center gap-2 text-xs"
												>
													<span
														className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${
															item.done
																? "border-green-500 bg-green-500/20"
																: "border-muted-foreground/40"
														}`}
													/>
													<span
														className={
															item.done
																? "text-muted-foreground line-through"
																: ""
														}
													>
														{item.text}
													</span>
												</div>
											))}
										</div>
									</div>
								))}
							</div>
							<Separator className="mt-3" />
						</section>
					)}

					{(task.comments ?? []).length > 0 && (
						<section>
							<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Comments ({task.comments.length})
							</p>
							<div className="space-y-2">
								{task.comments.map((comment) => (
									<div
										key={comment.id}
										className="rounded-md border bg-muted/30 px-3 py-2"
									>
										<p className="text-xs">{comment.text}</p>
										<p className="mt-1 text-[10px] text-muted-foreground">
											{formatFeedTime(comment.createdAt)}
										</p>
									</div>
								))}
							</div>
							<Separator className="mt-3" />
						</section>
					)}

					{(task.worklogs ?? []).length > 0 && (
						<section>
							<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Worklogs
							</p>
							<div className="space-y-1.5">
								{task.worklogs.map((worklog) => (
									<div
										key={worklog.id}
										className="flex items-center justify-between text-xs"
									>
										<span className="text-muted-foreground">
											{formatFeedTime(worklog.startedAt)}
										</span>
										<span className="font-medium">
											{worklog.durationMinutes} min
										</span>
									</div>
								))}
							</div>
							<Separator className="mt-3" />
						</section>
					)}

					{(task.transactions ?? []).length > 0 && (
						<section>
							<p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								Transactions
							</p>
							<div className="space-y-1.5">
								{task.transactions.map((tx) => (
									<div
										key={tx.id}
										className="flex items-center justify-between text-xs"
									>
										<span className="text-muted-foreground">
											{tx.note ?? tx.type}
										</span>
										<span
											className={
												tx.type === "income"
													? "font-medium text-green-600"
													: "font-medium text-red-600"
											}
										>
											{tx.type === "income" ? "+" : "-"}
											{tx.amount} {tx.currency}
										</span>
									</div>
								))}
							</div>
						</section>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" size="sm" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
