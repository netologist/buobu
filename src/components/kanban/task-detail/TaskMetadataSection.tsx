"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "./MarkdownEditor";
import { formatTimebox } from "@/lib/timeblocks/formatters";

import { useTaskDetailContext } from "./TaskDetailContext";

export function TaskMetadataSection() {
	const { model, isReadOnly, boards, swimlanes } = useTaskDetailContext();
	const { draftTask } = model;

	// Swimlanes that belong to the task's currently selected board.
	const boardSwimlanes = useMemo(
		() => swimlanes.filter((lane) => lane.boardId === draftTask?.boardId),
		[swimlanes, draftTask?.boardId],
	);

	// Columns that belong to the task's currently selected board.
	const boardColumns = useMemo(() => {
		const selectedBoard = boards.find((item) => item.id === draftTask?.boardId);
		return selectedBoard?.columns ?? [];
	}, [boards, draftTask?.boardId]);

	if (!draftTask) {
		return null;
	}

	// Alias the narrowed value so closures below keep the non-null type.
	const task = draftTask;

	// When the board changes, reset swimlane + column to valid values for that board.
	function handleBoardChange(nextBoardId: string) {
		const nextBoard = boards.find((item) => item.id === nextBoardId);
		const boardLane = swimlanes.find((lane) => lane.boardId === nextBoardId);
		const fallbackColumnId = nextBoard?.columns[0]?.id ?? "";
		model.setDraftTask({
			...task,
			boardId: nextBoardId,
			swimlaneId: boardLane?.id ?? "",
			columnId: fallbackColumnId,
		});
	}

	// When the swimlane changes, keep boardId in sync (a swimlane always belongs
	// to a single board) and reset column if the board changed.
	function handleSwimlaneChange(nextSwimlaneId: string) {
		const nextLane = swimlanes.find((lane) => lane.id === nextSwimlaneId);
		if (!nextLane) return;
		const boardChanged = nextLane.boardId !== task.boardId;
		if (!boardChanged) {
			model.setDraftTask({ ...task, swimlaneId: nextSwimlaneId });
			return;
		}
		const nextBoard = boards.find((item) => item.id === nextLane.boardId);
		model.setDraftTask({
			...task,
			swimlaneId: nextSwimlaneId,
			boardId: nextLane.boardId ?? task.boardId,
			columnId: nextBoard?.columns[0]?.id ?? task.columnId,
		});
	}

	function handleColumnChange(nextColumnId: string) {
		model.setDraftTask({ ...task, columnId: nextColumnId });
	}

	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<div className="grid gap-3 md:grid-cols-3">
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Board
						</p>
						<Select
							value={draftTask.boardId}
							disabled={isReadOnly}
							onValueChange={handleBoardChange}
						>
							<SelectTrigger className="mt-2 w-full">
								<SelectValue placeholder="Select board" />
							</SelectTrigger>
							<SelectContent>
								{boards.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{item.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Swimlane
						</p>
						<Select
							value={draftTask.swimlaneId}
							disabled={isReadOnly || boardSwimlanes.length === 0}
							onValueChange={handleSwimlaneChange}
						>
							<SelectTrigger className="mt-2 w-full">
								<SelectValue placeholder="Select swimlane" />
							</SelectTrigger>
							<SelectContent>
								{boardSwimlanes.map((lane) => (
									<SelectItem key={lane.id} value={lane.id}>
										{lane.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Column
						</p>
						<Select
							value={draftTask.columnId}
							disabled={isReadOnly || boardColumns.length === 0}
							onValueChange={handleColumnChange}
						>
							<SelectTrigger className="mt-2 w-full">
								<SelectValue placeholder="Select column" />
							</SelectTrigger>
							<SelectContent>
								{boardColumns.map((column) => (
									<SelectItem key={column.id} value={column.id}>
										{column.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div>
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Title
					</p>
					<Input
						className="mt-2"
						value={draftTask.title}
						disabled={isReadOnly}
						onChange={(event) =>
							model.setDraftTask({ ...draftTask, title: event.target.value })
						}
					/>
				</div>
				<MarkdownEditor
					value={draftTask.description}
					onChange={(value) =>
						model.setDraftTask({
							...draftTask,
							description: value,
						})
					}
					disabled={isReadOnly}
					className="mt-2"
				/>
				<div className="grid gap-3 md:grid-cols-[160px_1.6fr_1fr]">
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Priority
						</p>
						<Select
							value={draftTask.priority ?? "low"}
							disabled={isReadOnly}
							onValueChange={(value) =>
								model.setDraftTask({
									...draftTask,
									priority: value as "low" | "medium" | "high",
								})
							}
						>
							<SelectTrigger className="mt-2 w-full">
								<SelectValue placeholder="Select priority" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="low">Low</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="high">High</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Date
						</p>
						<Input
							type="datetime-local"
							className="mt-2 w-full"
							value={draftTask.date ?? ""}
							disabled={isReadOnly}
							onChange={(event) =>
								model.setDraftTask({
									...draftTask,
									date: event.target.value ? event.target.value : null,
								})
							}
						/>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase text-muted-foreground">
							Deadline (optional)
						</p>
						<Input
							type="date"
							className="mt-2 w-full"
							value={draftTask.deadline ?? ""}
							disabled={isReadOnly}
							onChange={(event) =>
								model.setDraftTask({
									...draftTask,
									deadline: event.target.value ? event.target.value : null,
								})
							}
						/>
					</div>
				</div>

				{/* Timebox */}
				<div>
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Time Box
						{draftTask.timeboxMinutes != null &&
							draftTask.timeboxMinutes > 0 && (
								<span className="ml-2 normal-case font-normal text-muted-foreground">
									— {formatTimebox(draftTask.timeboxMinutes)}
								</span>
							)}
					</p>
					<div className="mt-2 flex items-center gap-2">
						<div className="flex items-center gap-1">
							<Input
								type="number"
								min={0}
								max={23}
								placeholder="0"
								disabled={isReadOnly}
								className="w-16 text-center"
								value={
									draftTask.timeboxMinutes != null
										? Math.floor(draftTask.timeboxMinutes / 60)
										: ""
								}
								onChange={(e) => {
									const h = parseInt(e.target.value, 10);
									const prevMins = draftTask.timeboxMinutes ?? 0;
									const m = prevMins % 60;
									const total = (isNaN(h) ? 0 : h) * 60 + m;
									model.setDraftTask({
										...draftTask,
										timeboxMinutes: total > 0 ? total : null,
									});
								}}
							/>
							<span className="text-sm text-muted-foreground">h</span>
						</div>
						<div className="flex items-center gap-1">
							<Input
								type="number"
								min={0}
								max={59}
								placeholder="0"
								disabled={isReadOnly}
								className="w-16 text-center"
								value={
									draftTask.timeboxMinutes != null
										? draftTask.timeboxMinutes % 60
										: ""
								}
								onChange={(e) => {
									const m = parseInt(e.target.value, 10);
									const prevMins = draftTask.timeboxMinutes ?? 0;
									const h = Math.floor(prevMins / 60);
									const total = h * 60 + (isNaN(m) ? 0 : m);
									model.setDraftTask({
										...draftTask,
										timeboxMinutes: total > 0 ? total : null,
									});
								}}
							/>
							<span className="text-sm text-muted-foreground">min</span>
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold uppercase text-muted-foreground">
						Labels
					</p>
				</div>
				<div className="rounded-md border">
					<Input
						placeholder="Add label"
						value={model.labelInput}
						disabled={isReadOnly}
						onChange={(event) => model.setLabelInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								if (!isReadOnly) model.addLabel();
							}
						}}
						className="border-0 shadow-none focus-visible:ring-0"
					/>
					{draftTask.labels.length > 0 && (
						<div className="flex flex-wrap gap-2 p-2">
							{draftTask.labels.map((label) => (
								<Badge key={label} className="flex items-center gap-2">
									{label}
									{!isReadOnly && (
										<button
											type="button"
											className="text-xs text-muted-foreground"
											onClick={() => model.removeLabel(label)}
										>
											x
										</button>
									)}
								</Badge>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
