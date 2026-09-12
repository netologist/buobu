"use client";

import {
	useState,
	useCallback,
	useEffect,
	useMemo,
	type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AppHeader } from "@/components/kanban/AppHeader";
import { AppLayoutStatusBanner } from "@/components/layout/AppLayoutStatusBanner";
import { AppLayoutDeleteSwimlaneDialog } from "@/components/layout/AppLayoutDeleteSwimlaneDialog";
import { AppLayoutMiddlePanelContent } from "@/components/layout/AppLayoutMiddlePanelContent";
import { AppLayoutMobileToggleButton } from "@/components/layout/AppLayoutMobileToggleButton";
import { AppLayoutSheet } from "@/components/layout/AppLayoutSheet";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AppsBar } from "@/components/layout/AppsBar";
import { BoardModal } from "@/components/ui/BoardModal";
import { SwimlaneDialog } from "@/components/ui/swimlane-dialog";
import { NamingProvider } from "@/contexts/NamingContext";
import { DEFAULT_NAMING } from "@/lib/naming";
import type { Database } from "@/lib/rxdb";
import type { Board, Swimlane } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useArchiveViewStore } from "@/stores/archive-view-store";
import { useBoardStore } from "@/stores/board-store";
import {
	useSwimlaneSelectionDerived,
	useSwimlaneSelectionStore,
} from "@/stores/swimlane-selection-store";
import {
	buildSearchContextLabel,
	clearSearchScopedFilters,
	isSearchContextActive,
} from "@/lib/navigation/search-context";

export type SidebarConfig = {
	showBoards?: boolean;
	boards: Board[];
	swimlanes: Swimlane[];
	/** All boards including archived ones (for compact mode archive toggle) */
	allBoards?: Board[];
	/** All swimlanes including archived ones (for compact mode archive toggle) */
	allSwimlanes?: Swimlane[];
	swimlaneCounts?: Record<string, number>;
	onSwimlaneChange?: (id: string, boardId: string) => void;
	onSwimlaneDragOver?: (swimlaneId: string) => void;
	onSwimlaneDragLeave?: () => void;
	onSwimlaneDrop?: (swimlaneId: string) => void;
	dragOverSwimlaneId?: string | null;
	renderSwimlaneIcon?: (swimlane: Swimlane) => ReactNode;
	multiSelectSwimlanes?: boolean;
	allItemVisible?: boolean;
	allItemActive?: boolean;
	allItemLabel?: string;
	allItemCount?: number;
	showAllBoardsOption?: boolean;
	onAddSwimlane?: (
		boardId: string,
		swimlane: Partial<Swimlane>,
	) => void | Promise<void>;
	onEditSwimlane?: (swimlane: Swimlane) => void | Promise<void>;
	onDeleteSwimlane?: (swimlaneId: string) => void | Promise<void>;
	onBoardDeleted?: () => void | Promise<void>;
	onBoardCreated?: (board: Board) => void | Promise<void>;
	db?: Database | null;
	/** True when the currently selected board/swimlane is archived (compact mode archive selection) */
	isArchivedSelectionMode?: boolean;
};

export type AppLayoutProps = {
	sidebarConfig: SidebarConfig;
	middlePanel: ReactNode;
	rightPanel: ReactNode;
	middlePanelRef?: React.RefObject<HTMLDivElement | null>;
	rightPanelRef?: React.RefObject<HTMLDivElement | null>;
	middlePanelClassName?: string;
	rightPanelClassName?: string;
};

