import type {
  MouseEvent as ReactMouseEvent,
  Ref,
  WheelEvent as ReactWheelEvent,
} from "react";
import { Palette } from "lucide-react";

import type { MindmapNode } from "@/lib/types";
import {
  ADD_BTN_R,
  BRANCH_COLORS,
  COLOR_SWATCH_R,
  NODE_FONT,
  NODE_H,
  ROOT_FONT,
  type Dir,
  type LayoutNode,
  hasChildren,
} from "@/lib/mindmap/layoutUtils";

import { MindmapDirectionPicker } from "./MindmapDirectionPicker";

type MindmapCanvasProps = {
  containerRef: Ref<HTMLDivElement>;
  svgRef: Ref<SVGSVGElement>;
  layoutNodes: LayoutNode[];
  coloredNodes: MindmapNode[];
  rootNode?: MindmapNode;
  pan: { x: number; y: number };
  zoom: number;
  isPanning: boolean;
  dragId: string | null;
  dragPos: { x: number; y: number } | null;
  dragTarget: string | null;
  selectedId: string | null;
  editingId: string | null;
  editLabel: string;
  colorPickerFor: string | null;
  longPressNodeId: string | null;
  pendingMoveToRoot: { nodeId: string } | null;
  editInputRef: Ref<HTMLInputElement>;
  onWheel: (event: ReactWheelEvent<SVGSVGElement>) => void;
  onCanvasMouseDown: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onCanvasMouseMove: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onCanvasMouseUp: () => void;
  onSetSelectedId: (id: string | null) => void;
  onSetEditingId: (id: string | null) => void;
  onSetEditLabel: (label: string) => void;
  onSetColorPickerFor: (id: string | null) => void;
  onSetLongPressNodeId: (id: string | null) => void;
  onAddChild: (parentId: string, direction?: Dir) => void;
  onDeleteNode: (id: string) => void;
  onCommitEdit: () => void;
  onChangeColor: (id: string, color: string) => void;
  onToggleCollapse: (id: string) => void;
  onStartDragNode: (id: string) => void;
  onMoveToRootDirection: (direction: Dir) => void;
  onCancelMoveToRoot: () => void;
};

