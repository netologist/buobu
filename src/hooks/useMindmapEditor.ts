"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import type { Mindmap, MindmapNode } from "@/lib/types";
import { generateId } from "@/lib/uuid";
import {
  ROOT_COLOR,
  NODE_H,
  NODE_PAD_X,
  NODE_GAP_Y,
  LEVEL_GAP_X,
  ROOT_FONT,
  NODE_FONT,
  type Dir,
  type LayoutNode,
  measureText,
  nextBranchColor,
  autoColorNodes,
  buildTree,
  layoutSubtreeH,
  layoutSubtreeV,
  getSubtreeWidth,
  flattenTree,
  shiftTreeX,
  shiftTreeY,
  hasChildren,
} from "@/lib/mindmap/layoutUtils";

type UseMindmapEditorArgs = {
  mindmap: Mindmap | null;
  isCreating?: boolean;
  onSave: (data: Partial<Mindmap>) => Promise<void>;
};

type Point = {
  x: number;
  y: number;
};

const LONG_PRESS_DURATION = 600;

function createRootNode(rootId: string): MindmapNode {
  return {
    id: rootId,
    parentId: null,
    label: "Central Idea",
    color: ROOT_COLOR,
    x: 0,
    y: 0,
    order: 0,
  };
}

function collectNodeIds(nodes: MindmapNode[], nodeId: string) {
  const collected = new Set<string>();

  const collect = (currentId: string) => {
    collected.add(currentId);
    nodes
      .filter((node) => node.parentId === currentId)
      .forEach((node) => collect(node.id));
  };

  collect(nodeId);
  return collected;
}

function isNodeDescendant(nodes: MindmapNode[], parentId: string, targetId: string): boolean {
  if (parentId === targetId) return true;
  const parent = nodes.find((node) => node.id === parentId);
  return parent?.parentId ? isNodeDescendant(nodes, parent.parentId, targetId) : false;
}

function getLayoutData(coloredNodes: MindmapNode[]) {
  const root = coloredNodes.find((node) => node.parentId === null);
  if (!root) {
    return {
      flat: [] as LayoutNode[],
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600 },
    };
  }

  const rootTextWidth = measureText(root.label, ROOT_FONT) + NODE_PAD_X * 2;
  const rootNodeWidth = Math.max(rootTextWidth, 200);
  const rootLayout: LayoutNode = {
    ...root,
    depth: 0,
    ly: 0,
    lx: 0,
    nodeW: rootNodeWidth,
    dir: "right",
    children: [],
  };

  const rootChildren = coloredNodes.filter((node) => node.parentId === root.id);
  const groups: Record<Dir, MindmapNode[]> = { right: [], left: [], up: [], down: [] };
  for (const node of rootChildren) {
    const direction = (node.direction as Dir) ?? "right";
    groups[direction].push(node);
  }

  const buildGroup = (items: MindmapNode[], dir: Dir) =>
    items
      .sort((a, b) => a.order - b.order)
      .map((node) => {
        const textWidth = measureText(node.label, NODE_FONT) + NODE_PAD_X * 2;
        const nodeWidth = Math.max(textWidth, 100);
        const layoutNode: LayoutNode = {
          ...node,
          depth: 1,
          ly: 0,
          lx: 0,
          nodeW: nodeWidth,
          dir,
          children: node.collapsed ? [] : buildTree(coloredNodes, node.id, 2, dir),
        };
        return layoutNode;
      });

  const rightTrees = buildGroup(groups.right, "right");
  const leftTrees = buildGroup(groups.left, "left");
  const upTrees = buildGroup(groups.up, "up");
  const downTrees = buildGroup(groups.down, "down");

  const rightX = rootNodeWidth + LEVEL_GAP_X;
  let rightY = 0;
  for (const child of rightTrees) {
    rightY += layoutSubtreeH(child, rightX, rightY, "right");
  }
  const rightHeight = rightY;

  let leftY = 0;
  for (const child of leftTrees) {
    leftY += layoutSubtreeH(child, 0, leftY, "left");
  }
  const leftHeight = leftY;

  for (const child of leftTrees) {
    shiftTreeX(child, -LEVEL_GAP_X - child.nodeW - child.lx);
  }

  const maxHeight = Math.max(rightHeight, leftHeight, NODE_H + NODE_GAP_Y);
  const rightOffset = (maxHeight - rightHeight) / 2;
  for (const child of rightTrees) {
    shiftTreeY(child, rightOffset);
  }
  const leftOffset = (maxHeight - leftHeight) / 2;
  for (const child of leftTrees) {
    shiftTreeY(child, leftOffset);
  }

  rootLayout.ly = maxHeight / 2 - NODE_H / 2;
  rootLayout.lx = 0;

  const layoutVerticalGroup = (trees: LayoutNode[], dir: "up" | "down") => {
    for (const child of trees) {
      layoutSubtreeV(child, 0, 0, dir);
    }

    const totalWidth =
      trees.reduce((sum, tree) => sum + getSubtreeWidth(tree), 0) +
      (trees.length - 1) * NODE_GAP_Y;
    const startX = rootLayout.lx + rootNodeWidth / 2 - totalWidth / 2;

    let currentX = startX;
    for (const child of trees) {
      const childY =
        dir === "down"
          ? rootLayout.ly + NODE_H + LEVEL_GAP_X
          : rootLayout.ly - LEVEL_GAP_X - NODE_H;
      layoutSubtreeV(child, currentX, childY, dir);
      currentX += getSubtreeWidth(child) + NODE_GAP_Y;
    }
  };

  if (upTrees.length > 0) layoutVerticalGroup(upTrees, "up");
  if (downTrees.length > 0) layoutVerticalGroup(downTrees, "down");

  rootLayout.children = [...rightTrees, ...leftTrees, ...upTrees, ...downTrees];

  const flat = flattenTree(rootLayout);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of flat) {
    minX = Math.min(minX, node.lx);
    minY = Math.min(minY, node.ly);
    maxX = Math.max(maxX, node.lx + node.nodeW);
    maxY = Math.max(maxY, node.ly + NODE_H);
  }

  return {
    flat,
    bounds: { minX: minX - 80, minY: minY - 80, maxX: maxX + 80, maxY: maxY + 80 },
  };
}

