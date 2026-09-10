import {
	Calendar,
	CalendarClock,
	CheckSquare,
	CreditCard,
	Flag,
	MessageCircle,
	Tag,
	Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { markdownToPlainText } from "@/components/kanban/task-detail/MarkdownRenderer";

type RoutineMiniTaskCardProps = {
	task: Task;
	swimlaneColor?: string;
	onClick: () => void;
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

function isFutureDate(dateString?: string | null) {
	if (!dateString) return false;
	const date = parseLocalDate(dateString);
	if (!date) return false;
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	return date >= startOfToday;
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

export function RoutineMiniTaskCard({
	task,
	swimlaneColor,
	onClick,
}: RoutineMiniTaskCardProps) {
	const checklistDone = (task.checklists ?? []).reduce(
		(acc, list) => acc + list.items.filter((item) => item.done).length,
		0,
	);
	const checklistTotal = (task.checklists ?? []).reduce(
		(acc, list) => acc + list.items.length,
		0,
	);
	const transactions = task.transactions ?? [];
	const transactionTotal = transactions
		.filter((tx) => !isFutureDate(tx.date))
		.reduce((acc, tx) => {
			const amount = Number(tx.amount) || 0;
			return acc + (tx.type === "income" ? amount : -amount);
		}, 0);
	const amountLabel =
		transactions.length > 0
			? `${transactionTotal < 0 ? "-" : ""}${formatAmountWithSymbol(
					Math.abs(transactionTotal),
					transactions[0]?.currency ?? DEFAULT_CURRENCY,
				)}`
			: null;
	const priorityLabel = task.priority ?? "low";
	const priorityTone =
		priorityLabel === "high"
			? "text-rose-600 dark:text-rose-400"
			: priorityLabel === "medium"
				? "text-amber-500 dark:text-amber-400"
				: "";
	const labelCount = task.labels.length;
	const primaryLabel = labelCount > 0 ? task.labels[0] : null;
	const extraLabelCount = labelCount > 1 ? labelCount - 1 : 0;
	const status = getTaskStatus(task);

	return (
		<Card
			className="cursor-pointer border-l-4 p-3 shadow-sm transition-colors hover:bg-muted/40"
			style={{ borderLeftColor: swimlaneColor ?? "transparent" }}
			onClick={onClick}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p
						className={`line-clamp-2 text-sm font-semibold ${
							task.completedAt ? "text-muted-foreground line-through" : ""
						}`}
					>
						{task.title}
					</p>
					{task.description && (
						<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
							{markdownToPlainText(task.description)}
						</p>
					)}
				</div>
				<div className="flex shrink-0 items-start gap-1.5">
					<Badge variant="outline" className={`text-[9px] ${status.className}`}>
						{status.label}
					</Badge>
					{priorityLabel !== "low" && (
						<Flag className={`mt-0.5 h-3 w-3 ${priorityTone}`} />
					)}
				</div>
			</div>
			<div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
				{primaryLabel && (
					<span className="inline-flex items-center gap-0.5">
						<Tag className="h-3 w-3" />
						{primaryLabel}
						{extraLabelCount > 0 ? ` +${extraLabelCount}` : ""}
					</span>
				)}
				{task.date && (
					<span className="inline-flex items-center gap-0.5">
						<Calendar className="h-3 w-3" />
						{formatCardDate(task.date)}
					</span>
				)}
				{task.deadline && (
					<span className="inline-flex items-center gap-0.5">
						<CalendarClock className="h-3 w-3" />
						{formatCardDate(task.deadline)}
					</span>
				)}
				{(task.comments ?? []).length > 0 && (
					<span className="inline-flex items-center gap-0.5">
						<MessageCircle className="h-3 w-3" />
						{task.comments.length}
					</span>
				)}
				{checklistTotal > 0 && (
					<span className="inline-flex items-center gap-0.5">
						<CheckSquare className="h-3 w-3" />
						{checklistDone}/{checklistTotal}
					</span>
				)}
				{(task.pomodoros ?? 0) > 0 && (
					<span className="inline-flex items-center gap-0.5">
						<Timer className="h-3 w-3" />
						{task.pomodoros}
					</span>
				)}
				{amountLabel && (
					<span className="inline-flex items-center gap-0.5">
						<CreditCard className="h-3 w-3" />
						{amountLabel}
					</span>
				)}
			</div>
		</Card>
	);
}
