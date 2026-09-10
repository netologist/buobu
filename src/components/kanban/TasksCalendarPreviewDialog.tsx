import {
	AlertCircle,
	CalendarDays,
	Clock,
	DollarSign,
	FileText,
	Flag,
	Folder,
	Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import type { Task } from "@/lib/types";
import { MarkdownRenderer } from "@/components/kanban/task-detail/MarkdownRenderer";

type TasksCalendarPreviewDialogProps = {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	boardName?: string;
	swimlaneName?: string;
	swimlaneColor?: string;
};

export function TasksCalendarPreviewDialog({
	task,
	open,
	onOpenChange,
	boardName,
	swimlaneName,
	swimlaneColor,
}: TasksCalendarPreviewDialogProps) {
	if (!task) return null;

	const transactionsTotal =
		task.transactions?.reduce((acc, tx) => {
			return tx.type === "income" ? acc + tx.amount : acc - tx.amount;
		}, 0) ?? 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto p-0 sm:max-w-3xl">
				<DialogTitle className="sr-only">
					{task.title || "Task Details"}
				</DialogTitle>
				<div className="border-b bg-muted/30 px-6 py-4">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1">
							<div className="flex items-start gap-2">
								{task.priority && task.priority !== "low" && (
									<Flag
										className={`mt-0.5 h-4 w-4 shrink-0 ${
											task.priority === "high"
												? "text-rose-600 dark:text-rose-400"
												: "text-amber-500 dark:text-amber-400"
										}`}
									/>
								)}
								<h2 className="text-xl font-semibold leading-tight">
									{task.title || "Untitled"}
								</h2>
							</div>
							<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
								<div
									className="h-2.5 w-2.5 rounded-full"
									style={{
										backgroundColor: swimlaneColor ?? "var(--muted-foreground)",
									}}
								/>
								<span>{swimlaneName ?? "Unknown"}</span>
								<span className="text-muted-foreground/50">•</span>
								<span>{boardName ?? "Unknown"}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="px-6 py-5">
					<div className="mb-6 grid grid-cols-2 gap-3">
						<div className="rounded-lg border bg-card p-3">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<CalendarDays className="h-3.5 w-3.5" />
								<span>Date</span>
							</div>
							<p className="mt-1 text-sm font-medium">
								{task.date
									? new Date(task.date).toLocaleString(undefined, {
											dateStyle: "medium",
											timeStyle: "short",
										})
									: "Not set"}
							</p>
						</div>
						<div className="rounded-lg border bg-card p-3">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<AlertCircle className="h-3.5 w-3.5" />
								<span>Deadline</span>
							</div>
							<p className="mt-1 text-sm font-medium">
								{task.deadline
									? new Date(task.deadline).toLocaleDateString(undefined, {
											dateStyle: "medium",
										})
									: "Not set"}
							</p>
						</div>
					</div>

					{task.description && (
						<div className="mb-6">
							<div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
								<FileText className="h-3.5 w-3.5" />
								<span>Description</span>
							</div>
							<div className="rounded-lg border bg-muted/30 p-3">
								<MarkdownRenderer
									markdown={task.description}
									className="max-w-none"
								/>
							</div>
						</div>
					)}

					{task.labels && task.labels.length > 0 && (
						<div className="mb-6">
							<div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
								<Tag className="h-3.5 w-3.5" />
								<span>Labels</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{task.labels.map((label) => (
									<Badge key={label} variant="secondary" className="text-xs">
										{label}
									</Badge>
								))}
							</div>
						</div>
					)}

					{task.transactions && task.transactions.length > 0 && (
						<div className="mb-6">
							<div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
								<DollarSign className="h-3.5 w-3.5" />
								<span>Transactions</span>
							</div>
							<div className="rounded-lg border bg-card p-3">
								<div className="space-y-2">
									{task.transactions.map((tx) => {
										const isFuture = tx.date
											? new Date(tx.date) > new Date()
											: false;
										return (
											<div
												key={tx.id}
												className="flex items-center justify-between text-sm"
											>
												<div className="flex items-center gap-2">
													<span
														className={
															tx.type === "income"
																? "text-emerald-600 dark:text-emerald-400"
																: "text-rose-600 dark:text-rose-400"
														}
													>
														{tx.type === "income" ? "+" : "-"}
														{tx.amount.toLocaleString()} {tx.currency}
													</span>
													{isFuture && (
														<Badge
															variant="outline"
															className="h-5 px-1.5 text-[10px]"
														>
															Scheduled
														</Badge>
													)}
												</div>
												<div className="flex items-center gap-2">
													{tx.date && (
														<span className="text-xs text-muted-foreground">
															{new Date(tx.date).toLocaleDateString(undefined, {
																dateStyle: "short",
															})}
														</span>
													)}
													{tx.note && (
														<span className="text-xs text-muted-foreground">
															{tx.note}
														</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
								<div className="mt-3 border-t pt-2">
									<div className="flex items-center justify-between text-sm font-medium">
										<span>Total</span>
										<span
											className={
												transactionsTotal >= 0
													? "text-emerald-600 dark:text-emerald-400"
													: "text-rose-600 dark:text-rose-400"
											}
										>
											{transactionsTotal >= 0 ? "+" : ""}
											{transactionsTotal.toLocaleString()}{" "}
											{task.transactions[0]?.currency || DEFAULT_CURRENCY}
										</span>
									</div>
								</div>
							</div>
						</div>
					)}

					{task.checklists && task.checklists.length > 0 && (
						<div className="mb-6">
							<div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
								<Folder className="h-3.5 w-3.5" />
								<span>Checklists</span>
							</div>
							<div className="space-y-3">
								{task.checklists.map((checklist) => {
									const completed = checklist.items.filter(
										(item) => item.done,
									).length;
									const total = checklist.items.length;
									const percentage =
										total > 0 ? Math.round((completed / total) * 100) : 0;
									return (
										<div
											key={checklist.id}
											className="rounded-lg border bg-card p-3"
										>
											<div className="mb-2 flex items-center justify-between">
												<span className="text-sm font-medium">
													{checklist.title}
												</span>
												<span className="text-xs text-muted-foreground">
													{completed}/{total}
												</span>
											</div>
											<div className="mb-2 h-1.5 rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary"
													style={{ width: `${percentage}%` }}
												/>
											</div>
											<div className="space-y-1">
												{checklist.items.slice(0, 3).map((item) => (
													<div
														key={item.id}
														className="flex items-center gap-2 text-sm"
													>
														<div
															className={`h-4 w-4 rounded border ${
																item.done
																	? "border-primary bg-primary"
																	: "border-muted-foreground/30"
															}`}
														>
															{item.done && (
																<svg
																	className="h-4 w-4 text-primary-foreground"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke="currentColor"
																>
																	<path
																		strokeLinecap="round"
																		strokeLinejoin="round"
																		strokeWidth={2}
																		d="M5 13l4 4L19 7"
																	/>
																</svg>
															)}
														</div>
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
												{checklist.items.length > 3 && (
													<p className="text-xs text-muted-foreground">
														+{checklist.items.length - 3} more items
													</p>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					<div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
						<div className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							<span>
								Created{" "}
								{new Date(task.createdAt).toLocaleDateString(undefined, {
									dateStyle: "medium",
								})}
							</span>
						</div>
						<span>
							Updated{" "}
							{new Date(task.updatedAt).toLocaleString(undefined, {
								dateStyle: "medium",
								timeStyle: "short",
							})}
						</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
