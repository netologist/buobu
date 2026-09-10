import type { CSSProperties } from "react";

import type { Habit } from "@/lib/types";
import { getCellColor, getSkipBackground, getWeekendBackground } from "@/lib/habits/colorUtils";

type HabitCellProps = {
  habit: Habit;
  date: Date;
  dateKey: string;
  value: number;
  clickedPreview?: number;
  isHovered: boolean;
  isPreviewDisabled: boolean;
  onClick: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onMouseEnter: () => void;
};

export function HabitCell({
  habit,
  date,
  dateKey,
  value,
  clickedPreview,
  isHovered,
  isPreviewDisabled,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onMouseEnter,
}: HabitCellProps) {
  const weekendBg = getWeekendBackground(date);
  const skipBg = getSkipBackground(date, habit.color);

  const baseValue = clickedPreview !== undefined ? clickedPreview : value;

  let displayValue = baseValue;
  if (isHovered && !isPreviewDisabled) {
    if (baseValue < 0) {
      displayValue = 0;
    } else {
      displayValue = baseValue === 0 ? 1 : baseValue === 1 ? 2 : baseValue === 2 ? 3 : 0;
    }
  }

  const isSkip = displayValue < 0;
  const displayColor = isSkip
    ? skipBg
    : getCellColor(displayValue, habit.color) ?? weekendBg;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
      onTouchStart={onMouseDown}
      onTouchEnd={onMouseUp}
      className={`h-8 select-none border-l border-muted transition${isSkip ? "" : " bg-(--habit-cell-bg)"}`}
      style={isSkip
        ? { background: displayColor } as CSSProperties
        : { "--habit-cell-bg": displayColor } as CSSProperties}
      title={
        value < 0
          ? `${dateKey} • skipped`
          : value === 0
            ? `${dateKey} • unmarked`
            : value === 1
              ? `${dateKey} • light`
              : value === 2
                ? `${dateKey} • medium`
                : `${dateKey} • dark`
      }
    />
  );
}