export function AppLayout({
	sidebarConfig,
	middlePanel,
	rightPanel,
	middlePanelRef,
	rightPanelRef,
	middlePanelClassName,
	rightPanelClassName,
}: Readonly<AppLayoutProps>) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
	const [addingSwimlaneToBoard, setAddingSwimlaneToBoard] = useState<
		string | null
	>(null);
	const [deletingSwimlaneId, setDeletingSwimlaneId] = useState<string | null>(
		null,
	);
	const [editBoardModalOpen, setEditBoardModalOpen] = useState(false);
	const [addBoardModalOpen, setAddBoardModalOpen] = useState(false);
	const [currentBoardWithNaming, setCurrentBoardWithNaming] =
		useState<Board | null>(null);
	const archiveTarget = useArchiveViewStore((s) => s.target);
	const exitArchiveView = useArchiveViewStore((s) => s.exit);
	const isArchiveView = !!archiveTarget;
	const searchParamsState = useMemo(
		() => new URLSearchParams(searchParams.toString()),
		[searchParams],
	);
	const isSearchContext = isSearchContextActive(searchParamsState);
	const searchContextLabel = buildSearchContextLabel(searchParamsState);

	const { primaryBoardId, isAllSelected } = useSwimlaneSelectionDerived();
	const { selectBoard } = useSwimlaneSelectionStore();

	const selectedBoardId = useMemo(() => {
		if (primaryBoardId) return primaryBoardId;
		return sidebarConfig.boards[0]?.id ?? null;
	}, [primaryBoardId, sidebarConfig.boards]);

	const filteredSwimlanes = useMemo(() => {
		if (!selectedBoardId) return [];
		return sidebarConfig.swimlanes.filter(
			(sw) => sw.boardId === selectedBoardId,
		);
	}, [sidebarConfig.swimlanes, selectedBoardId]);

	const selectedBoard = useMemo(() => {
		const board =
			sidebarConfig.boards.find((b) => b.id === selectedBoardId) ?? null;
		if (currentBoardWithNaming?.id === selectedBoardId) {
			return currentBoardWithNaming;
		}
		return board;
	}, [sidebarConfig.boards, selectedBoardId, currentBoardWithNaming]);

	useEffect(() => {
		if (sidebarConfig.boards.length === 0) return;

		const firstBoardId = sidebarConfig.boards[0].id;
		// Also accept archived boards as a valid primary so that archived-board
		// selection in CompactNavigation doesn't fight this guard in a loop.
		const allBoards = sidebarConfig.allBoards ?? sidebarConfig.boards;
		const hasValidPrimary =
			isAllSelected ||
			(!!primaryBoardId &&
				allBoards.some((board) => board.id === primaryBoardId));

		if (!hasValidPrimary) {
			selectBoard(firstBoardId);
		}
	}, [
		sidebarConfig.boards,
		sidebarConfig.allBoards,
		primaryBoardId,
		isAllSelected,
		selectBoard,
	]);

	const handleOpenAddSwimlane = useCallback(() => {
		if (selectedBoardId) {
			setAddingSwimlaneToBoard(selectedBoardId);
			setEditingSwimlane(null);
		}
	}, [selectedBoardId]);

	const handleOpenEditSwimlane = useCallback((swimlane: Swimlane) => {
		setEditingSwimlane(swimlane);
		setAddingSwimlaneToBoard(null);
	}, []);

	const closeSwimlaneDialog = useCallback(() => {
		setEditingSwimlane(null);
		setAddingSwimlaneToBoard(null);
	}, []);

	const handleSaveSwimlane = useCallback(
		async (data: Partial<Swimlane>) => {
			if (addingSwimlaneToBoard && sidebarConfig.onAddSwimlane) {
				await sidebarConfig.onAddSwimlane(addingSwimlaneToBoard, data);
				setAddingSwimlaneToBoard(null);
			} else if (editingSwimlane && sidebarConfig.onEditSwimlane) {
				await sidebarConfig.onEditSwimlane({ ...editingSwimlane, ...data });
				setEditingSwimlane(null);
			}
		},
		[addingSwimlaneToBoard, editingSwimlane, sidebarConfig],
	);

	const handleConfirmDeleteSwimlane = useCallback(async () => {
		if (filteredSwimlanes.length <= 1) return;
		if (deletingSwimlaneId && sidebarConfig.onDeleteSwimlane) {
			await sidebarConfig.onDeleteSwimlane(deletingSwimlaneId);
			setDeletingSwimlaneId(null);
		}
	}, [deletingSwimlaneId, filteredSwimlanes.length, sidebarConfig]);

	const handleBoardDeleted = useCallback(() => {
		sidebarConfig.onBoardDeleted?.();
		router.push("/");
	}, [sidebarConfig, router]);

	const handleBoardCreated = useCallback(
		async (board: Board) => {
			selectBoard(board.id);
			sidebarConfig.onBoardCreated?.(board);
		},
		[selectBoard, sidebarConfig],
	);

	const clearSearchContext = useCallback(() => {
		const params = clearSearchScopedFilters(
			new URLSearchParams(searchParams.toString()),
		);
		const search = params.toString();
		router.replace(
			search
				? `${globalThis.location.pathname}?${search}`
				: globalThis.location.pathname,
		);
	}, [router, searchParams]);

	const isDialogOpen = !!editingSwimlane || !!addingSwimlaneToBoard;
	const labels = selectedBoard?.naming ?? DEFAULT_NAMING;

	const [mobileMiddlePanelOpen, setMobileMiddlePanelOpen] = useState(false);

	const compactNavigationProps = useMemo(
		() => ({
			boards: sidebarConfig.boards,
			swimlanes: sidebarConfig.swimlanes,
			allBoards: sidebarConfig.allBoards,
			allSwimlanes: sidebarConfig.allSwimlanes,
			swimlaneCounts: sidebarConfig.swimlaneCounts,
			showAllBoardsOption: sidebarConfig.showAllBoardsOption,
			labels,
			onAddBoard: () => setAddBoardModalOpen(true),
			onAddSwimlane: handleOpenAddSwimlane,
			onEditBoard: (board: Board) => {
				selectBoard(board.id);
				setEditBoardModalOpen(true);
			},
			onEditSwimlane: handleOpenEditSwimlane,
			onDeleteSwimlane: (swimlane: Swimlane) =>
				setDeletingSwimlaneId(swimlane.id),
			onArchiveBoard: (board: Board) =>
				useBoardStore.getState().archiveBoard(board.id),
			onArchiveSwimlane: (swimlane: Swimlane) =>
				useBoardStore.getState().archiveSwimlane(swimlane.id),
			onUnarchiveBoard: (boardId: string) =>
				useBoardStore.getState().unarchiveBoard(boardId),
			onUnarchiveSwimlane: (swimlaneId: string) =>
				useBoardStore.getState().unarchiveSwimlane(swimlaneId),
		}),
		[
			handleOpenAddSwimlane,
			handleOpenEditSwimlane,
			labels,
			selectBoard,
			sidebarConfig.allBoards,
			sidebarConfig.allSwimlanes,
			sidebarConfig.boards,
			sidebarConfig.swimlaneCounts,
			sidebarConfig.swimlanes,
			sidebarConfig.showAllBoardsOption,
		],
	);

	return (
		<NamingProvider
			board={selectedBoard}
			onBoardUpdated={setCurrentBoardWithNaming}
		>
			<div className="flex h-dvh flex-col">
				<AppHeader
					mobileMiddlePanelToggle={
						<AppLayoutMobileToggleButton
							ariaLabel={mobileMiddlePanelOpen ? "Close panel" : "Open panel"}
							active={mobileMiddlePanelOpen}
							onClick={() => setMobileMiddlePanelOpen((open) => !open)}
						>
							{mobileMiddlePanelOpen ? (
								<PanelLeftClose className="h-5 w-5" />
							) : (
								<PanelLeftOpen className="h-5 w-5" />
							)}
						</AppLayoutMobileToggleButton>
					}
					onMobileMiddlePanelToggle={() =>
						setMobileMiddlePanelOpen((open) => !open)
					}
				/>

				<AppLayoutSheet
					open={mobileMiddlePanelOpen}
					onOpenChange={setMobileMiddlePanelOpen}
					side="left"
					title="Panel"
					className="w-80 p-0"
				>
					<div className="flex h-full flex-col overflow-hidden">
						<AppLayoutMiddlePanelContent
							isArchiveView={isArchiveView}
							compactNavigationProps={compactNavigationProps}
							compactNavigationWrapperClassName="shrink-0 border-b p-2"
							middlePanel={middlePanel}
						/>
					</div>
				</AppLayoutSheet>

				{isArchiveView && (
					<AppLayoutStatusBanner
						variant="archive-view"
						onExitArchiveView={exitArchiveView}
					/>
				)}

				{sidebarConfig.isArchivedSelectionMode && !isArchiveView && (
					<AppLayoutStatusBanner variant="archived-selection" />
				)}

				{isSearchContext && !isArchiveView && (
					<AppLayoutStatusBanner
						variant="search-context"
						searchContextLabel={searchContextLabel}
						onResetSearchContext={clearSearchContext}
					/>
				)}

				<div className="flex flex-1 overflow-hidden">
					<div className="flex flex-1 overflow-hidden">
						{/* Apps Bar — desktop only */}
						<AppsBar />
						{/* Desktop middle panel */}
						<div
							ref={middlePanelRef}
							className={cn(
								"hidden w-72 shrink-0 flex-col border-r bg-background overflow-hidden md:flex",
								middlePanelClassName,
							)}
						>
							<AppLayoutMiddlePanelContent
								isArchiveView={isArchiveView}
								compactNavigationProps={compactNavigationProps}
								compactNavigationWrapperClassName="shrink-0 border-b"
								middlePanel={middlePanel}
							/>
						</div>
						<div
							ref={rightPanelRef}
							className={cn(
								"flex flex-1 flex-col bg-background overflow-hidden pb-16 md:pb-0",
								rightPanelClassName,
								isArchiveView && "pointer-events-none opacity-80",
							)}
						>
							{rightPanel}
						</div>
					</div>
				</div>

				<SwimlaneDialog
					open={isDialogOpen}
					onOpenChange={(open) => {
						if (!open) {
							closeSwimlaneDialog();
						}
					}}
					swimlane={editingSwimlane}
					boardId={addingSwimlaneToBoard ?? editingSwimlane?.boardId}
					onSave={handleSaveSwimlane}
					onArchive={async (swimlaneId) => {
						await useBoardStore.getState().archiveSwimlane(swimlaneId);
					}}
				/>

				<BoardModal
					open={editBoardModalOpen}
					onOpenChange={setEditBoardModalOpen}
					boardId={selectedBoardId}
					onDeleted={handleBoardDeleted}
				/>

				<BoardModal
					open={addBoardModalOpen}
					onOpenChange={setAddBoardModalOpen}
					onCreated={handleBoardCreated}
				/>

				<AppLayoutDeleteSwimlaneDialog
					open={!!deletingSwimlaneId}
					canDelete={filteredSwimlanes.length > 1}
					onOpenChange={(open) => {
						if (!open) {
							setDeletingSwimlaneId(null);
						}
					}}
					onDelete={handleConfirmDeleteSwimlane}
				/>

				<MobileBottomNav />
			</div>
		</NamingProvider>
	);
}
