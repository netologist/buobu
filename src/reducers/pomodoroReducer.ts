export type PomodoroPhase = "idle" | "work" | "break";

export type PomodoroState = {
  activePomodoroTaskId: string | null;
  pomodoroPhase: PomodoroPhase;
  pomodoroEndsAt: number | null;
  pomodoroStartedAt: string | null;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroTick: number;
};

export const initialPomodoroState: PomodoroState = {
  activePomodoroTaskId: null,
  pomodoroPhase: "idle",
  pomodoroEndsAt: null,
  pomodoroStartedAt: null,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroTick: 0,
};

export type PomodoroAction =
  | { type: "START"; taskId: string; workMinutes: number; breakMinutes: number }
  | { type: "CANCEL" }
  | { type: "TICK"; now: number }
  | { type: "BEGIN_BREAK"; endsAt: number }
  | { type: "SKIP_BREAK" };

export function pomodoroReducer(
  state: PomodoroState,
  action: PomodoroAction,
): PomodoroState {
  switch (action.type) {
    case "START": {
      const now = Date.now();
      return {
        activePomodoroTaskId: action.taskId,
        pomodoroPhase: "work",
        pomodoroWorkMinutes: action.workMinutes,
        pomodoroBreakMinutes: action.breakMinutes,
        pomodoroStartedAt: new Date(now).toISOString(),
        pomodoroEndsAt: now + action.workMinutes * 60 * 1000,
        pomodoroTick: now,
      };
    }

    case "CANCEL":
      return { ...initialPomodoroState };

    case "SKIP_BREAK":
      return { ...initialPomodoroState };

    case "TICK":
      return { ...state, pomodoroTick: action.now };

    case "BEGIN_BREAK":
      return {
        ...state,
        pomodoroPhase: "break",
        pomodoroEndsAt: action.endsAt,
      };

    default:
      return state;
  }
}
