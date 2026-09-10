import type { MindmapNode } from "@/lib/types";

/* ─── colour palette for branches ─── */
export const BRANCH_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#e879f9", // fuchsia
];

export const ROOT_COLOR = "#334155";

/* ─── layout constants ─── */
export const NODE_H = 44;
export const NODE_PAD_X = 28;
export const NODE_GAP_Y = 14;
export const LEVEL_GAP_X = 60;
export const ROOT_FONT = 18;
export const NODE_FONT = 15;
export const ADD_BTN_R = 11;
export const COLOR_SWATCH_R = 7;

/* ─── types ─── */
export type Dir = "right" | "left" | "up" | "down";

export type LayoutNode = MindmapNode & {
  depth: number;
  ly: number;
  lx: number;
  nodeW: number;
  children: LayoutNode[];
  dir: Dir;
};

/* ─── pure helpers ─── */

export function measureText(text: string, fontSize = NODE_FONT): number {
  if (typeof document === "undefined") return text.length * 9;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  return ctx.measureText(text).width;
}

/** Pick the next branch color that hasn't been used yet (or least used). */
export function nextBranchColor(nodes: MindmapNode[], rootId: string): string {
  const rootChildren = nodes.filter((n) => n.parentId === rootId);
  const usedColors = rootChildren.map((c) => c.color);
  for (const c of BRANCH_COLORS) {
    if (!usedColors.includes(c)) return c;
  }
  const counts = new Map<string, number>();
  for (const c of usedColors) counts.set(c, (counts.get(c) || 0) + 1);
  let best = BRANCH_COLORS[0];
  let bestCount = Infinity;
  for (const c of BRANCH_COLORS) {
    const cnt = counts.get(c) || 0;
    if (cnt < bestCount) {
      bestCount = cnt;
      best = c;
    }
  }
  return best;
}

/** Assign auto-colors: root=ROOT_COLOR, each root-child gets a unique branch color, descendants inherit. */
export function autoColorNodes(nodes: MindmapNode[]): MindmapNode[] {
  const root = nodes.find((n) => n.parentId === null);
  if (!root) return nodes;

  const parentMap = new Map<string, string | null>();
  for (const n of nodes) parentMap.set(n.id, n.parentId);

  const getRootChildAncestor = (nodeId: string): string | null => {
    const pid = parentMap.get(nodeId);
    if (!pid) return null;
    if (pid === root.id) return nodeId;
    return getRootChildAncestor(pid);
  };

  const rootChildColors = new Map<string, string>();
  for (const n of nodes) {
    if (n.parentId === root.id) {
      rootChildColors.set(n.id, n.color || BRANCH_COLORS[0]);
    }
  }

  return nodes.map((n) => {
    if (n.parentId === null) return { ...n, color: ROOT_COLOR };
    const rcAncestor = getRootChildAncestor(n.id);
    if (!rcAncestor) return { ...n, color: ROOT_COLOR };
    const branchColor = rootChildColors.get(rcAncestor) || BRANCH_COLORS[0];
    if (n.parentId === root.id) return { ...n, color: branchColor };
    if (n.color && n.color !== branchColor && BRANCH_COLORS.includes(n.color)) {
      return n;
    }
    return { ...n, color: branchColor };
  });
}

export function buildTree(
  nodes: MindmapNode[],
  parentId: string | null,
  depth: number,
  dir: Dir = "right",
): LayoutNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order)
    .map((n) => {
      const isRoot = n.parentId === null;
      const fontSize = isRoot ? ROOT_FONT : NODE_FONT;
      const textW = measureText(n.label, fontSize) + NODE_PAD_X * 2;
      const nodeW = Math.max(textW, isRoot ? 200 : 100);
      const nodeDir: Dir = (n.direction as Dir) ?? dir;
      return {
        ...n,
        depth,
        ly: 0,
        lx: 0,
        nodeW,
        dir: nodeDir,
        children: n.collapsed ? [] : buildTree(nodes, n.id, depth + 1, nodeDir),
      };
    });
}

export function layoutSubtreeH(node: LayoutNode, x: number, y: number, dir: "right" | "left"): number {
  node.lx = x;
  if (node.children.length === 0) {
    node.ly = y;
    return NODE_H + NODE_GAP_Y;
  }
  let childY = y;
  for (const child of node.children) {
    const childX =
      dir === "right" ? x + node.nodeW + LEVEL_GAP_X : x - LEVEL_GAP_X - child.nodeW;
    childY += layoutSubtreeH(child, childX, childY, dir);
  }
  const totalChildH = childY - y - NODE_GAP_Y;
  node.ly = y + totalChildH / 2 - NODE_H / 2;
  return Math.max(NODE_H + NODE_GAP_Y, childY - y);
}

export function layoutSubtreeV(node: LayoutNode, x: number, y: number, dir: "up" | "down"): number {
  node.lx = x;
  node.ly = y;
  if (node.children.length === 0) {
    return node.nodeW + NODE_GAP_Y;
  }
  let childX = x;
  for (const child of node.children) {
    const childY =
      dir === "down" ? y + NODE_H + LEVEL_GAP_X : y - LEVEL_GAP_X - NODE_H;
    child.lx = childX;
    child.ly = childY;
    layoutSubtreeV(child, childX, childY, dir);
    const actualW = Math.max(getSubtreeWidth(child), child.nodeW);
    childX += actualW + NODE_GAP_Y;
  }
  const totalW = childX - x - NODE_GAP_Y;
  node.lx = x + totalW / 2 - node.nodeW / 2;
  return Math.max(node.nodeW + NODE_GAP_Y, totalW + NODE_GAP_Y);
}

export function getSubtreeWidth(node: LayoutNode): number {
  const flat = flattenTree(node);
  let sMinX = Infinity,
    sMaxX = -Infinity;
  for (const n of flat) {
    sMinX = Math.min(sMinX, n.lx);
    sMaxX = Math.max(sMaxX, n.lx + n.nodeW);
  }
  return sMaxX - sMinX;
}

export function flattenTree(node: LayoutNode): LayoutNode[] {
  return [node, ...node.children.flatMap(flattenTree)];
}

export function shiftTreeX(node: LayoutNode, dx: number) {
  node.lx += dx;
  for (const child of node.children) shiftTreeX(child, dx);
}

export function shiftTreeY(node: LayoutNode, dy: number) {
  node.ly += dy;
  for (const child of node.children) shiftTreeY(child, dy);
}

export function hasChildren(nodes: MindmapNode[], id: string): boolean {
  return nodes.some((n) => n.parentId === id);
}
