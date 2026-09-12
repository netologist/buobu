"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";

import { getDefaultNaming } from "@/contexts/NamingContext";
import {
	getAllBoards,
	getBoardById,
	getSwimlanesByBoard,
	putSwimlane,
} from "@/lib/db";
import { NAMING_PRESETS, getPresetKey } from "@/lib/naming";
import type { Board, BoardColumn, NamingLabels, Swimlane } from "@/lib/types";
import {
	boardFormSchema,
	type BoardFormValues,
} from "@/lib/validation/boardForm";
import { useBoardStore } from "@/stores/board-store";
import { DEFAULT_ARCHIVE_COLUMN_ID } from "@/lib/constants";
import { useDefaultCurrencyStore } from "@/stores/default-currency-store";
import { useUpgradeGuard } from "@/hooks/useUpgradeGuard";

const DEFAULT_COLUMNS: BoardColumn[] = [
	{ id: "todo", title: "To Do", order: 0 },
	{ id: "in-progress", title: "In Progress", order: 1 },
	{ id: "review", title: "Review", order: 2 },
	{ id: DEFAULT_ARCHIVE_COLUMN_ID, title: "Done", order: 3 },
];

function resolveArchiveColumnId(
	columns: BoardColumn[],
	preferredId?: string | null,
) {
	if (preferredId && columns.some((column) => column.id === preferredId)) {
		return preferredId;
	}

	return (
		columns.find((column) => column.id === DEFAULT_ARCHIVE_COLUMN_ID)?.id ??
		columns.at(-1)?.id ??
		DEFAULT_ARCHIVE_COLUMN_ID
	);
}

const DEFAULT_FORM_VALUES: BoardFormValues = {
	name: "",
	description: "",
	weekStart: "1",
	columns: DEFAULT_COLUMNS,
	archiveColumnId: resolveArchiveColumnId(
		DEFAULT_COLUMNS,
		DEFAULT_ARCHIVE_COLUMN_ID,
	),
	showArchiveColumn: false,
};

type UseBoardModalFormArgs = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	boardId?: string | null;
	onCreated?: (board: Board) => void;
	onDeleted?: () => void;
};

type BoardSaveOverrides = {
	columns?: BoardColumn[];
	archiveColumnId?: string;
	showArchiveColumn?: boolean;
};

type BuildBoardPayloadArgs = {
	id?: string;
	data: BoardFormValues;
	naming: NamingLabels;
	fallbackName?: string;
	overrides?: BoardSaveOverrides;
};

function buildBoardPayload({
	id,
	data,
	naming,
	fallbackName,
	overrides = {},
}: BuildBoardPayloadArgs): Partial<Board> {
	const nextColumns = overrides.columns ?? data.columns;
	const nextArchiveColumnId = resolveArchiveColumnId(
		nextColumns,
		overrides.archiveColumnId ?? data.archiveColumnId,
	);

	return {
		...(id ? { id } : {}),
		name: data.name.trim() || fallbackName || "",
		description: data.description?.trim() || undefined,
		columns: nextColumns,
		weekStart: parseInt(data.weekStart, 10),
		archiveColumnId: nextArchiveColumnId,
		showArchiveColumn: overrides.showArchiveColumn ?? data.showArchiveColumn,
		naming,
	};
}

