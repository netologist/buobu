"use client";

import { Kanban, Columns, Tag, Layers } from "lucide-react";

import { BoardModalDeleteDialog } from "@/components/ui/board-modal-delete-dialog";
import { BoardModalFooter } from "@/components/ui/board-modal-footer";
import { ColumnsTabContent } from "@/components/ui/board-modal-columns-tab";
import { BoardModalGeneralTab } from "@/components/ui/board-modal-general-tab";
import { BoardModalNamingTab } from "@/components/ui/board-modal-naming-tab";
import { SwimlanesTabContent } from "@/components/ui/board-modal-swimlanes-tab";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { SwimlaneDialog } from "@/components/ui/swimlane-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBoardModalForm } from "@/hooks/useBoardModalForm";
import { UpgradeDialog } from "@/components/subscriptions/UpgradeDialog";
import type { Board } from "@/lib/types";

export type BoardModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Omit or pass null for create mode; pass a string boardId for edit mode */
	boardId?: string | null;
	onCreated?: (board: Board) => void;
	onDeleted?: () => void;
};

export function BoardModal(props: BoardModalProps) {
	const { open, onOpenChange, boardId } = props;
	const {
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
	} = useBoardModalForm(props);

	const tabsListClassName = isEditMode
		? "grid grid-cols-4"
		: "grid grid-cols-3";
	const columnsErrorMessage =
		typeof errors.columns?.message === "string"
			? errors.columns.message
			: undefined;
	const archiveColumnErrorMessage =
		typeof errors.archiveColumnId?.message === "string"
			? errors.archiveColumnId.message
			: undefined;

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{isEditMode
								? `Edit ${labels.board}`
								: `New ${defaultLabels.board}`}
						</DialogTitle>
						<DialogDescription>
							{isEditMode
								? `Manage settings, columns, and ${labels.swimlanePlural.toLowerCase()} for this ${labels.board.toLowerCase()}`
								: `Set up your new ${defaultLabels.board.toLowerCase()} with columns and naming`}
						</DialogDescription>
					</DialogHeader>

					{isLoading ? (
						<div className="animate-pulse space-y-4 py-6">
							<div className="h-10 rounded-md bg-muted" />
							<div className="h-8 w-2/3 rounded-md bg-muted" />
							<div className="h-48 rounded-md bg-muted" />
						</div>
					) : (
						<>
							<Tabs defaultValue="general" className="space-y-4">
								<TabsList className={tabsListClassName}>
									<TabsTrigger value="general" className="gap-1.5">
										<Kanban className="h-3.5 w-3.5" />
										General
									</TabsTrigger>
									<TabsTrigger value="naming" className="gap-1.5">
										<Tag className="h-3.5 w-3.5" />
										Naming
									</TabsTrigger>
									{isEditMode && (
										<TabsTrigger value="swimlanes" className="gap-1.5">
											<Layers className="h-3.5 w-3.5" />
											{labels.swimlanePlural}
										</TabsTrigger>
									)}
									<TabsTrigger value="columns" className="gap-1.5">
										<Columns className="h-3.5 w-3.5" />
										Columns
									</TabsTrigger>
								</TabsList>

								<TabsContent value="general">
									<BoardModalGeneralTab
										displayLabels={displayLabels}
										isEditMode={isEditMode}
										control={control}
										register={register}
										errors={errors}
									/>
								</TabsContent>

								<TabsContent value="naming">
									<BoardModalNamingTab
										displayLabels={displayLabels}
										currentNamingPreset={currentNamingPreset}
										currentNamingLabels={currentNamingLabels}
										namingPreviewLabels={namingPreviewLabels}
										isEditMode={isEditMode}
										isNamingSaving={isNamingSaving}
										onNamingPresetChange={handleNamingPresetChange}
										onCustomNamingChange={handleCustomNamingChange}
										onSaveCustomNaming={handleSaveCustomNaming}
									/>
								</TabsContent>

								{isEditMode && (
									<TabsContent value="swimlanes">
										<SwimlanesTabContent
											boardId={boardId ?? null}
											swimlanes={swimlanes}
											labels={labels}
											onSwimlanesChange={setSwimlanes}
											onEditSwimlane={openEditSwimlane}
											onNewSwimlane={openNewSwimlaneDialog}
										/>
									</TabsContent>
								)}

								<TabsContent value="columns">
									<ColumnsTabContent
										boardId={boardId ?? null}
										isEditMode={isEditMode}
										columns={columns}
										archiveColumnId={archiveColumnId}
										showArchiveColumn={showArchiveColumn}
										columnsError={columnsErrorMessage}
										archiveColumnError={archiveColumnErrorMessage}
										onColumnsChange={handleColumnsChange}
										onArchiveColumnIdChange={handleArchiveColumnIdChange}
										onShowArchiveColumnChange={handleShowArchiveColumnChange}
										onSave={isEditMode ? saveBoard : undefined}
									/>
								</TabsContent>
							</Tabs>

							<BoardModalFooter
								isEditMode={isEditMode}
								isArchiving={isArchiving}
								canDeleteBoard={canDeleteBoard}
								isSubmitting={isSubmitting}
								defaultLabels={defaultLabels}
								onArchive={handleArchive}
								onOpenDeleteDialog={openDeleteDialog}
								onCancel={handleCancel}
								onSubmit={
									isEditMode
										? handleSubmit(handleSave)
										: handleSubmit(handleCreate)
								}
							/>
						</>
					)}
				</DialogContent>
			</Dialog>

			{isEditMode && (
				<SwimlaneDialog
					open={swimlaneDialogOpen}
					onOpenChange={handleSwimlaneDialogOpenChange}
					swimlane={editingSwimlane}
					boardId={boardId ?? undefined}
					onSave={handleSaveSwimlane}
				/>
			)}

			{isEditMode && (
				<BoardModalDeleteDialog
					open={deleteDialogOpen}
					onOpenChange={setDeleteDialogOpen}
					labels={labels}
					canDeleteBoard={canDeleteBoard}
					boardName={nameValue}
					onDelete={handleDelete}
				/>
			)}

			{boardBlocked && (
				<UpgradeDialog
					open
					onOpenChange={(open) => !open && dismissBoardDialog()}
					feature={boardBlocked.feature}
					current={boardBlocked.current}
					limit={boardBlocked.limit}
				/>
			)}

			{swimlaneBlocked && (
				<UpgradeDialog
					open
					onOpenChange={(open) => !open && dismissSwimlaneDialog()}
					feature={swimlaneBlocked.feature}
					current={swimlaneBlocked.current}
					limit={swimlaneBlocked.limit}
				/>
			)}
		</>
	);
}
