import { memo } from "react";
import Link from "next/link";
import {
	Archive,
	Calendar,
	CalendarClock,
	CheckSquare,
	Coins,
	Flag,
	MessageCircle,
	Play,
	Tag,
	Timer,
} from "lucide-react";
import type { Task } from "@/lib/types";
import { markdownToPlainText } from "@/components/kanban/task-detail/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { useBoardConfig } from "@/contexts/BoardConfigContext";
import {
	formatAmountWithSymbol,
	formatCardDate,
	isFutureDate,
} from "@/components/kanban/taskCardUtils";

export type KanbanTaskCardContentProps = {
	task: Task;
	routineTitle?: string;
	currency: string;
	onStartPomodoro?: () => void;
	onArchive?: () => void;
};

function KanbanTaskCardContentComponent({
	task,
	routineTitle,
	currency,
	onStartPomodoro,
	onArchive,
}: KanbanTaskCardContentProps) {
	const { archiveColumnId } = useBoardConfig();
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
					currency,
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
	const isDone = task.columnId === archiveColumnId && !task.archived;

	return (
		<>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p
						className={`line-clamp-2 text-sm font-semibold ${
							isDone ? "text-muted-foreground line-through" : ""
						}`}
					>
						{task.title}
					</p>
					{task.routineId && routineTitle && (
						<p className="mt-0.5 text-[10px] text-muted-foreground">
							created from{" "}
							<Link
								href="/routines"
								className="underline-offset-2 hover:underline"
								onClick={(event) => event.stopPropagation()}
								onPointerDown={(event) => event.stopPropagation()}
							>
								{routineTitle}
							</Link>
						</p>
					)}
					{task.description && (
						<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
							{markdownToPlainText(task.description)}
						</p>
					)}
				</div>
				<div className="flex items-start gap-2">
					{isDone ? (
						<Button
							variant="ghost"
							size="icon-xs"
							className="m-0 h-3 w-5 p-0 opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100"
							onClick={(event) => {
								event.stopPropagation();
								onArchive?.();
							}}
						>
							<Archive className="mt-0.5 h-3 w-3" />
						</Button>
					) : onStartPomodoro ? (
						<Button
							variant="ghost"
							size="icon-xs"
							className="m-0 h-3 w-5 p-0 opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100"
							onClick={(event) => {
								event.stopPropagation();
								onStartPomodoro();
							}}
						>
							<Play className="mt-0.5 h-3 w-3" />
						</Button>
					) : null}
					{priorityLabel !== "low" && (
						<Flag className={`mt-0.5 h-3 w-3 ${priorityTone}`} />
					)}
				</div>
			</div>
			<div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
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
						{task.comments?.length ?? 0}
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
						<Coins className="h-3 w-3" />
						{amountLabel}
					</span>
				)}
			</div>
		</>
	);
}

export const KanbanTaskCardContent = memo(KanbanTaskCardContentComponent);
KanbanTaskCardContent.displayName = "KanbanTaskCardContent";