export function useBoardModalForm({
	open,
	onOpenChange,
	boardId,
	onCreated,
	onDeleted,
}: UseBoardModalFormArgs) {
	const isEditMode = Boolean(boardId);
	const defaultLabels = useMemo(() => getDefaultNaming(), []);

	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);
	const [canDeleteBoard, setCanDeleteBoard] = useState(true);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
	const [labels, setLabels] = useState<NamingLabels>(defaultLabels);
	const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);

	const [namingPreset, setNamingPreset] = useState<string | null>(null);
	const [customNamingLabels, setCustomNamingLabels] =
		useState<NamingLabels | null>(null);
	const [isNamingSaving, setIsNamingSaving] = useState(false);

	const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
	const [swimlaneDialogOpen, setSwimlaneDialogOpen] = useState(false);

	const {
		register,
		handleSubmit,
		control,
		watch,
		getValues,
		setValue,
		reset,
		formState: { errors },
	} = useForm<BoardFormValues>({
		resolver: zodResolver(boardFormSchema, undefined, { mode: "sync" }),
		defaultValues: DEFAULT_FORM_VALUES,
	});

	const nameValue = watch("name");
	const columns = watch("columns");
	const archiveColumnId = watch("archiveColumnId");
	const showArchiveColumn = watch("showArchiveColumn");

	const syncCurrentBoard = useCallback(
		(board: Board | void | null | undefined) => {
			if (!board) return;
			setCurrentBoard(board);
			setLabels(board.naming ?? defaultLabels);
		},
		[defaultLabels],
	);

	const resetState = useCallback(() => {
		setCurrentBoard(null);
		setLabels(defaultLabels);
		setSwimlanes([]);
		setIsLoading(false);
		setIsSubmitting(false);
		setIsArchiving(false);
		setCanDeleteBoard(true);
		setDeleteDialogOpen(false);
		setNamingPreset(null);
		setCustomNamingLabels(null);
		setEditingSwimlane(null);
		setSwimlaneDialogOpen(false);
		reset(DEFAULT_FORM_VALUES);
	}, [defaultLabels, reset]);

	const applyBoardToForm = useCallback(
		(board: Board) => {
			const nextColumns = board.columns?.length
				? board.columns
				: DEFAULT_COLUMNS;

			syncCurrentBoard(board);
			reset({
				name: board.name,
				description: board.description ?? "",
				weekStart: String(board.weekStart || 1) as BoardFormValues["weekStart"],
				columns: nextColumns,
				archiveColumnId: resolveArchiveColumnId(
					nextColumns,
					board.archiveColumnId,
				),
				showArchiveColumn: board.showArchiveColumn || false,
			});
		},
		[reset, syncCurrentBoard],
	);

	const loadBoard = useCallback(
		async (id: string) => {
			setIsLoading(true);
			try {
				const [boardData, allBoards, boardSwimlanes] = await Promise.all([
					getBoardById(id),
					getAllBoards(),
					getSwimlanesByBoard(id),
				]);

				if (!boardData) {
					onOpenChange(false);
					return;
				}

				applyBoardToForm(boardData);
				setSwimlanes(boardSwimlanes);
				setCanDeleteBoard(allBoards.length > 1);
			} catch (error) {
				console.error("Failed to load board:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[applyBoardToForm, onOpenChange],
	);

	useEffect(() => {
		if (!open) {
			resetState();
			return;
		}

		if (boardId) {
			void loadBoard(boardId);
			return;
		}

		resetState();
	}, [boardId, loadBoard, open, resetState]);

	const currentNamingPreset = useMemo(
		() => namingPreset ?? getPresetKey(labels),
		[labels, namingPreset],
	);
	const currentNamingLabels = customNamingLabels ?? labels;
	const displayLabels = isEditMode ? labels : defaultLabels;
	const namingPreviewLabels =
		currentNamingPreset === "custom"
			? currentNamingLabels
			: (NAMING_PRESETS[currentNamingPreset] ?? displayLabels);

	const updateNaming = useCallback(
		async (newLabels: NamingLabels) => {
			if (!currentBoard) return;
			const updatedBoard = await useBoardStore.getState().putBoard({
				...currentBoard,
				naming: newLabels,
			});
			syncCurrentBoard(updatedBoard);
		},
		[currentBoard, syncCurrentBoard],
	);

	const handleNamingPresetChange = useCallback(
		async (value: string) => {
			setNamingPreset(value);
			if (value === "custom" || !NAMING_PRESETS[value]) return;

			if (isEditMode) {
				setIsNamingSaving(true);
				try {
					await updateNaming(NAMING_PRESETS[value]);
				} finally {
					setIsNamingSaving(false);
				}
			}

			setCustomNamingLabels(null);
		},
		[isEditMode, updateNaming],
	);

	const handleCustomNamingChange = useCallback(
		(field: keyof NamingLabels, value: string) => {
			setCustomNamingLabels((prev) => ({
				...(prev ?? labels),
				[field]: value,
			}));
		},
		[labels],
	);

	const handleSaveCustomNaming = useCallback(async () => {
		if (!customNamingLabels) return;

		setIsNamingSaving(true);
		try {
			if (isEditMode) {
				await updateNaming(customNamingLabels);
			}
		} finally {
			setIsNamingSaving(false);
		}
	}, [customNamingLabels, isEditMode, updateNaming]);

	const saveBoard = useCallback(
		async (overrides: BoardSaveOverrides = {}) => {
			if (!boardId) return;

			const updatedBoard = await useBoardStore.getState().putBoard(
				buildBoardPayload({
					id: boardId,
					data: getValues(),
					naming: currentNamingLabels,
					fallbackName: currentBoard?.name,
					overrides,
				}),
			);

			syncCurrentBoard(updatedBoard);
		},
		[
			boardId,
			currentBoard?.name,
			currentNamingLabels,
			getValues,
			syncCurrentBoard,
		],
	);

	const {
		guard: boardGuard,
		blocked: boardBlocked,
		dismissDialog: dismissBoardDialog,
	} = useUpgradeGuard();
	const defaultCurrency = useDefaultCurrencyStore.getState().currency;

	const handleCreate = useCallback(
		async (data: BoardFormValues) => {
			const boards = useBoardStore.getState().boards;
			const activeCount = boards.filter(
				(b) => !b.archived && !b._deleted,
			).length;
			if (!boardGuard("boards", activeCount)) return;

			setIsSubmitting(true);
			try {
				const nextBoardId = nanoid();
				const board = buildBoardPayload({
					id: nextBoardId,
					data,
					naming: currentNamingLabels,
				});

				await useBoardStore.getState().putBoard(board);
				await putSwimlane({
					boardId: nextBoardId,
					name: "General",
					currency: defaultCurrency,
					pomodoroMinutes: 25,
					breakMinutes: 5,
					order: 0,
				});

				onCreated?.(board as Board);
				onOpenChange(false);
			} catch (error) {
				console.error("Failed to create board:", error);
			} finally {
				setIsSubmitting(false);
			}
		},
		[boardGuard, currentNamingLabels, defaultCurrency, onCreated, onOpenChange],
	);

	const handleSave = useCallback(
		async (data: BoardFormValues) => {
			if (!boardId) return;

			setIsSubmitting(true);
			try {
				const updatedBoard = await useBoardStore.getState().putBoard(
					buildBoardPayload({
						id: boardId,
						data,
						naming: currentNamingLabels,
						fallbackName: currentBoard?.name,
					}),
				);

				syncCurrentBoard(updatedBoard);
				onOpenChange(false);
			} catch (error) {
				console.error("Failed to update board:", error);
			} finally {
				setIsSubmitting(false);
			}
		},
		[
			boardId,
			currentBoard?.name,
			currentNamingLabels,
			onOpenChange,
			syncCurrentBoard,
		],
	);

	const handleDelete = useCallback(async () => {
		if (!boardId || !canDeleteBoard) return;

		try {
			await useBoardStore.getState().deleteBoard(boardId);
			setDeleteDialogOpen(false);
			onOpenChange(false);
			onDeleted?.();
		} catch (error) {
			console.error("Failed to delete board:", error);
		}
	}, [boardId, canDeleteBoard, onDeleted, onOpenChange]);

	const handleArchive = useCallback(async () => {
		if (!boardId) return;

		setIsArchiving(true);
		try {
			await useBoardStore.getState().archiveBoard(boardId);
			onOpenChange(false);
			onDeleted?.();
		} catch (error) {
			console.error("Failed to archive board:", error);
		} finally {
			setIsArchiving(false);
		}
	}, [boardId, onDeleted, onOpenChange]);

	const {
		guard: swimlaneGuard,
		blocked: swimlaneBlocked,
		dismissDialog: dismissSwimlaneDialog,
	} = useUpgradeGuard();

	const handleSaveSwimlane = useCallback(
		async (data: Partial<Swimlane>) => {
			if (!data.id && boardId) {
				const activeCount = swimlanes.filter(
					(s) => !s.archived && !s._deleted,
				).length;
				if (!swimlaneGuard("swimlanesPerBoard", activeCount)) return;
				const newSwimlane = await putSwimlane({
					...data,
					boardId,
					order: swimlanes.length,
				});
				setSwimlanes((prev) => [...prev, newSwimlane]);
			} else if (data.id) {
				const existing = swimlanes.find((swimlane) => swimlane.id === data.id);
				await putSwimlane({
					...existing,
					...data,
					order: existing?.order ?? 0,
				});
				const merged = {
					...existing,
					...data,
					order: existing?.order ?? 0,
				} as Swimlane;
				setSwimlanes((prev) =>
					prev.map((swimlane) => (swimlane.id === data.id ? merged : swimlane)),
				);
			}

			setSwimlaneDialogOpen(false);
			setEditingSwimlane(null);
		},
		[boardId, swimlaneGuard, swimlanes],
	);

	const openDeleteDialog = useCallback(() => {
		setDeleteDialogOpen(true);
	}, []);

	const handleCancel = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const openEditSwimlane = useCallback((swimlane: Swimlane) => {
		setEditingSwimlane(swimlane);
		setSwimlaneDialogOpen(true);
	}, []);

	const openNewSwimlaneDialog = useCallback(() => {
		setEditingSwimlane(null);
		setSwimlaneDialogOpen(true);
	}, []);

	const handleSwimlaneDialogOpenChange = useCallback((nextOpen: boolean) => {
		if (!nextOpen) {
			setSwimlaneDialogOpen(false);
			setEditingSwimlane(null);
			return;
		}

		setSwimlaneDialogOpen(true);
	}, []);

	const handleColumnsChange = useCallback(
		(nextColumns: BoardColumn[]) => {
			setValue("columns", nextColumns, { shouldValidate: true });
		},
		[setValue],
	);

	const handleArchiveColumnIdChange = useCallback(
		(id: string) => {
			setValue("archiveColumnId", id, { shouldValidate: true });
		},
		[setValue],
	);

	const handleShowArchiveColumnChange = useCallback(
		(show: boolean) => {
			setValue("showArchiveColumn", show, { shouldValidate: true });
		},
		[setValue],
	);

	return {
		isEditMode,
		defaultLabels,
		isLoading,
		isSubmitting,
		isArchiving,
		canDeleteBoard,
		deleteDialogOpen,
		setDeleteDialogOpen,
		labels,
		swimlanes,
		setSwimlanes,
		currentNamingPreset,
		currentNamingLabels,
		displayLabels,
		namingPreviewLabels,
		isNamingSaving,
		editingSwimlane,
		swimlaneDialogOpen,
		register,
		handleSubmit,
		control,
		errors,
		nameValue,
		columns,
		archiveColumnId,
		showArchiveColumn,
		handleNamingPresetChange,
		handleCustomNamingChange,
		handleSaveCustomNaming,
		handleCreate,
		handleSave,
		handleDelete,
		handleArchive,
		handleSaveSwimlane,
		openDeleteDialog,
		handleCancel,
		openEditSwimlane,
		openNewSwimlaneDialog,
		handleSwimlaneDialogOpenChange,
		handleColumnsChange,
		handleArchiveColumnIdChange,
		handleShowArchiveColumnChange,
		saveBoard,
		boardBlocked,
		dismissBoardDialog,
		swimlaneBlocked,
		dismissSwimlaneDialog,
	};
}
