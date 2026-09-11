"use client";

/**
 * @deprecated Legacy boards view route.
 * Modern board management is handled by direct board layouts and modal settings.
 * Kept for backward compatibility with existing bookmarks.
 */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
	ArrowLeft,
	Plus,
	Kanban,
	Layers,
	Trash2,
	Columns,
	Save,
	Tag,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SwimlaneDialog } from "@/components/ui/swimlane-dialog";
import { ColumnsTabContent } from "@/components/ui/BoardModalColumnsTab";
import {
	getAllBoards,
	getBoardById,
	getSwimlanesByBoard,
	putBoard,
	deleteBoard,
	putSwimlane,
	deleteSwimlane,
} from "@/lib/db";
import { NAMING_PRESETS, PRESET_OPTIONS, getPresetKey } from "@/lib/naming";
import type { BoardColumn, Swimlane, NamingLabels } from "@/lib/types";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useNaming } from "@/contexts/NamingContext";
import { DEFAULT_ARCHIVE_COLUMN_ID } from "@/lib/constants";

export default function EditBoardPage() {
	return (
		<Suspense
			fallback={
				<div className="container mx-auto p-6 max-w-4xl">
					<div className="animate-pulse space-y-4">
						<div className="h-8 w-32 bg-muted rounded" />
						<div className="h-96 bg-muted rounded" />
					</div>
				</div>
			}
		>
			<EditBoardContent />
		</Suspense>
	);
}

function EditBoardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAuthenticated, isLoading: authLoading } = useAuthContext();
	const { labels, updateNaming } = useNaming();
	const boardIdParam = searchParams.get("id") ?? "";

	const [boardId, setBoardId] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [totalBoardCount, setTotalBoardCount] = useState(0);
	const [name, setName] = useState("");
	const [weekStart, setWeekStart] = useState("1");
	const [columns, setColumns] = useState<BoardColumn[]>([]);
	const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
	const [archiveColumnId, setArchiveColumnId] = useState<string>(
		DEFAULT_ARCHIVE_COLUMN_ID,
	);
	const [showArchiveColumn, setShowArchiveColumn] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [namingPreset, setNamingPreset] = useState<string | null>(null);
	const [customNamingLabels, setCustomNamingLabels] =
		useState<NamingLabels | null>(null);
	const [isNamingSaving, setIsNamingSaving] = useState(false);
	const [namingError, setNamingError] = useState<string | null>(null);

	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			router.push("/auth/login");
		}
	}, [authLoading, isAuthenticated, router]);

	const loadBoard = useCallback(
		async (id: string) => {
			try {
				const [boardData, swimlanesData, allBoards] = await Promise.all([
					getBoardById(id),
					getSwimlanesByBoard(id),
					getAllBoards(),
				]);

				if (!boardData) {
					router.push("/");
					return;
				}

				setName(boardData.name);
				setWeekStart(String(boardData.weekStart || 1));
				setColumns(boardData.columns || []);
				setSwimlanes(swimlanesData);
				setTotalBoardCount(allBoards.length);
				setArchiveColumnId(
					boardData.archiveColumnId || DEFAULT_ARCHIVE_COLUMN_ID,
				);
				setShowArchiveColumn(boardData.showArchiveColumn || false);
				setNamingPreset(null);
				setCustomNamingLabels(null);
			} catch (error) {
				console.error("Failed to load board:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[router],
	);

	useEffect(() => {
		if (!isAuthenticated) return;

		if (!boardIdParam) {
			setIsLoading(false);
			router.replace("/");
			return;
		}

		setBoardId(boardIdParam);
		void loadBoard(boardIdParam);
	}, [boardIdParam, router, isAuthenticated, loadBoard]);

	async function handleGeneralSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim() || !boardId) return;

		setIsSubmitting(true);
		try {
			await putBoard({
				id: boardId,
				name: name.trim(),
				columns,
				weekStart: parseInt(weekStart, 10),
				archiveColumnId,
				showArchiveColumn,
			});
			router.push("/");
		} catch (error) {
			console.error("Failed to update board:", error);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleDelete() {
		if (!boardId) return;
		if (totalBoardCount <= 1) return;

		try {
			await deleteBoard(boardId);
			router.push("/");
		} catch (error) {
			console.error("Failed to delete board:", error);
		}
	}

	async function saveBoard(overrides?: {
		columns?: BoardColumn[];
		archiveColumnId?: string;
		showArchiveColumn?: boolean;
	}) {
		if (!boardId) return;

		const nextColumns = overrides?.columns ?? columns;
		const nextArchiveColumnId = overrides?.archiveColumnId ?? archiveColumnId;
		const nextShowArchiveColumn =
			overrides?.showArchiveColumn ?? showArchiveColumn;

		try {
			await putBoard({
				id: boardId,
				name: name.trim(),
				columns: nextColumns,
				weekStart: parseInt(weekStart, 10),
				archiveColumnId: nextArchiveColumnId,
				showArchiveColumn: nextShowArchiveColumn,
			});
		} catch (error) {
			console.error("Failed to save board:", error);
		}
	}

	const currentNamingPreset = namingPreset ?? getPresetKey(labels);
	const currentNamingLabels = customNamingLabels ?? labels;

	const handleNamingPresetChange = async (value: string) => {
		setNamingPreset(value);
		setNamingError(null);
		if (value !== "custom" && NAMING_PRESETS[value]) {
			setIsNamingSaving(true);
			try {
				await updateNaming(NAMING_PRESETS[value]);
				setCustomNamingLabels(null);
			} catch (error) {
				console.error("Failed to update naming preset:", error);
				setNamingError(
					error instanceof Error
						? error.message
						: "Naming preset could not be saved.",
				);
			} finally {
				setIsNamingSaving(false);
			}
		}
	};

	const handleCustomNamingChange = (
		field: keyof NamingLabels,
		value: string,
	) => {
		setCustomNamingLabels((prev) => {
			const newLabels = { ...(prev ?? labels), [field]: value };
			return newLabels;
		});
	};

	const handleSaveCustomNaming = async () => {
		if (!customNamingLabels) return;
		setIsNamingSaving(true);
		setNamingError(null);
		try {
			await updateNaming(customNamingLabels);
		} catch (error) {
			console.error("Failed to save custom naming labels:", error);
			setNamingError(
				error instanceof Error
					? error.message
					: "Custom labels could not be saved.",
			);
		} finally {
			setIsNamingSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-6 max-w-4xl">
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-32 bg-muted rounded" />
					<div className="h-96 bg-muted rounded" />
				</div>
			</div>
		);
	}

	if (!boardIdParam) {
		return null;
	}

	const canDeleteBoard = totalBoardCount > 1;

	return (
		<div className="container mx-auto p-6 max-w-4xl">
			<div className="mb-6 flex items-center justify-between">
				<Link href="/">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
				</Link>
				<Button
					variant="destructive"
					size="sm"
					onClick={() => setDeleteDialogOpen(true)}
					disabled={!canDeleteBoard}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Delete {labels.board}
				</Button>
			</div>

			<Tabs defaultValue="general" className="space-y-6">
				<TabsList>
					<TabsTrigger value="general">
						<Kanban className="mr-2 h-4 w-4" />
						General
					</TabsTrigger>
					<TabsTrigger value="swimlanes">
						<Layers className="mr-2 h-4 w-4" />
						Boards ({swimlanes.length})
					</TabsTrigger>
					<TabsTrigger value="columns">
						<Columns className="mr-2 h-4 w-4" />
						Kanban Columns
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<Card>
						<CardHeader>
							<CardTitle>{labels.board} Settings</CardTitle>
							<CardDescription>
								Configure your {labels.board.toLowerCase()} name and week
								settings
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleGeneralSubmit} className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="name">{labels.board} Name</Label>
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

								<div className="flex gap-3 pt-4">
									<Link href="/" className="flex-1">
										<Button type="button" variant="outline" className="w-full">
											Cancel
										</Button>
									</Link>
									<Button
										type="submit"
										className="flex-1"
										disabled={isSubmitting || !name.trim()}
									>
										{isSubmitting ? "Saving..." : "Save Changes"}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>

					<Card className="mt-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Tag className="h-5 w-5" />
								Naming Strategy
							</CardTitle>
							<CardDescription>
								Customize how {labels.boardPlural.toLowerCase()} and{" "}
								{labels.swimlanePlural.toLowerCase()} are displayed in the
								interface. Changes sync across your devices.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{namingError && (
								<p className="text-sm text-destructive">{namingError}</p>
							)}

							<div className="space-y-2">
								<Label htmlFor="namingPreset">Preset</Label>
								<Select
									value={currentNamingPreset}
									onValueChange={handleNamingPresetChange}
								>
									<SelectTrigger id="namingPreset" className="w-full">
										<SelectValue placeholder="Select a preset" />
									</SelectTrigger>
									<SelectContent>
										{PRESET_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{currentNamingPreset === "custom" && (
								<div className="space-y-4 pt-4 border-t">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="namingBoard">
												{labels.board} (Singular)
											</Label>
											<Input
												id="namingBoard"
												value={currentNamingLabels.board}
												onChange={(e) =>
													handleCustomNamingChange("board", e.target.value)
												}
												placeholder="e.g., Journey"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="namingBoardPlural">
												{labels.board} (Plural)
											</Label>
											<Input
												id="namingBoardPlural"
												value={currentNamingLabels.boardPlural}
												onChange={(e) =>
													handleCustomNamingChange(
														"boardPlural",
														e.target.value,
													)
												}
												placeholder="e.g., Journeys"
											/>
										</div>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="namingSwimlane">
												{labels.swimlane} (Singular)
											</Label>
											<Input
												id="namingSwimlane"
												value={currentNamingLabels.swimlane}
												onChange={(e) =>
													handleCustomNamingChange("swimlane", e.target.value)
												}
												placeholder="e.g., Milestone"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="namingSwimlanePlural">
												{labels.swimlane} (Plural)
											</Label>
											<Input
												id="namingSwimlanePlural"
												value={currentNamingLabels.swimlanePlural}
												onChange={(e) =>
													handleCustomNamingChange(
														"swimlanePlural",
														e.target.value,
													)
												}
												placeholder="e.g., Milestones"
											/>
										</div>
									</div>
									<Button
										onClick={handleSaveCustomNaming}
										disabled={isNamingSaving}
									>
										<Save className="h-4 w-4 mr-2" />
										{isNamingSaving ? "Saving..." : "Save Custom Labels"}
									</Button>
								</div>
							)}

							<div className="pt-4 border-t">
								<h3 className="text-sm font-medium mb-3">Preview</h3>
								<div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
									<p>
										<span className="text-muted-foreground">Singular:</span>{" "}
										<strong>
											{currentNamingPreset === "custom"
												? currentNamingLabels.board
												: (NAMING_PRESETS[currentNamingPreset]?.board ??
													labels.board)}
										</strong>{" "}
										/{" "}
										<strong>
											{currentNamingPreset === "custom"
												? currentNamingLabels.swimlane
												: (NAMING_PRESETS[currentNamingPreset]?.swimlane ??
													labels.swimlane)}
										</strong>
									</p>
									<p>
										<span className="text-muted-foreground">Plural:</span>{" "}
										<strong>
											{currentNamingPreset === "custom"
												? currentNamingLabels.boardPlural
												: (NAMING_PRESETS[currentNamingPreset]?.boardPlural ??
													labels.boardPlural)}
										</strong>{" "}
										/{" "}
										<strong>
											{currentNamingPreset === "custom"
												? currentNamingLabels.swimlanePlural
												: (NAMING_PRESETS[currentNamingPreset]
														?.swimlanePlural ?? labels.swimlanePlural)}
										</strong>
									</p>
									<p className="text-muted-foreground pt-2">
										{`Example: 3 ${currentNamingPreset === "custom" ? currentNamingLabels.swimlanePlural : (NAMING_PRESETS[currentNamingPreset]?.swimlanePlural ?? labels.swimlanePlural)} in this ${currentNamingPreset === "custom" ? currentNamingLabels.board : (NAMING_PRESETS[currentNamingPreset]?.board ?? labels.board)}`}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="swimlanes">
					<SwimlanesTab
						boardId={boardId}
						swimlanes={swimlanes}
						onSwimlanesChange={setSwimlanes}
					/>
				</TabsContent>

				<TabsContent value="columns">
					<ColumnsTabContent
						boardId={boardId}
						isEditMode
						columns={columns}
						archiveColumnId={archiveColumnId}
						showArchiveColumn={showArchiveColumn}
						onColumnsChange={setColumns}
						onArchiveColumnIdChange={setArchiveColumnId}
						onShowArchiveColumnChange={setShowArchiveColumn}
						onSave={saveBoard}
					/>
				</TabsContent>
			</Tabs>

			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {labels.board}</DialogTitle>
						<DialogDescription>
							{canDeleteBoard
								? `Are you sure you want to delete "${name}"? This action cannot be undone and will also delete all associated ${labels.swimlanePlural.toLowerCase()}, tasks, and data.`
								: `You cannot delete the last ${labels.board.toLowerCase()}. Create another ${labels.board.toLowerCase()} first.`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={!canDeleteBoard}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

interface SwimlanesTabProps {
	boardId: string;
	swimlanes: Swimlane[];
	onSwimlanesChange: (swimlanes: Swimlane[]) => void;
}

/**
 * @deprecated Part of the orphaned `/boards/view` route (see file header). The
 * `<SwimlaneDialog>` rendered here is unreachable from the running app.
 */
function SwimlanesTab({
	boardId,
	swimlanes,
	onSwimlanesChange,
}: SwimlanesTabProps) {
	const { labels } = useNaming();
	const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [deleteSwimlaneId, setDeleteSwimlaneId] = useState<string | null>(null);

	function handleAdd() {
		setEditingSwimlane(null);
		setIsDialogOpen(true);
	}

	function handleEdit(swimlane: Swimlane) {
		setEditingSwimlane(swimlane);
		setIsDialogOpen(true);
	}

	async function handleSave(swimlaneData: Partial<Swimlane>) {
		try {
			const saved = await putSwimlane({
				...swimlaneData,
				boardId,
			});

			if (editingSwimlane) {
				onSwimlanesChange(
					swimlanes.map((s) => (s.id === saved.id ? saved : s)),
				);
			} else {
				onSwimlanesChange([...swimlanes, saved]);
			}

			setIsDialogOpen(false);
			setEditingSwimlane(null);
		} catch (error) {
			console.error("Failed to save swimlane:", error);
		}
	}

	async function handleDeleteConfirm() {
		if (!deleteSwimlaneId) return;
		if (swimlanes.length <= 1) return;

		try {
			await deleteSwimlane(deleteSwimlaneId);
			onSwimlanesChange(swimlanes.filter((s) => s.id !== deleteSwimlaneId));
			setDeleteSwimlaneId(null);
		} catch (error) {
			console.error("Failed to delete swimlane:", error);
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">{labels.swimlanePlural}</h3>
					<p className="text-sm text-muted-foreground">
						Manage {labels.swimlanePlural.toLowerCase()} for this{" "}
						{labels.board.toLowerCase()}
					</p>
				</div>
				<Button onClick={handleAdd}>
					<Plus className="mr-2 h-4 w-4" />
					Add {labels.swimlane}
				</Button>
			</div>

			{swimlanes.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center p-12 text-center">
						<Layers className="h-12 w-12 text-muted-foreground mb-4" />
						<h4 className="text-lg font-semibold">
							No {labels.swimlanePlural.toLowerCase()} yet
						</h4>
						<p className="text-muted-foreground mb-4">
							Add {labels.swimlanePlural.toLowerCase()} to organize your work by
							team, project, or category
						</p>
						<Button onClick={handleAdd}>
							<Plus className="mr-2 h-4 w-4" />
							Add First {labels.swimlane}
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4">
					{swimlanes.map((swimlane) => (
						<Card key={swimlane.id} className="group">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div
											className="w-4 h-4 rounded-full"
											style={{ backgroundColor: swimlane.color || "#6366F1" }}
										/>
										<div>
											<h4 className="font-medium">{swimlane.name}</h4>
											{swimlane.label && (
												<p className="text-sm text-muted-foreground">
													Label: {swimlane.label}
												</p>
											)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-sm text-muted-foreground">
											{swimlane.currency}
										</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleEdit(swimlane)}
										>
											Edit
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setDeleteSwimlaneId(swimlane.id)}
											disabled={swimlanes.length <= 1}
										>
											<Trash2 className="h-4 w-4 text-destructive" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<SwimlaneDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				swimlane={editingSwimlane}
				boardId={boardId}
				onSave={handleSave}
			/>

			<Dialog
				open={!!deleteSwimlaneId}
				onOpenChange={(open) => !open && setDeleteSwimlaneId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {labels.swimlane}</DialogTitle>
						<DialogDescription>
							{swimlanes.length > 1
								? `Are you sure you want to delete this ${labels.swimlane.toLowerCase()}? This will also delete all associated tasks and data.`
								: `You cannot delete the last ${labels.swimlane.toLowerCase()} in this ${labels.board.toLowerCase()}. Create another one first.`}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteSwimlaneId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							disabled={swimlanes.length <= 1}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
