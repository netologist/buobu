import { nanoid } from "nanoid";
import type { Task } from "@/lib/types";

export type TaskEditorState = {
  activeTaskId: string | null;
  draftTask: Task | null;
  labelInput: string;
  commentInput: string;
  editingCommentId: string | null;
  editingCommentText: string;
};

export const initialTaskEditorState: TaskEditorState = {
  activeTaskId: null,
  draftTask: null,
  labelInput: "",
  commentInput: "",
  editingCommentId: null,
  editingCommentText: "",
};

export type TaskEditorAction =
  | { type: "OPEN_TASK"; task: Task }
  | { type: "CLOSE_TASK" }
  | { type: "SET_ACTIVE_TASK_ID"; id: string | null }
  | { type: "SET_DRAFT_TASK"; task: Task | null }
  | { type: "UPDATE_DRAFT"; patch: Partial<Task> }
  | { type: "UPDATE_DRAFT_FN"; fn: (current: Task | null) => Task | null }
  | { type: "SET_LABEL_INPUT"; value: string }
  | { type: "SET_COMMENT_INPUT"; value: string }
  | { type: "ADD_LABEL"; label?: string }
  | { type: "REMOVE_LABEL"; label: string }
  | { type: "ADD_COMMENT"; text?: string }
  | { type: "REMOVE_COMMENT"; commentId: string }
  | { type: "SET_EDITING_COMMENT_ID"; id: string | null }
  | { type: "SET_EDITING_COMMENT_TEXT"; text: string }
  | { type: "START_EDIT_COMMENT"; commentId: string; text: string }
  | { type: "SAVE_EDIT_COMMENT" }
  | { type: "CANCEL_EDIT_COMMENT" };

export function taskEditorReducer(
  state: TaskEditorState,
  action: TaskEditorAction,
): TaskEditorState {
  switch (action.type) {
    case "OPEN_TASK":
      return { ...state, activeTaskId: action.task.id, draftTask: { ...action.task } };

    case "CLOSE_TASK":
      return { ...initialTaskEditorState };

    case "SET_ACTIVE_TASK_ID":
      return { ...state, activeTaskId: action.id };

    case "SET_DRAFT_TASK":
      return { ...state, draftTask: action.task };

    case "UPDATE_DRAFT":
      return state.draftTask
        ? { ...state, draftTask: { ...state.draftTask, ...action.patch } }
        : state;

    case "UPDATE_DRAFT_FN":
      return { ...state, draftTask: action.fn(state.draftTask) };

    case "SET_LABEL_INPUT":
      return { ...state, labelInput: action.value };

    case "SET_COMMENT_INPUT":
      return { ...state, commentInput: action.value };

    case "ADD_LABEL": {
      if (!state.draftTask) return { ...state, labelInput: "" };
      const value = (action.label ?? state.labelInput).trim();
      if (!value || state.draftTask.labels.includes(value)) return { ...state, labelInput: "" };
      return {
        ...state,
        labelInput: "",
        draftTask: { ...state.draftTask, labels: [...state.draftTask.labels, value] },
      };
    }

    case "REMOVE_LABEL":
      if (!state.draftTask) return state;
      return {
        ...state,
        draftTask: {
          ...state.draftTask,
          labels: state.draftTask.labels.filter((l) => l !== action.label),
        },
      };

    case "ADD_COMMENT": {
      if (!state.draftTask) return state;
      const text = (action.text ?? state.commentInput).trim();
      if (!text) return state;
      return {
        ...state,
        commentInput: "",
        draftTask: {
          ...state.draftTask,
          comments: [
            ...state.draftTask.comments,
            { id: nanoid(), text, createdAt: new Date().toISOString() },
          ],
        },
      };
    }

    case "REMOVE_COMMENT":
      if (!state.draftTask) return state;
      return {
        ...state,
        draftTask: {
          ...state.draftTask,
          comments: state.draftTask.comments.filter((c) => c.id !== action.commentId),
        },
      };

    case "SET_EDITING_COMMENT_ID":
      return { ...state, editingCommentId: action.id };

    case "SET_EDITING_COMMENT_TEXT":
      return { ...state, editingCommentText: action.text };

    case "START_EDIT_COMMENT":
      return { ...state, editingCommentId: action.commentId, editingCommentText: action.text };

    case "SAVE_EDIT_COMMENT": {
      if (!state.editingCommentId || !state.draftTask) return state;
      const text = state.editingCommentText.trim();
      return {
        ...state,
        editingCommentId: null,
        editingCommentText: "",
        draftTask: {
          ...state.draftTask,
          comments: state.draftTask.comments.map((c) =>
            c.id === state.editingCommentId ? { ...c, text } : c,
          ),
        },
      };
    }

    case "CANCEL_EDIT_COMMENT":
      return { ...state, editingCommentId: null, editingCommentText: "" };

    default:
      return state;
  }
}
