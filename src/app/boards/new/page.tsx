"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { putBoard, putSwimlane } from "@/lib/db";
import type { BoardColumn, Swimlane } from "@/lib/types";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { DEFAULT_ARCHIVE_COLUMN_ID } from "@/lib/constants";
import { useDefaultCurrencyStore } from "@/stores/default-currency-store";

const DEFAULT_COLUMNS: BoardColumn[] = [
	{ id: "todo", title: "To Do" },
	{ id: "in-progress", title: "In Progress" },
	{ id: "review", title: "Review" },
	{ id: DEFAULT_ARCHIVE_COLUMN_ID, title: "Done" },
];

function makeDefaultSwimlane(
	currency: string,
): Omit<Swimlane, "id" | "boardId"> {
	return {
		name: "",
		label: "",
		currency,
		color: "#3b82f6",
		durationHours: 8,
		pomodoroMinutes: 25,
		breakMinutes: 5,
	};
}

const CURRENCIES = [
	{ value: "USD", label: "USD ($)" },
	{ value: "EUR", label: "EUR (€)" },
	{ value: "GBP", label: "GBP (£)" },
	{ value: "TRY", label: "TRY (₺)" },
	{ value: "JPY", label: "JPY (¥)" },
	{ value: "CHF", label: "CHF (Fr)" },
];

const COLORS = [
	{ value: "#3b82f6", label: "Blue" },
	{ value: "#ef4444", label: "Red" },
	{ value: "#22c55e", label: "Green" },
	{ value: "#f59e0b", label: "Yellow" },
	{ value: "#8b5cf6", label: "Purple" },
	{ value: "#ec4899", label: "Pink" },
	{ value: "#06b6d4", label: "Cyan" },
	{ value: "#84cc16", label: "Lime" },
];

