import type { Dispatch, SetStateAction } from "react";

import type { Board, Swimlane, Task } from "@/lib/types";

export type EditingTransactionDraft = {
  type: "income" | "expense";
  amount: string;
  note: string;
  date: string;
};

export type TaskDetailModel = {
  draftTask: Task | null;
  setDraftTask: Dispatch<SetStateAction<Task | null>>;
  labelInput: string;
  setLabelInput: Dispatch<SetStateAction<string>>;
  addLabel: () => void;
  removeLabel: (label: string) => void;
  commentInput: string;
  setCommentInput: Dispatch<SetStateAction<string>>;
  editingCommentId: string | null;
  editingCommentText: string;
  setEditingCommentText: Dispatch<SetStateAction<string>>;
  addComment: () => void;
  removeComment: (commentId: string) => void;
  startEditComment: (commentId: string, text: string) => void;
  saveEditComment: () => void;
  cancelEditComment: () => void;
  checklistTitleInput: string;
  setChecklistTitleInput: Dispatch<SetStateAction<string>>;
  checklistItemInputs: Record<string, string>;
  setChecklistItemInputs: Dispatch<SetStateAction<Record<string, string>>>;
  collapsedChecklists: Record<string, boolean>;
  editingChecklistId: string | null;
  editingChecklistTitle: string;
  setEditingChecklistTitle: Dispatch<SetStateAction<string>>;
  editingChecklistItem: { checklistId: string; itemId: string } | null;
  editingChecklistItemText: string;
  setEditingChecklistItemText: Dispatch<SetStateAction<string>>;
  addChecklist: () => void;
  removeChecklist: (checklistId: string) => void;
  addChecklistItem: (checklistId: string) => void;
  removeChecklistItem: (checklistId: string, itemId: string) => void;
  toggleChecklistItem: (
    checklistId: string,
    itemId: string,
    checked: boolean,
  ) => void;
  toggleChecklistVisibility: (checklistId: string) => void;
  saveEditChecklistTitle: () => void;
  cancelEditChecklistTitle: () => void;
  startEditChecklistItem: (
    checklistId: string,
    itemId: string,
    text: string,
  ) => void;
  saveEditChecklistItem: () => void;
  cancelEditChecklistItem: () => void;
  transactionType: "income" | "expense";
  setTransactionType: Dispatch<SetStateAction<"income" | "expense">>;
  transactionAmount: string;
  setTransactionAmount: Dispatch<SetStateAction<string>>;
  transactionNote: string;
  setTransactionNote: Dispatch<SetStateAction<string>>;
  transactionDate: string;
  setTransactionDate: Dispatch<SetStateAction<string>>;
  editingTransactionId: string | null;
  editingTransactionDraft: EditingTransactionDraft | null;
  setEditingTransactionDraft: Dispatch<
    SetStateAction<EditingTransactionDraft | null>
  >;
  addTransaction: () => void;
  removeTransaction: (transactionId: string) => void;
  startEditTransaction: (tx: Task["transactions"][number]) => void;
  saveEditTransaction: () => void;
  cancelEditTransaction: () => void;
  removeWorklog: (worklogId: string) => void;
};

export type TaskDetailContextValue = {
  model: TaskDetailModel;
  isReadOnly: boolean;
  swimlaneCurrency: string;
  /** All boards (active + archived) available for selection. */
  boards: Board[];
  /** All swimlanes (active + archived) available for selection. */
  swimlanes: Swimlane[];
};
