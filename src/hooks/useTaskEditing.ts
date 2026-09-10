import { useCallback, useReducer, type Dispatch, type SetStateAction } from "react";

import {
  initialTaskEditorState,
  taskEditorReducer,
} from "@/reducers/taskEditorReducer";
import type { Task } from "@/lib/types";

export function useTaskEditing() {
  const [state, dispatch] = useReducer(taskEditorReducer, initialTaskEditorState);

  const {
    activeTaskId,
    draftTask,
    labelInput,
    commentInput,
    editingCommentId,
    editingCommentText,
  } = state;

  // ── Raw setters (backward compat — consumers may pass direct values or updater fns) ──

  const setActiveTaskId = useCallback(
    (id: string | null | ((prev: string | null) => string | null)) => {
      dispatch({
        type: "SET_ACTIVE_TASK_ID",
        id: typeof id === "function" ? id(state.activeTaskId) : id,
      });
    },
    [state.activeTaskId],
  );

  const setDraftTask = useCallback(
    (value: Task | null | ((current: Task | null) => Task | null)) => {
      if (typeof value === "function") {
        dispatch({ type: "UPDATE_DRAFT_FN", fn: value });
      } else {
        dispatch({ type: "SET_DRAFT_TASK", task: value });
      }
    },
    [],
  ) as Dispatch<SetStateAction<Task | null>>;

  const setLabelInput = useCallback(
    (value: string | ((prev: string) => string)) => {
      dispatch({
        type: "SET_LABEL_INPUT",
        value: typeof value === "function" ? value(state.labelInput) : value,
      });
    },
    [state.labelInput],
  );

  const setCommentInput = useCallback(
    (value: string | ((prev: string) => string)) => {
      dispatch({
        type: "SET_COMMENT_INPUT",
        value: typeof value === "function" ? value(state.commentInput) : value,
      });
    },
    [state.commentInput],
  );

  const setEditingCommentId = useCallback(
    (id: string | null | ((prev: string | null) => string | null)) => {
      dispatch({
        type: "SET_EDITING_COMMENT_ID",
        id: typeof id === "function" ? id(state.editingCommentId) : id,
      });
    },
    [state.editingCommentId],
  );

  const setEditingCommentText = useCallback(
    (text: string | ((prev: string) => string)) => {
      dispatch({
        type: "SET_EDITING_COMMENT_TEXT",
        text: typeof text === "function" ? text(state.editingCommentText) : text,
      });
    },
    [state.editingCommentText],
  );

  // ── High-level actions ──

  const openTask = useCallback((task: Task | null) => {
    if (task) {
      dispatch({ type: "OPEN_TASK", task });
    } else {
      dispatch({ type: "CLOSE_TASK" });
    }
  }, []);

  const closeTask = useCallback(() => {
    dispatch({ type: "CLOSE_TASK" });
  }, []);

  const updateDraft = useCallback((patch: Partial<Task>) => {
    dispatch({ type: "UPDATE_DRAFT", patch });
  }, []);

  const addLabel = useCallback((nextLabel?: string) => {
    dispatch({ type: "ADD_LABEL", label: nextLabel });
  }, []);

  const removeLabel = useCallback((label: string) => {
    dispatch({ type: "REMOVE_LABEL", label });
  }, []);

  const addComment = useCallback((nextComment?: string) => {
    dispatch({ type: "ADD_COMMENT", text: nextComment });
  }, []);

  const removeComment = useCallback((commentId: string) => {
    dispatch({ type: "REMOVE_COMMENT", commentId });
  }, []);

  const updateComment = useCallback((commentId: string, text: string) => {
    dispatch({
      type: "UPDATE_DRAFT_FN",
      fn: (current) =>
        current
          ? {
              ...current,
              comments: current.comments.map((c) =>
                c.id === commentId ? { ...c, text } : c,
              ),
            }
          : current,
    });
  }, []);

  const startEditComment = useCallback((commentId: string, text: string) => {
    dispatch({ type: "START_EDIT_COMMENT", commentId, text });
  }, []);

  const saveEditComment = useCallback(() => {
    dispatch({ type: "SAVE_EDIT_COMMENT" });
  }, []);

  const cancelEditComment = useCallback(() => {
    dispatch({ type: "CANCEL_EDIT_COMMENT" });
  }, []);

  return {
    activeTaskId,
    draftTask,
    labelInput,
    commentInput,
    editingCommentId,
    editingCommentText,
    setActiveTaskId,
    setDraftTask,
    setLabelInput,
    setCommentInput,
    setEditingCommentId,
    setEditingCommentText,
    openTask,
    closeTask,
    updateDraft,
    addLabel,
    removeLabel,
    addComment,
    removeComment,
    updateComment,
    startEditComment,
    saveEditComment,
    cancelEditComment,
  };
}