export default function NewBoardPage() {
	const router = useRouter();
	const { isAuthenticated, isLoading: authLoading } = useAuthContext();
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const defaultCurrency = useDefaultCurrencyStore((s) => s.currency);

	// Redirect if not authenticated
	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			router.push("/auth/login");
		}
	}, [authLoading, isAuthenticated, router]);

	// Step 1: Board data
	const [name, setName] = useState("");
	const [weekStart, setWeekStart] = useState("1");
	const [columns, setColumns] = useState<BoardColumn[]>(DEFAULT_COLUMNS);

	// Step 2: Swimlane data
	const [swimlanes, setSwimlanes] = useState<
		Omit<Swimlane, "id" | "boardId">[]
	>([{ ...makeDefaultSwimlane(defaultCurrency), name: "Default Swimlane" }]);

	if (authLoading || !isAuthenticated) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
			</div>
		);
	}

	function addColumn() {
		setColumns([...columns, { id: `col-${Date.now()}`, title: "" }]);
	}

	function updateColumn(index: number, title: string) {
		const newColumns = [...columns];
		newColumns[index] = { ...newColumns[index], title };
		setColumns(newColumns);
	}

	function removeColumn(index: number) {
		if (columns.length <= 1) return;
		setColumns(columns.filter((_, i) => i !== index));
	}

	function addSwimlane() {
		setSwimlanes([...swimlanes, { ...makeDefaultSwimlane(defaultCurrency) }]);
	}

	function updateSwimlane(
		index: number,
		field: keyof Omit<Swimlane, "id" | "boardId">,
		value: string | number,
	) {
		const newSwimlanes = [...swimlanes];
		newSwimlanes[index] = { ...newSwimlanes[index], [field]: value };
		setSwimlanes(newSwimlanes);
	}

	function removeSwimlane(index: number) {
		if (swimlanes.length <= 1) return;
		setSwimlanes(swimlanes.filter((_, i) => i !== index));
	}

	function canProceedToStep2() {
		return name.trim() && columns.some((col) => col.title.trim());
	}

	async function handleSubmit() {
		if (!name.trim()) return;

		setIsSubmitting(true);
		try {
			const boardId = crypto.randomUUID();

			// Create board
			await putBoard({
				id: boardId,
				name: name.trim(),
				columns: columns.filter((col) => col.title.trim()),
				weekStart: parseInt(weekStart, 10),
			});

			// Create swimlanes
			for (const swimlane of swimlanes) {
				if (swimlane.name.trim()) {
					await putSwimlane({
						boardId,
						name: swimlane.name.trim(),
						label: swimlane.label?.trim() || swimlane.name.trim(),
						currency: swimlane.currency,
						color: swimlane.color,
						durationHours: swimlane.durationHours || 8,
						pomodoroMinutes: swimlane.pomodoroMinutes || 25,
						breakMinutes: swimlane.breakMinutes || 5,
					});
				}
			}

			router.push("/");
		} catch (error) {
			console.error("Failed to create board:", error);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="container mx-auto p-6 max-w-2xl">
			<div className="mb-6">
				<Link href="/">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
				</Link>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Create New Board</CardTitle>
							<CardDescription>
								{currentStep === 1
									? "Step 1: Set up your board with custom columns"
									: "Step 2: Configure swimlanes for your board"}
							</CardDescription>
						</div>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<span
								className={
									currentStep === 1 ? "font-semibold text-foreground" : ""
								}
							>
								1
							</span>
							<span>/</span>
							<span
								className={
									currentStep === 2 ? "font-semibold text-foreground" : ""
								}
							>
								2
							</span>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{currentStep === 1 ? (
						<div className="space-y-6">
							<div className="space-y-2">
								<Label htmlFor="name">Board Name</Label>
								<Input
									id="name"
									placeholder="e.g., Product Roadmap"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="weekStart">Week Start Day</Label>
								<Select value={weekStart} onValueChange={setWeekStart}>
									<SelectTrigger id="weekStart">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="0">Sunday</SelectItem>
										<SelectItem value="1">Monday</SelectItem>
										<SelectItem value="2">Tuesday</SelectItem>
										<SelectItem value="3">Wednesday</SelectItem>
										<SelectItem value="4">Thursday</SelectItem>
										<SelectItem value="5">Friday</SelectItem>
										<SelectItem value="6">Saturday</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-3">
								<Label>Columns</Label>
								<div className="space-y-2">
									{columns.map((column, index) => (
										<div key={column.id} className="flex gap-2">
											<Input
												placeholder="Column name"
												value={column.title}
												onChange={(e) => updateColumn(index, e.target.value)}
												required
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeColumn(index)}
												disabled={columns.length <= 1}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addColumn}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Column
								</Button>
							</div>

							<div className="flex gap-3 pt-4">
								<Link href="/" className="flex-1">
									<Button type="button" variant="outline" className="w-full">
										Cancel
									</Button>
								</Link>
								<Button
									type="button"
									className="flex-1"
									disabled={!canProceedToStep2()}
									onClick={() => setCurrentStep(2)}
								>
									Next Step
									<ChevronRight className="ml-2 h-4 w-4" />
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-6">
							<div className="space-y-4">
								{swimlanes.map((swimlane, index) => (
									<div key={index} className="border rounded-lg p-4 space-y-4">
										<div className="flex items-center justify-between">
											<h4 className="font-medium">Swimlane {index + 1}</h4>
											{swimlanes.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeSwimlane(index)}
												>
													<X className="h-4 w-4" />
												</Button>
											)}
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Name</Label>
												<Input
													placeholder="e.g., Development"
													value={swimlane.name}
													onChange={(e) =>
														updateSwimlane(index, "name", e.target.value)
													}
													required
												/>
											</div>
											<div className="space-y-2">
												<Label>Label (optional)</Label>
												<Input
													placeholder="e.g., Dev"
													value={swimlane.label}
													onChange={(e) =>
														updateSwimlane(index, "label", e.target.value)
													}
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label>Currency</Label>
												<Select
													value={swimlane.currency}
													onValueChange={(value) =>
														updateSwimlane(index, "currency", value)
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{CURRENCIES.map((curr) => (
															<SelectItem key={curr.value} value={curr.value}>
																{curr.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label>Color</Label>
												<Select
													value={swimlane.color}
													onValueChange={(value) =>
														updateSwimlane(index, "color", value)
													}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{COLORS.map((color) => (
															<SelectItem key={color.value} value={color.value}>
																<div className="flex items-center gap-2">
																	<div
																		className="w-4 h-4 rounded-full"
																		style={{ backgroundColor: color.value }}
																	/>
																	{color.label}
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
										</div>

										<div className="grid grid-cols-3 gap-4">
											<div className="space-y-2">
												<Label>Daily Hours</Label>
												<Input
													type="number"
													min={1}
													max={24}
													value={swimlane.durationHours}
													onChange={(e) =>
														updateSwimlane(
															index,
															"durationHours",
															parseInt(e.target.value) || 8,
														)
													}
												/>
											</div>
											<div className="space-y-2">
												<Label>Pomodoro (min)</Label>
												<Input
													type="number"
													min={1}
													max={120}
													value={swimlane.pomodoroMinutes}
													onChange={(e) =>
														updateSwimlane(
															index,
															"pomodoroMinutes",
															parseInt(e.target.value) || 25,
														)
													}
												/>
											</div>
											<div className="space-y-2">
												<Label>Break (min)</Label>
												<Input
													type="number"
													min={1}
													max={60}
													value={swimlane.breakMinutes}
													onChange={(e) =>
														updateSwimlane(
															index,
															"breakMinutes",
															parseInt(e.target.value) || 5,
														)
													}
												/>
											</div>
										</div>
									</div>
								))}

								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addSwimlane}
									className="w-full"
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Another Swimlane
								</Button>
							</div>

							<div className="flex gap-3 pt-4">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => setCurrentStep(1)}
								>
									<ChevronLeft className="mr-2 h-4 w-4" />
									Back
								</Button>
								<Button
									type="button"
									className="flex-1"
									disabled={
										isSubmitting || !swimlanes.some((s) => s.name.trim())
									}
									onClick={handleSubmit}
								>
									{isSubmitting ? "Creating..." : "Create Board"}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
