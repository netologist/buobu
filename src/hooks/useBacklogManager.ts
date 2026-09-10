import { useCallback, useReducer, useState } from "react";

import { buildBacklogItem } from "@/lib/kanban/taskUtils";
import { initialUiPanelState, uiPanelReducer } from "@/reducers/uiPanelReducer";
import type { BacklogItem } from "@/lib/types";

type UseBacklogManagerOptions = {
  loadItems: (swimlaneId: string) => Promise<BacklogItem[]>;
  saveItem: (item: BacklogItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

export function useBacklogManager({ loadItems, saveItem, removeItem }: UseBacklogManagerOptions) {
  const [{ activeBacklogSwimlaneId }, dispatchPanel] = useReducer(uiPanelReducer, initialUiPanelState);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [backlogInput, setBacklogInput] = useState("");
  const [backlogCounts, setBacklogCounts] = useState<Record<string, number>>({});

  const openBacklog = useCallback(async (swimlaneId: string) => {
    dispatchPanel({ type: "TOGGLE_BACKLOG", swimlaneId });
    const items = await loadItems(swimlaneId);
    setBacklogItems(items);
    setBacklogCounts((prev) => ({ ...prev, [swimlaneId]: items.length }));
  }, [loadItems]);

  const closeBacklog = useCallback(() => {
    dispatchPanel({ type: "TOGGLE_BACKLOG", swimlaneId: null });
    setBacklogInput("");
  }, []);

  const addBacklogItem = useCallback(async () => {
    if (!activeBacklogSwimlaneId) return;
    const text = backlogInput.trim();
    if (!text) return;
    const item = buildBacklogItem(activeBacklogSwimlaneId, text);
    setBacklogItems((prev) => [...prev, item]);
    setBacklogCounts((prev) => ({
      ...prev,
      [activeBacklogSwimlaneId]: (prev[activeBacklogSwimlaneId] ?? 0) + 1,
    }));
    setBacklogInput("");
    await saveItem(item);
  }, [activeBacklogSwimlaneId, backlogInput, saveItem]);

  const removeBacklogItem = useCallback(async (itemId: string) => {
    const removed = backlogItems.find((item) => item.id === itemId);
    setBacklogItems((prev) => prev.filter((item) => item.id !== itemId));
    if (removed) {
      setBacklogCounts((prev) => ({
        ...prev,
        [removed.swimlaneId]: Math.max((prev[removed.swimlaneId] ?? 1) - 1, 0),
      }));
    }
    await removeItem(itemId);
  }, [backlogItems, removeItem]);

  return {
    activeBacklogSwimlaneId,
    backlogItems,
    backlogInput,
    backlogCounts,
    setBacklogItems,
    setBacklogInput,
    setBacklogCounts,
    openBacklog,
    closeBacklog,
    addBacklogItem,
    removeBacklogItem,
  };
}
