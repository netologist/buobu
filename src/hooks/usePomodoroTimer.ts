import { useCallback, useEffect, useMemo, useReducer } from "react";

import {
  initialPomodoroState,
  pomodoroReducer,
  type PomodoroPhase,
} from "@/reducers/pomodoroReducer";

export type { PomodoroPhase };

type UsePomodoroTimerOptions = {
  onFocusComplete?: (
    taskId: string,
    details: {
      workMinutes: number;
      breakMinutes: number;
      startedAt: string;
      endedAt: string;
    },
  ) => void;
  tickIntervalMs?: number;
};

export function usePomodoroTimer(options: UsePomodoroTimerOptions = {}) {
  const { onFocusComplete, tickIntervalMs = 500 } = options;
  const [state, dispatch] = useReducer(pomodoroReducer, initialPomodoroState);

  const {
    activePomodoroTaskId,
    pomodoroPhase,
    pomodoroEndsAt,
    pomodoroStartedAt,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    pomodoroTick,
  } = state;

  const cancelPomodoro = useCallback(() => {
    dispatch({ type: "CANCEL" });
  }, []);

  const startPomodoro = useCallback(
    (taskId: string, config: { work: number; rest: number }) => {
      dispatch({ type: "START", taskId, workMinutes: config.work, breakMinutes: config.rest });
    },
    [],
  );

  const skipBreak = useCallback(() => {
    dispatch({ type: "SKIP_BREAK" });
  }, []);

  const pomodoroRemaining = useMemo(() => {
    if (!pomodoroEndsAt) return 0;
    return Math.max(0, pomodoroEndsAt - pomodoroTick);
  }, [pomodoroEndsAt, pomodoroTick]);

  useEffect(() => {
    if (!pomodoroEndsAt || !activePomodoroTaskId || pomodoroPhase === "idle") return;

    const timer = setInterval(() => {
      const now = Date.now();
      dispatch({ type: "TICK", now });

      if (now < pomodoroEndsAt) return;

      clearInterval(timer);

      if (pomodoroPhase === "work") {
        onFocusComplete?.(activePomodoroTaskId, {
          workMinutes: pomodoroWorkMinutes,
          breakMinutes: pomodoroBreakMinutes,
          startedAt: pomodoroStartedAt ?? new Date(now).toISOString(),
          endedAt: new Date(now).toISOString(),
        });

        if (pomodoroBreakMinutes > 0) {
          dispatch({ type: "BEGIN_BREAK", endsAt: Date.now() + pomodoroBreakMinutes * 60 * 1000 });
        } else {
          dispatch({ type: "CANCEL" });
        }
        return;
      }

      dispatch({ type: "CANCEL" });
    }, tickIntervalMs);

    return () => clearInterval(timer);
  }, [
    activePomodoroTaskId,
    onFocusComplete,
    pomodoroBreakMinutes,
    pomodoroEndsAt,
    pomodoroPhase,
    pomodoroStartedAt,
    pomodoroWorkMinutes,
    tickIntervalMs,
  ]);

  return {
    activePomodoroTaskId,
    pomodoroPhase,
    pomodoroEndsAt,
    pomodoroStartedAt,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    pomodoroTick,
    pomodoroRemaining,
    startPomodoro,
    cancelPomodoro,
    skipBreak,
  };
}
