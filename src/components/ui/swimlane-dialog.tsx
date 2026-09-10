"use client";

import { useMemo, useState } from "react";
import {
	Archive,
	RotateCcw,
	Timer,
	Palette,
	CalendarDays,
	DollarSign,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useDefaultCurrencyStore } from "@/stores/default-currency-store";
import { pickDistinctColor } from "@/lib/colors";
import type { Swimlane } from "@/lib/types";
import { useNaming } from "@/contexts/NamingContext";
import { useBoardStore } from "@/stores/board-store";

interface SwimlaneDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	swimlane: Swimlane | null;
	onSave: (swimlane: Partial<Swimlane>) => void | Promise<void>;
	onArchive?: (swimlaneId: string) => void | Promise<void>;
	onUnarchive?: (swimlaneId: string) => void | Promise<void>;
	/** Board the new swimlane belongs to — used to pick a distinct default color from its siblings. */
	boardId?: string;
}

export function SwimlaneDialog({
	open,
	onOpenChange,
	swimlane,
	onSave,
	onArchive,
	onUnarchive,
	boardId,
}: SwimlaneDialogProps) {
	const dialogKey = swimlane?.id ?? "new-swimlane";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open ? (
				<SwimlaneDialogContent
					key={dialogKey}
					swimlane={swimlane}
					onOpenChange={onOpenChange}
					onSave={onSave}
					onArchive={onArchive}
					onUnarchive={onUnarchive}
					boardId={boardId}
					open={open}
				/>
			) : null}
		</Dialog>
	);
}