export function MindmapCanvas({
  containerRef,
  svgRef,
  layoutNodes,
  coloredNodes,
  rootNode,
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
  editInputRef,
  onWheel,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onSetSelectedId,
  onSetEditingId,
  onSetEditLabel,
  onSetColorPickerFor,
  onSetLongPressNodeId,
  onAddChild,
  onDeleteNode,
  onCommitEdit,
  onChangeColor,
  onToggleCollapse,
  onStartDragNode,
  onMoveToRootDirection,
  onCancelMoveToRoot,
}: MindmapCanvasProps) {
  const dragSourceNode = dragId ? layoutNodes.find((node) => node.id === dragId) : null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.3)_0%,hsl(var(--background))_70%)]"
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={isPanning || dragId ? "cursor-grabbing" : "cursor-grab"}
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {layoutNodes.map((node) =>
            node.children.map((child) => {
              const direction = child.dir;
              const isVertical = direction === "up" || direction === "down";
              let x1: number;
              let y1: number;
              let x2: number;
              let y2: number;

              if (isVertical) {
                x1 = node.lx + node.nodeW / 2;
                y1 = direction === "down" ? node.ly + NODE_H : node.ly;
                x2 = child.lx + child.nodeW / 2;
                y2 = direction === "down" ? child.ly : child.ly + NODE_H;
              } else {
                x1 = direction === "left" ? node.lx : node.lx + node.nodeW;
                y1 = node.ly + NODE_H / 2;
                x2 = direction === "left" ? child.lx + child.nodeW : child.lx;
                y2 = child.ly + NODE_H / 2;
              }

              const cpx1 = isVertical ? x1 : x1 + (x2 - x1) * 0.4;
              const cpy1 = isVertical ? y1 + (y2 - y1) * 0.4 : y1;
              const cpx2 = isVertical ? x2 : x1 + (x2 - x1) * 0.6;
              const cpy2 = isVertical ? y1 + (y2 - y1) * 0.6 : y2;
              const isDragRelated = dragId === child.id || dragTarget === child.id;

              return (
                <path
                  key={`edge-${node.id}-${child.id}`}
                  d={`M${x1},${y1} C${cpx1},${cpy1} ${cpx2},${cpy2} ${x2},${y2}`}
                  fill="none"
                  stroke={child.color}
                  strokeWidth={node.parentId === null ? 3.5 : 2.5}
                  opacity={isDragRelated ? 0.3 : 0.45}
                  strokeLinecap="round"
                />
              );
            }),
          )}

          {dragId && dragTarget && (() => {
            const targetNode = layoutNodes.find((node) => node.id === dragTarget);
            if (!targetNode) return null;

            return (
              <rect
                x={targetNode.lx - 4}
                y={targetNode.ly - 4}
                width={targetNode.nodeW + 8}
                height={NODE_H + 8}
                rx={14}
                fill="none"
                stroke={targetNode.color}
                strokeWidth={2.5}
                strokeDasharray="6 4"
                opacity={0.8}
              />
            );
          })()}

          {layoutNodes.map((node) => {
            const isRoot = node.parentId === null;
            const isSelected = selectedId === node.id;
            const isEditing = editingId === node.id;
            const isDragging = dragId === node.id;
            const hasKids = hasChildren(coloredNodes, node.id);
            const collapsedCount = coloredNodes.filter((item) => item.parentId === node.id).length;
            const showActions = isSelected && !isDragging && !dragId;

            return (
              <g key={node.id} opacity={isDragging ? 0.35 : 1}>
                {isSelected && !isDragging && (
                  <rect
                    x={node.lx - 3}
                    y={node.ly - 3}
                    width={node.nodeW + 6}
                    height={NODE_H + 6}
                    rx={isRoot ? 24 : 14}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2}
                    opacity={0.4}
                  />
                )}

                <rect
                  x={node.lx}
                  y={node.ly}
                  width={node.nodeW}
                  height={NODE_H}
                  rx={isRoot ? 22 : 12}
                  fill={isRoot ? node.color : `${node.color}15`}
                  stroke={isRoot ? "transparent" : `${node.color}40`}
                  strokeWidth={1.5}
                  className="cursor-pointer"
                  style={{ filter: isRoot ? `drop-shadow(0 4px 12px ${node.color}40)` : undefined }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (longPressNodeId === node.id) {
                      onSetLongPressNodeId(null);
                      return;
                    }
                    onSetSelectedId(node.id);
                    if (colorPickerFor && colorPickerFor !== node.id) {
                      onSetColorPickerFor(null);
                    }
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (longPressNodeId === node.id) {
                      onSetLongPressNodeId(null);
                      return;
                    }
                    onSetEditingId(node.id);
                    onSetEditLabel(node.label);
                    onSetColorPickerFor(null);
                  }}
                  onMouseDown={(event) => {
                    if (event.button === 0 && !event.altKey && !isRoot) {
                      event.stopPropagation();
                      onSetLongPressNodeId(node.id);
                      onStartDragNode(node.id);
                      onSetSelectedId(node.id);
                    }
                  }}
                  onMouseUp={() => onSetLongPressNodeId(null)}
                  onMouseLeave={() => {
                    if (longPressNodeId === node.id) {
                      onSetLongPressNodeId(null);
                    }
                  }}
                />

                {!isRoot && (() => {
                  const isVertical = node.dir === "up" || node.dir === "down";
                  if (isVertical) {
                    return (
                      <rect
                        x={node.lx + 6}
                        y={node.dir === "up" ? node.ly + NODE_H - 4 : node.ly}
                        width={node.nodeW - 12}
                        height={4}
                        rx={2}
                        fill={node.color}
                        className="pointer-events-none"
                        opacity={0.7}
                      />
                    );
                  }

                  return (
                    <rect
                      x={node.dir === "left" ? node.lx + node.nodeW - 4 : node.lx}
                      y={node.ly + 6}
                      width={4}
                      height={NODE_H - 12}
                      rx={2}
                      fill={node.color}
                      className="pointer-events-none"
                      opacity={0.7}
                    />
                  );
                })()}

                {isEditing ? (
                  <foreignObject x={node.lx + 6} y={node.ly + 6} width={node.nodeW - 12} height={NODE_H - 12}>
                    <input
                      ref={editInputRef}
                      value={editLabel}
                      onChange={(event) => onSetEditLabel(event.target.value)}
                      onBlur={onCommitEdit}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onCommitEdit();
                        if (event.key === "Escape") onSetEditingId(null);
                        event.stopPropagation();
                      }}
                      className="h-full w-full rounded-md bg-background px-2 text-sm font-medium outline-none ring-2 ring-ring"
                      style={{ fontSize: isRoot ? ROOT_FONT : NODE_FONT }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={
                      node.lx +
                      (isRoot || node.dir === "up" || node.dir === "down"
                        ? node.nodeW / 2
                        : node.dir === "left"
                          ? node.nodeW - 16
                          : 16)
                    }
                    y={node.ly + NODE_H / 2}
                    textAnchor={
                      isRoot || node.dir === "up" || node.dir === "down"
                        ? "middle"
                        : node.dir === "left"
                          ? "end"
                          : "start"
                    }
                    dominantBaseline="central"
                    fill={isRoot ? "#fff" : node.color}
                    fontSize={isRoot ? ROOT_FONT : NODE_FONT}
                    fontWeight={isRoot ? 800 : 600}
                    className="pointer-events-none select-none font-sans"
                  >
                    {node.label.length > 40 ? `${node.label.slice(0, 38)}…` : node.label}
                  </text>
                )}

                {showActions && !isEditing && isRoot && (() => {
                  const centerX = node.lx + node.nodeW / 2;
                  const centerY = node.ly + NODE_H / 2;
                  const positions = [
                    { key: "right", x: node.lx + node.nodeW + 16, y: centerY, direction: "right" as Dir },
                    { key: "left", x: node.lx - 16, y: centerY, direction: "left" as Dir },
                    { key: "top", x: centerX, y: node.ly - 16, direction: "up" as Dir },
                    { key: "bottom", x: centerX, y: node.ly + NODE_H + 16, direction: "down" as Dir },
                  ];

                  return positions.map((position) => (
                    <g
                      key={position.key}
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddChild(node.id, position.direction);
                      }}
                    >
                      <circle cx={position.x} cy={position.y} r={ADD_BTN_R} fill={node.color} opacity={0.9} />
                      <text
                        x={position.x}
                        y={position.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fff"
                        fontSize={16}
                        fontWeight={700}
                        className="pointer-events-none select-none"
                      >
                        +
                      </text>
                    </g>
                  ));
                })()}

                {showActions && !isEditing && !isRoot && (() => {
                  const collapseOffset = hasKids && !node.collapsed ? 30 : 14;
                  let buttonX: number;
                  let buttonY: number;

                  if (node.dir === "up") {
                    buttonX = node.lx + node.nodeW / 2;
                    buttonY = node.ly - collapseOffset;
                  } else if (node.dir === "down") {
                    buttonX = node.lx + node.nodeW / 2;
                    buttonY = node.ly + NODE_H + collapseOffset;
                  } else if (node.dir === "left") {
                    buttonX = node.lx - collapseOffset;
                    buttonY = node.ly + NODE_H / 2;
                  } else {
                    buttonX = node.lx + node.nodeW + collapseOffset;
                    buttonY = node.ly + NODE_H / 2;
                  }

                  return (
                    <g
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddChild(node.id);
                      }}
                    >
                      <circle cx={buttonX} cy={buttonY} r={ADD_BTN_R} fill={node.color} opacity={0.9} />
                      <text
                        x={buttonX}
                        y={buttonY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#fff"
                        fontSize={16}
                        fontWeight={700}
                        className="pointer-events-none select-none"
                      >
                        +
                      </text>
                    </g>
                  );
                })()}

                {showActions && !isEditing && !isRoot && (
                  <g
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSetColorPickerFor(colorPickerFor === node.id ? null : node.id);
                    }}
                  >
                    <circle cx={node.lx + 2} cy={node.ly - 2} r={9} fill={node.color} opacity={0.9} />
                    <foreignObject
                      x={node.lx - 4}
                      y={node.ly - 8}
                      width={12}
                      height={12}
                      className="pointer-events-none"
                    >
                      <Palette className="h-3 w-3 text-white" />
                    </foreignObject>
                  </g>
                )}

                {showActions && !isEditing && !isRoot && (
                  <g
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteNode(node.id);
                    }}
                  >
                    <circle cx={node.lx + node.nodeW - 2} cy={node.ly - 2} r={9} fill="var(--destructive)" opacity={0.85} />
                    <text
                      x={node.lx + node.nodeW - 2}
                      y={node.ly - 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize={12}
                      fontWeight={700}
                      className="pointer-events-none select-none"
                    >
                      ×
                    </text>
                  </g>
                )}

                {colorPickerFor === node.id && !isEditing && (
                  <foreignObject
                    x={node.lx}
                    y={node.ly + NODE_H + 6}
                    width={Math.max(node.nodeW, (COLOR_SWATCH_R * 2 + 4) * 6 + 12)}
                    height={76}
                  >
                    <div
                      className="flex w-fit flex-wrap gap-1 rounded-lg border bg-popover p-1.5 shadow-xl"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {BRANCH_COLORS.map((color) => (
                        <button
                          key={color}
                          className="rounded-full border-2 transition-all hover:scale-125"
                          style={{
                            width: COLOR_SWATCH_R * 2 + 4,
                            height: COLOR_SWATCH_R * 2 + 4,
                            backgroundColor: color,
                            borderColor: node.color === color ? "var(--ring)" : "transparent",
                            boxShadow: node.color === color ? `0 0 0 2px ${color}` : "none",
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onChangeColor(node.id, color);
                            onSetColorPickerFor(null);
                          }}
                        />
                      ))}
                    </div>
                  </foreignObject>
                )}

                {hasKids && node.collapsed && (() => {
                  let indicatorX: number;
                  let indicatorY: number;

                  if (node.dir === "up") {
                    indicatorX = node.lx + node.nodeW / 2;
                    indicatorY = node.ly - 14;
                  } else if (node.dir === "down") {
                    indicatorX = node.lx + node.nodeW / 2;
                    indicatorY = node.ly + NODE_H + 14;
                  } else if (node.dir === "left") {
                    indicatorX = node.lx - 14;
                    indicatorY = node.ly + NODE_H / 2;
                  } else {
                    indicatorX = node.lx + node.nodeW + 14;
                    indicatorY = node.ly + NODE_H / 2;
                  }

                  return (
                    <g
                      className="cursor-pointer"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleCollapse(node.id);
                      }}
                    >
                      <circle cx={indicatorX} cy={indicatorY} r={10} fill={`${node.color}15`} stroke={node.color} strokeWidth={1.5} />
                      <text
                        x={indicatorX}
                        y={indicatorY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={700}
                        fill={node.color}
                        className="pointer-events-none select-none"
                      >
                        +{collapsedCount}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {dragId && dragPos && dragSourceNode && (
            <g opacity={0.85} className="pointer-events-none">
              <rect
                x={dragPos.x - dragSourceNode.nodeW / 2}
                y={dragPos.y - NODE_H / 2}
                width={dragSourceNode.nodeW}
                height={NODE_H}
                rx={12}
                fill={`${dragSourceNode.color}30`}
                stroke={dragSourceNode.color}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
              <text
                x={dragPos.x}
                y={dragPos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={dragSourceNode.color}
                fontSize={NODE_FONT}
                fontWeight={600}
                className="select-none"
              >
                {dragSourceNode.label.length > 25
                  ? `${dragSourceNode.label.slice(0, 23)}…`
                  : dragSourceNode.label}
              </text>
            </g>
          )}

          {dragId && dragPos && dragTarget && (() => {
            const targetNode = layoutNodes.find((node) => node.id === dragTarget);
            if (!targetNode) return null;

            return (
              <line
                x1={dragPos.x}
                y1={dragPos.y}
                x2={targetNode.lx + targetNode.nodeW / 2}
                y2={targetNode.ly + NODE_H / 2}
                stroke={targetNode.color}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.5}
                className="pointer-events-none"
              />
            );
          })()}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-background/80 px-3 py-1.5 text-[10px] text-muted-foreground/50 backdrop-blur-sm">
        <span><kbd className="font-mono">Tab</kbd> add child</span>
        <span><kbd className="font-mono">Enter</kbd> edit</span>
        <span>Long press collapse</span>
        <span><kbd className="font-mono">Del</kbd> delete</span>
        <span>Double-click to edit</span>
        <span>Drag to reparent</span>
      </div>

      <MindmapDirectionPicker
        visible={!!pendingMoveToRoot && !!rootNode}
        onDirection={onMoveToRootDirection}
        onCancel={onCancelMoveToRoot}
      />
    </div>
  );
}
