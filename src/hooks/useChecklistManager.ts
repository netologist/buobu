import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { nanoid } from "nanoid";

import type { Checklist, Task } from "@/lib/types";

type ChecklistManagerOptions = {
  draftTask: Task | null;
  setDraftTask: Dispatch<SetStateAction<Task | null>>;
};

export function useChecklistManager(options: ChecklistManagerOptions) {
  const { setDraftTask } = options;
  const [checklistTitleInput, setChecklistTitleInput] = useState("");
  const [checklistItemInputs, setChecklistItemInputs] = useState<Record<string, string>>({});
  const [collapsedChecklists, setCollapsedChecklists] = useState<Record<string, boolean>>({});
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState("");
  const [editingChecklistItem, setEditingChecklistItem] = useState<{ checklistId: string; itemId: string } | null>(null);
  const [editingChecklistItemText, setEditingChecklistItemText] = useState("");

  const addChecklist = useCallback((nextTitle?: string) => {
    const title = (nextTitle ?? checklistTitleInput).trim();
    if (!title) return;
    const nextList: Checklist = { id: nanoid(), title, items: [] };
    setDraftTask((current) => (current ? { ...current, checklists: [...current.checklists, nextList] } : current));
    setChecklistTitleInput("");
  }, [checklistTitleInput, setDraftTask]);

  const removeChecklist = useCallback((checklistId: string) => {
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.filter((list) => list.id !== checklistId),
    } : current));
  }, [setDraftTask]);

  const updateChecklistTitle = useCallback((checklistId: string, title: string) => {
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.map((list) => list.id === checklistId ? { ...list, title } : list),
    } : current));
  }, [setDraftTask]);

  const addChecklistItem = useCallback((checklistId: string, nextText?: string) => {
    const text = (nextText ?? checklistItemInputs[checklistId] ?? "").trim();
    if (!text) return;
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.map((list) => list.id !== checklistId ? list : {
        ...list,
        items: [...list.items, { id: nanoid(), text, done: false }],
      }),
    } : current));
    setChecklistItemInputs((prev) => ({ ...prev, [checklistId]: "" }));
  }, [checklistItemInputs, setDraftTask]);

  const removeChecklistItem = useCallback((checklistId: string, itemId: string) => {
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.map((list) => list.id !== checklistId ? list : {
        ...list,
        items: list.items.filter((item) => item.id !== itemId),
      }),
    } : current));
  }, [setDraftTask]);

  const updateChecklistItem = useCallback((checklistId: string, itemId: string, text: string) => {
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.map((list) => list.id !== checklistId ? list : {
        ...list,
        items: list.items.map((item) => item.id === itemId ? { ...item, text } : item),
      }),
    } : current));
  }, [setDraftTask]);

  const toggleChecklistItem = useCallback((checklistId: string, itemId: string, checked: boolean) => {
    setDraftTask((current) => (current ? {
      ...current,
      checklists: current.checklists.map((list) => list.id !== checklistId ? list : {
        ...list,
        items: list.items.map((item) => item.id === itemId ? { ...item, done: checked } : item),
      }),
    } : current));
  }, [setDraftTask]);

  const toggleChecklistVisibility = useCallback((checklistId: string) => {
    setCollapsedChecklists((prev) => ({ ...prev, [checklistId]: !prev[checklistId] }));
  }, []);

  const saveEditChecklistTitle = useCallback(() => {
    if (!editingChecklistId) return;
    updateChecklistTitle(editingChecklistId, editingChecklistTitle.trim());
    setEditingChecklistId(null);
    setEditingChecklistTitle("");
  }, [editingChecklistId, editingChecklistTitle, updateChecklistTitle]);

  const cancelEditChecklistTitle = useCallback(() => {
    setEditingChecklistId(null);
    setEditingChecklistTitle("");
  }, []);

  const startEditChecklistItem = useCallback((checklistId: string, itemId: string, text: string) => {
    setEditingChecklistItem({ checklistId, itemId });
    setEditingChecklistItemText(text);
  }, []);

  const saveEditChecklistItem = useCallback(() => {
    if (!editingChecklistItem) return;
    updateChecklistItem(editingChecklistItem.checklistId, editingChecklistItem.itemId, editingChecklistItemText.trim());
    setEditingChecklistItem(null);
    setEditingChecklistItemText("");
  }, [editingChecklistItem, editingChecklistItemText, updateChecklistItem]);

  const cancelEditChecklistItem = useCallback(() => {
    setEditingChecklistItem(null);
    setEditingChecklistItemText("");
  }, []);

  return {
    checklistTitleInput,
    checklistItemInputs,
    collapsedChecklists,
    editingChecklistId,
    editingChecklistTitle,
    editingChecklistItem,
    editingChecklistItemText,
    setChecklistTitleInput,
    setChecklistItemInputs,
    setEditingChecklistId,
    setEditingChecklistTitle,
    setEditingChecklistItem,
    setEditingChecklistItemText,
    addChecklist,
    removeChecklist,
    updateChecklistTitle,
    addChecklistItem,
    removeChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    toggleChecklistVisibility,
    saveEditChecklistTitle,
    cancelEditChecklistTitle,
    startEditChecklistItem,
    saveEditChecklistItem,
    cancelEditChecklistItem,
  };
}
