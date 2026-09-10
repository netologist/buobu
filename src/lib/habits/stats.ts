import type { Habit, HabitLog } from "@/lib/types";
import { addDays, formatDateKey, getWeekStart } from "@/lib/habits/dateUtils";

const ONE_YEAR_DAYS = 365;
const monthFormatter = new Intl.DateTimeFormat("en", { month: "short" });

export type HabitChainCell = {
  key: string;
  date: Date;
  value: number;
  col: number;
  row: number;
  isFuture: boolean;
};

export type HabitChainData = {
  weeks: number;
  monthLabels: Array<{ col: number; label: string }>;
  cells: HabitChainCell[];
  currentStreak: number;
  longestStreak: number;
  totalCount: number;
  completionRate: number;
};

export type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
  completionRate: number;
};

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getTrackingWindow(logs: HabitLog[], today: Date) {
  const maxHistoryDate = addDays(today, -ONE_YEAR_DAYS);
  const sortedLogDates = logs.map((log) => log.date).sort();
  const earliestLogDate = sortedLogDates[0] ? normalizeDate(new Date(sortedLogDates[0])) : today;
  const firstLogDate = earliestLogDate < maxHistoryDate ? new Date(maxHistoryDate) : earliestLogDate;

  return { firstLogDate, maxHistoryDate };
}

export function calculateHabitStats(logs: HabitLog[], today = new Date()): HabitStats {
  const normalizedToday = normalizeDate(today);
  const { firstLogDate, maxHistoryDate } = getTrackingWindow(logs, normalizedToday);
  const logMap = logs.reduce<Record<string, HabitLog>>((acc, log) => {
    acc[log.date] = log;
    return acc;
  }, {});

  const completedDays = logs.reduce((count, log) => {
    const logDate = new Date(log.date);
    return logDate >= maxHistoryDate && log.value > 0 ? count + 1 : count;
  }, 0);

  let currentStreak = 0;
  const cursorCurrent = new Date(normalizedToday);
  while (cursorCurrent >= firstLogDate) {
    const currentDateKey = formatDateKey(cursorCurrent);
    const log = logMap[currentDateKey];

    if (log && log.value > 0) {
      currentStreak++;
    } else if (!(log && log.value === -1)) {
      break;
    }

    cursorCurrent.setDate(cursorCurrent.getDate() - 1);
  }

  let longestStreak = 0;
  let tempStreak = 0;
  const cursorLongest = new Date(firstLogDate);
  while (cursorLongest <= normalizedToday) {
    const currentDateKey = formatDateKey(cursorLongest);
    const log = logMap[currentDateKey];

    if (log && log.value > 0) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (!(log && log.value === -1)) {
      tempStreak = 0;
    }

    cursorLongest.setDate(cursorLongest.getDate() + 1);
  }

  return {
    currentStreak,
    longestStreak,
    completedDays,
    completionRate: 0,
  };
}

export function buildHabitChainData(
  habit: Habit,
  logs: HabitLog[],
  chainWeekStart: number,
  allDays: number[],
  today = new Date(),
): HabitChainData {
  const normalizedToday = normalizeDate(today);
  const start = addDays(normalizedToday, -364);
  const alignedStart = getWeekStart(start, chainWeekStart);
  const dates: Date[] = [];
  const cursor = new Date(alignedStart);

  while (cursor <= normalizedToday) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  while (dates.length % 7 !== 0) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const monthLabels: Array<{ col: number; label: string }> = [];
  let lastMonth = -1;
  dates.forEach((date, index) => {
    const col = Math.floor(index / 7);
    const currentMonth = date.getMonth();
    if (currentMonth !== lastMonth) {
      monthLabels.push({ col, label: monthFormatter.format(date) });
      lastMonth = currentMonth;
    }
  });

  const logMap = logs.reduce<Record<string, HabitLog>>((acc, log) => {
    acc[log.date] = log;
    return acc;
  }, {});
  const frequencyDays = habit.frequencyDays ?? allDays;
  const cells = dates.map((date, index) => {
    const key = formatDateKey(date);
    const scheduled = frequencyDays.includes(date.getDay());
    const logged = logMap[key]?.value;

    return {
      key: `${key}-${index}`,
      date,
      value: logged !== undefined ? logged : scheduled ? 0 : -1,
      col: Math.floor(index / 7),
      row: (date.getDay() - chainWeekStart + 7) % 7,
      isFuture: date > normalizedToday,
    };
  });

  const stats = calculateHabitStats(logs, normalizedToday);

  return {
    weeks: Math.ceil(dates.length / 7),
    monthLabels,
    cells,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalCount: stats.completedDays,
    completionRate: stats.completionRate,
  };
}
