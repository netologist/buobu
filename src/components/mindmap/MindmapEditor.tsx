"use client";

import { MindmapCanvas } from "@/components/mindmap/MindmapCanvas";
import { MindmapToolbar } from "@/components/mindmap/MindmapToolbar";
import { useMindmapEditor } from "@/hooks/useMindmapEditor";
import type { Mindmap } from "@/lib/types";

type Props = {
  mindmap: Mindmap | null;
  isCreating?: boolean;
  onSave: (data: Partial<Mindmap>) => Promise<void>;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  swimlaneName?: string;
};

export function MindmapEditor({
  mindmap,
  isCreating,
  onSave,
  onDelete,
  onArchive,
  onRestore,
  swimlaneName,
}: Props) {
  const {
    isEmptyState,
    title,
    rootNode,
    containerRef,
    svgRef,
    editInputRef,
    layoutNodes,
    coloredNodes,
    pan,
    zoom,
    isPanning,
    dragId,
    dragPos,
    dragTarget,
    selectedId,
    editingId,
    editLabel,
    colorPickerFor,
    longPressNodeId,
    pendingMoveToRoot,
    zoomIn,
    zoomOut,
    fitToView,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    setSelectedId,
    setEditingId,
    setEditLabel,
    setColorPickerFor,
    setLongPressNodeId,
    addChild,
    deleteNode,
    commitEdit,
    changeColor,
    toggleCollapse,
    handleNodeDragStart,
    movePendingNodeToRoot,
    cancelMoveToRoot,
  } = useMindmapEditor({ mindmap, isCreating, onSave });

  if (isEmptyState) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mb-3 text-6xl">🧠</div>
          <p className="text-base">Select or create a mindmap</p>
          <p className="mt-1 text-xs text-muted-foreground/60">Your ideas deserve space to grow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MindmapToolbar
        title={title}
        swimlaneName={swimlaneName}
        zoom={zoom}
        mindmap={mindmap}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitToView={fitToView}
        onRestore={onRestore}
        onArchive={onArchive}
        onDelete={onDelete}
      />

      <MindmapCanvas
        containerRef={containerRef}
        svgRef={svgRef}
        layoutNodes={layoutNodes}
        coloredNodes={coloredNodes}
        rootNode={rootNode}
        pan={pan}
        zoom={zoom}
        isPanning={isPanning}
        dragId={dragId}
        dragPos={dragPos}
        dragTarget={dragTarget}
        selectedId={selectedId}
        editingId={editingId}
        editLabel={editLabel}
        colorPickerFor={colorPickerFor}
        longPressNodeId={longPressNodeId}
        pendingMoveToRoot={pendingMoveToRoot}
        editInputRef={editInputRef}
        onWheel={handleWheel}
        onCanvasMouseDown={handleMouseDown}
        onCanvasMouseMove={handleMouseMove}
        onCanvasMouseUp={handleMouseUp}
        onSetSelectedId={setSelectedId}
        onSetEditingId={setEditingId}
        onSetEditLabel={setEditLabel}
        onSetColorPickerFor={setColorPickerFor}
        onSetLongPressNodeId={setLongPressNodeId}
        onAddChild={addChild}
        onDeleteNode={deleteNode}
        onCommitEdit={commitEdit}
        onChangeColor={changeColor}
        onToggleCollapse={toggleCollapse}
        onStartDragNode={handleNodeDragStart}
        onMoveToRootDirection={movePendingNodeToRoot}
        onCancelMoveToRoot={cancelMoveToRoot}
      />
    </div>
  );
}