function SwimlaneDialogContent({
	onOpenChange,
	swimlane,
	onSave,
	onArchive,
	onUnarchive,
	boardId,
}: SwimlaneDialogProps) {
	const { labels } = useNaming();
	const allSwimlanes = useBoardStore((s) => s.swimlanes);
	// Distinct-default colors of this board's other swimlanes (excludes the one being edited).
	const siblingColors = useMemo(() => {
		const targetBoardId = boardId ?? swimlane?.boardId;
		if (!targetBoardId) return [];
		return allSwimlanes
			.filter((s) => s.boardId === targetBoardId && s.id !== swimlane?.id)
			.map((s) => s.color)
			.filter((c): c is string => Boolean(c));
	}, [allSwimlanes, boardId, swimlane]);
	const [name, setName] = useState(swimlane?.name ?? "");
	const [description, setDescription] = useState(swimlane?.description ?? "");
	const [label, setLabel] = useState(swimlane?.label ?? "");
	const storeCurrency = useDefaultCurrencyStore((s) => s.currency);
	const [currency, setCurrency] = useState(swimlane?.currency ?? storeCurrency);
	const [color, setColor] = useState(
		swimlane?.color ?? pickDistinctColor(siblingColors),
	);
	const [pomodoroMinutes, setPomodoroMinutes] = useState(
		String(swimlane?.pomodoroMinutes ?? 25),
	);
	const [breakMinutes, setBreakMinutes] = useState(
		String(swimlane?.breakMinutes ?? 5),
	);
	const [deadline, setDeadline] = useState(swimlane?.deadline ?? "");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onSave({
			id: swimlane?.id,
			name: name.trim(),
			description: description.trim() || undefined,
			label: label.trim() || undefined,
			currency,
			color,
			pomodoroMinutes: parseInt(pomodoroMinutes, 10),
			breakMinutes: parseInt(breakMinutes, 10),
			deadline: deadline || undefined,
		});
	}

	return (
		<DialogContent className="max-w-md">
			<DialogHeader>
				<DialogTitle>
					{swimlane ? `Edit ${labels.swimlane}` : `New ${labels.swimlane}`}
				</DialogTitle>
				<DialogDescription>
					{swimlane
						? `Update settings for this ${labels.swimlane.toLowerCase()}`
						: `Configure your new ${labels.swimlane.toLowerCase()}`}
				</DialogDescription>
			</DialogHeader>

			<form onSubmit={handleSubmit} className="space-y-5">
				{/* ── Basic Info ── */}
				<div className="space-y-1.5">
					<Label htmlFor="swimlane-name">Name</Label>
					<Input
						id="swimlane-name"
						placeholder="e.g., Frontend"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
						autoFocus
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="swimlane-label">
						Label{" "}
						<span className="text-muted-foreground font-normal">
							(optional)
						</span>
					</Label>
					<Input
						id="swimlane-label"
						placeholder="e.g., UI"
						value={label}
						onChange={(e) => setLabel(e.target.value)}
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="swimlane-description">
						Description{" "}
						<span className="text-muted-foreground font-normal">
							(optional)
						</span>
					</Label>
					<Textarea
						id="swimlane-description"
						placeholder="e.g., Motivate yourself with a sentence here"
						rows={2}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
					/>
				</div>

				{/* ── Appearance ── */}
				<Separator />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
					<Palette className="h-3 w-3" />
					Appearance
				</p>

				<div className="flex items-center gap-3">
					<div
						className="h-9 w-9 shrink-0 rounded-md border shadow-sm"
						style={{ backgroundColor: color }}
					/>
					<Input
						type="color"
						value={color}
						onChange={(e) => setColor(e.target.value)}
						className="w-12 h-9 p-1 cursor-pointer"
					/>
					<Input
						value={color}
						onChange={(e) => setColor(e.target.value)}
						placeholder="#6366F1"
						className="flex-1 font-mono text-sm"
					/>
				</div>

				{/* ── Finance ── */}
				<Separator />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
					<DollarSign className="h-3 w-3" />
					Finance
				</p>

				<div className="space-y-1.5">
					<Label htmlFor="currency">Currency</Label>
					<Select value={currency} onValueChange={setCurrency}>
						<SelectTrigger id="currency">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="USD">USD ($)</SelectItem>
							<SelectItem value="EUR">EUR (&euro;)</SelectItem>
							<SelectItem value="GBP">GBP (&pound;)</SelectItem>
							<SelectItem value="TRY">TRY (&#8378;)</SelectItem>
							<SelectItem value="JPY">JPY (&yen;)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* ── Timer ── */}
				<Separator />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
					<Timer className="h-3 w-3" />
					Pomodoro Timer
				</p>

				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1.5">
						<Label htmlFor="pomodoro">Work (min)</Label>
						<Input
							id="pomodoro"
							type="number"
							min="1"
							max="60"
							value={pomodoroMinutes}
							onChange={(e) => setPomodoroMinutes(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="break">Break (min)</Label>
						<Input
							id="break"
							type="number"
							min="1"
							max="30"
							value={breakMinutes}
							onChange={(e) => setBreakMinutes(e.target.value)}
							required
						/>
					</div>
				</div>

				{/* ── Timeline ── */}
				<Separator />
				<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
					<CalendarDays className="h-3 w-3" />
					Timeline
				</p>

				<div className="space-y-1.5">
					<Label htmlFor="deadline">
						Deadline{" "}
						<span className="text-muted-foreground font-normal">
							(optional)
						</span>
					</Label>
					<Input
						id="deadline"
						type="date"
						value={deadline}
						onChange={(e) => setDeadline(e.target.value)}
					/>
				</div>

				<DialogFooter className="pt-1">
					{swimlane && swimlane.archived && onUnarchive && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onUnarchive(swimlane.id);
								onOpenChange(false);
							}}
							className="mr-auto gap-1.5"
						>
							<RotateCcw className="h-3.5 w-3.5" />
							Restore
						</Button>
					)}
					{swimlane && !swimlane.archived && onArchive && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onArchive(swimlane.id);
								onOpenChange(false);
							}}
							className="mr-auto gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-950/50"
						>
							<Archive className="h-3.5 w-3.5" />
							Archive
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={!name.trim()}>
						{swimlane ? "Save Changes" : `Create ${labels.swimlane}`}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
