export type UiPanelState = {
  activeBacklogSwimlaneId: string | null;
  showArchive: boolean;
  archiveSwimlaneId: string | null;
  showTransactions: boolean;
  showScheduledTransactions: boolean;
  transactionsSwimlaneId: string | null;
  showPomodoros: boolean;
  pomodorosSwimlaneId: string | null;
  reorderColumnsOpen: boolean;
};

export const initialUiPanelState: UiPanelState = {
  activeBacklogSwimlaneId: null,
  showArchive: false,
  archiveSwimlaneId: null,
  showTransactions: false,
  showScheduledTransactions: false,
  transactionsSwimlaneId: null,
  showPomodoros: false,
  pomodorosSwimlaneId: null,
  reorderColumnsOpen: false,
};

export type UiPanelAction =
  | { type: "TOGGLE_BACKLOG"; swimlaneId?: string | null }
  | { type: "TOGGLE_ARCHIVE"; open: boolean; swimlaneId?: string | null }
  | {
      type: "TOGGLE_TRANSACTIONS";
      open: boolean;
      swimlaneId?: string | null;
      scheduled?: boolean;
    }
  | { type: "TOGGLE_POMODOROS"; open: boolean; swimlaneId?: string | null }
  | { type: "OPEN_REORDER_COLUMNS" }
  | { type: "CLOSE_REORDER_COLUMNS" };

export function uiPanelReducer(
  state: UiPanelState,
  action: UiPanelAction,
): UiPanelState {
  switch (action.type) {
    case "TOGGLE_BACKLOG":
      return {
        ...state,
        activeBacklogSwimlaneId: action.swimlaneId ?? null,
      };

    case "TOGGLE_ARCHIVE":
      return {
        ...state,
        showArchive: action.open,
        archiveSwimlaneId: action.open ? action.swimlaneId ?? state.archiveSwimlaneId : null,
      };

    case "TOGGLE_TRANSACTIONS": {
      if (!action.open) {
        return {
          ...state,
          showTransactions: false,
          showScheduledTransactions: false,
          transactionsSwimlaneId: null,
        };
      }

      return {
        ...state,
        showTransactions: !action.scheduled,
        showScheduledTransactions: Boolean(action.scheduled),
        transactionsSwimlaneId: action.swimlaneId ?? state.transactionsSwimlaneId,
      };
    }

    case "TOGGLE_POMODOROS":
      return {
        ...state,
        showPomodoros: action.open,
        pomodorosSwimlaneId: action.open ? action.swimlaneId ?? state.pomodorosSwimlaneId : null,
      };

    case "OPEN_REORDER_COLUMNS":
      return {
        ...state,
        reorderColumnsOpen: true,
      };

    case "CLOSE_REORDER_COLUMNS":
      return {
        ...state,
        reorderColumnsOpen: false,
      };

    default:
      return state;
  }
}