export function useMindmapEditor({
  mindmap,
  isCreating,
  onSave,
}: UseMindmapEditorArgs) {
  const [nodes, setNodes] = useState<MindmapNode[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<Point | null>(null);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [pendingMoveToRoot, setPendingMoveToRoot] = useState<{ nodeId: string } | null>(null);
  const [hasFittedOnce, setHasFittedOnce] = useState(false);
  const [longPressNodeId, setLongPressNodeId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rootNode = useMemo(
    () => nodes.find((node) => node.parentId === null),
    [nodes],
  );
  const title = rootNode?.label || "Untitled";
  const isEmptyState = !mindmap && !isCreating;

  useEffect(() => {
    let cancelled = false;

    if (mindmap) {
      queueMicrotask(() => {
        if (cancelled) return;
        setNodes(mindmap.nodes ?? []);
        setHasFittedOnce(false);
      });
    } else if (isCreating) {
      const rootId = generateId();
      queueMicrotask(() => {
        if (cancelled) return;
        setNodes([createRootNode(rootId)]);
        setSelectedId(rootId);
        setHasFittedOnce(false);
      });
      setTimeout(() => {
        if (cancelled) return;
        setEditingId(rootId);
        setEditLabel("Central Idea");
      }, 50);
    }

    return () => {
      cancelled = true;
    };
  }, [mindmap, isCreating]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const scheduleAutoSave = useCallback(
    (updatedNodes: MindmapNode[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const root = updatedNodes.find((node) => node.parentId === null);
        const nextTitle = root?.label || "Untitled";
        if (!nextTitle.trim() && !mindmap?.id) return;

        void onSave({
          ...(mindmap?.id ? { id: mindmap.id } : {}),
          title: nextTitle,
          nodes: updatedNodes,
        });
      }, 600);
    },
    [mindmap, onSave],
  );

  const coloredNodes = useMemo(() => autoColorNodes(nodes), [nodes]);
  const layoutData = useMemo(() => getLayoutData(coloredNodes), [coloredNodes]);

  useEffect(() => {
    if (hasFittedOnce || layoutData.flat.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const { minX, minY, maxX, maxY } = layoutData.bounds;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const nextZoom = Math.min(containerWidth / contentWidth, containerHeight / contentHeight, 1.6) * 0.88;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPan({
      x: containerWidth / 2 - centerX * nextZoom,
      y: containerHeight / 2 - centerY * nextZoom,
    });
    setZoom(nextZoom);
    setHasFittedOnce(true);
  }, [hasFittedOnce, layoutData]);

  const updateNodes = useCallback(
    (updater: (prev: MindmapNode[]) => MindmapNode[]) => {
      setNodes((prev) => {
        const next = updater(prev);
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave],
  );

  const addChild = useCallback(
    (parentId: string, direction?: Dir) => {
      const parent = nodes.find((node) => node.id === parentId);
      if (!parent) return;

      const isRoot = parent.parentId === null;
      const childCount = nodes.filter((node) => node.parentId === parentId).length;
      const color = isRoot ? nextBranchColor(nodes, parentId) : parent.color;
      const newNode: MindmapNode = {
        id: generateId(),
        parentId,
        label: "New topic",
        color,
        x: 0,
        y: 0,
        order: childCount,
        ...(isRoot && direction ? { direction } : {}),
      };

      const nextNodes = nodes.map((node) =>
        node.id === parentId ? { ...node, collapsed: false } : node,
      );
      setNodes([...nextNodes, newNode]);
      setSelectedId(newNode.id);
      setColorPickerFor(null);
      setEditingId(newNode.id);
      setEditLabel("New topic");
      scheduleAutoSave([...nextNodes, newNode]);
    },
    [nodes, scheduleAutoSave],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const node = nodes.find((item) => item.id === id);
      if (!node || node.parentId === null) return;

      const toRemove = collectNodeIds(nodes, id);
      updateNodes((prev) => prev.filter((item) => !toRemove.has(item.id)));
      if (selectedId && toRemove.has(selectedId)) {
        setSelectedId(node.parentId);
      }
      setColorPickerFor(null);
    },
    [nodes, selectedId, updateNodes],
  );

  const commitEdit = useCallback(() => {
    if (!editingId) return;

    updateNodes((prev) =>
      prev.map((node) =>
        node.id === editingId ? { ...node, label: editLabel } : node,
      ),
    );
    setEditingId(null);
  }, [editingId, editLabel, updateNodes]);

  const changeColor = useCallback(
    (id: string, color: string) => {
      const affectedNodeIds = collectNodeIds(nodes, id);
      updateNodes((prev) =>
        prev.map((node) => (affectedNodeIds.has(node.id) ? { ...node, color } : node)),
      );
      setColorPickerFor(null);
    },
    [nodes, updateNodes],
  );

  const toggleCollapse = useCallback(
    (id: string) => {
      updateNodes((prev) =>
        prev.map((node) =>
          node.id === id ? { ...node, collapsed: !node.collapsed } : node,
        ),
      );
    },
    [updateNodes],
  );

  const moveNode = useCallback(
    (nodeId: string, newParentId: string, direction?: Dir) => {
      if (nodeId === newParentId || isNodeDescendant(nodes, newParentId, nodeId)) return;

      const targetNode = nodes.find((node) => node.id === newParentId);
      const isMovingToRoot = targetNode?.parentId === null;
      const childCount = nodes.filter((node) => node.parentId === newParentId).length;

      updateNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                parentId: newParentId,
                order: childCount,
                ...(isMovingToRoot && direction
                  ? { direction, color: nextBranchColor(prev, newParentId) }
                  : {}),
              }
            : node,
        ),
      );
    },
    [nodes, updateNodes],
  );

  const clientToSvg = useCallback(
    (clientX: number, clientY: number) => ({
      x: (clientX - pan.x) / zoom,
      y: (clientY - pan.y) / zoom,
    }),
    [pan, zoom],
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<SVGSVGElement>) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const previousZoom = zoom;
        const nextZoom = Math.max(0.2, Math.min(4, previousZoom - event.deltaY * 0.002));
        setPan({
          x: mouseX - (mouseX - pan.x) * (nextZoom / previousZoom),
          y: mouseY - (mouseY - pan.y) * (nextZoom / previousZoom),
        });
        setZoom(nextZoom);
      } else {
        setPan((currentPan) => ({ x: currentPan.x - event.deltaX, y: currentPan.y - event.deltaY }));
      }
    },
    [pan, zoom],
  );

  const fitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container || layoutData.flat.length === 0) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const { minX, minY, maxX, maxY } = layoutData.bounds;
    const nextZoom = Math.min(containerWidth / (maxX - minX), containerHeight / (maxY - minY), 1.6) * 0.88;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setPan({
      x: containerWidth / 2 - centerX * nextZoom,
      y: containerHeight / 2 - centerY * nextZoom,
    });
    setZoom(nextZoom);
  }, [layoutData]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        setIsPanning(true);
        setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
        event.preventDefault();
      }

      if (event.button === 0 && !event.altKey && (event.target as Element).tagName === "svg") {
        setIsPanning(true);
        setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
        setSelectedId(null);
        setColorPickerFor(null);
      }
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<SVGSVGElement>) => {
      if (isPanning) {
        setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
        return;
      }

      if (!dragId) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const svgPoint = clientToSvg(event.clientX - rect.left, event.clientY - rect.top);
      setDragPos(svgPoint);

      let closestNodeId: string | null = null;
      let minimumDistance = Infinity;
      for (const node of layoutData.flat) {
        if (node.id === dragId) continue;
        const centerX = node.lx + node.nodeW / 2;
        const centerY = node.ly + NODE_H / 2;
        const distance = Math.hypot(svgPoint.x - centerX, svgPoint.y - centerY);
        if (distance < minimumDistance) {
          minimumDistance = distance;
          closestNodeId = node.id;
        }
      }

      setDragTarget(minimumDistance < 150 ? closestNodeId : null);
    },
    [clientToSvg, dragId, isPanning, layoutData.flat, panStart],
  );

  const handleMouseUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressNodeId(null);

    if (isPanning) {
      setIsPanning(false);
    }

    if (dragId && dragTarget) {
      const targetNode = nodes.find((node) => node.id === dragTarget);
      if (targetNode?.parentId === null) {
        setPendingMoveToRoot({ nodeId: dragId });
      } else {
        moveNode(dragId, dragTarget);
      }
    }

    setDragId(null);
    setDragPos(null);
    setDragTarget(null);
  }, [dragId, dragTarget, isPanning, moveNode, nodes]);

  const handleNodeDragStart = useCallback(
    (nodeId: string) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }

      if (hasChildren(coloredNodes, nodeId)) {
        setLongPressNodeId(nodeId);
        longPressTimerRef.current = setTimeout(() => {
          toggleCollapse(nodeId);
          setLongPressNodeId(null);
          longPressTimerRef.current = null;
        }, LONG_PRESS_DURATION);
      }

      setDragId(nodeId);
    },
    [coloredNodes, toggleCollapse],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (editingId) {
        if (event.key === "Enter") commitEdit();
        if (event.key === "Escape") setEditingId(null);
        return;
      }

      if (!selectedId) return;

      if (event.key === "Tab") {
        event.preventDefault();
        addChild(selectedId);
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const node = nodes.find((item) => item.id === selectedId);
        if (node && node.parentId !== null) {
          event.preventDefault();
          deleteNode(selectedId);
        }
      }

      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault();
        const node = nodes.find((item) => item.id === selectedId);
        if (node) {
          setEditingId(selectedId);
          setEditLabel(node.label);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, editingId, nodes, addChild, deleteNode, commitEdit]);

  useLayoutEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const zoomIn = useCallback(() => {
    setZoom((currentZoom) => Math.min(4, currentZoom + 0.25));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((currentZoom) => Math.max(0.2, currentZoom - 0.25));
  }, []);

  const movePendingNodeToRoot = useCallback(
    (direction: Dir) => {
      if (!pendingMoveToRoot || !rootNode) return;
      moveNode(pendingMoveToRoot.nodeId, rootNode.id, direction);
      setPendingMoveToRoot(null);
    },
    [moveNode, pendingMoveToRoot, rootNode],
  );

  const cancelMoveToRoot = useCallback(() => {
    setPendingMoveToRoot(null);
  }, []);

  return {
    isEmptyState,
    title,
    rootNode,
    containerRef,
    svgRef,
    editInputRef,
    layoutNodes: layoutData.flat,
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
  };
}
