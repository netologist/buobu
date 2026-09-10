"use client";

import { useState, useEffect } from "react";
import { Clock, Calendar, Layers, ChevronRight } from "lucide-react";
import type { Timeblock, RecurrenceRule } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBoards } from "@/stores/hooks/use-boards";
import { useActiveTimeblocks } from "@/stores/hooks/use-timeblocks";
import { cn } from "@/lib/utils";
import { recurrenceSummary } from "@/lib/timeblocks/formatters";
import { computeOccurrencesInRange } from "@/lib/timeblocks/effective-recurrence";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeblock?: Timeblock | null;
  defaultBoardId?: string | null;
  defaultSwimlaneId?: string | null;
  weekStartDay?: number;
  onSave: (data: Partial<Timeblock>) => Promise<void>;
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

type RecurrenceType = RecurrenceRule["type"];

export function TimeblockEditDialog({
  open,
  onOpenChange,
  timeblock,
  defaultBoardId,
  defaultSwimlaneId,
  weekStartDay = 1,
  onSave,
}: Props) {
  const { boards, swimlanes: allSwimlanes } = useBoards();
  const allTimeblocks = useActiveTimeblocks();
  const [saving, setSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [colorCustomized, setColorCustomized] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [boardId, setBoardId] = useState("");
  const [swimlaneId, setSwimlaneId] = useState("");
  const [showAsHabit, setShowAsHabit] = useState(false);

  // Recurrence
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [interval, setInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(undefined);
  const [monthOfYear, setMonthOfYear] = useState<number | undefined>(undefined);
  const [endDate, setEndDate] = useState("");

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (timeblock) {
      setTitle(timeblock.title);
      setDescription(timeblock.description ?? "");
      setColor(timeblock.color ?? COLORS[0]);
      setColorCustomized(false);
      setStartTime(timeblock.startTime);
      setEndTime(timeblock.endTime);
      setBoardId(timeblock.boardId);
      setSwimlaneId(timeblock.swimlaneId);
      setShowAsHabit(Boolean(timeblock.showAsHabit));
      setRecurrenceType(timeblock.recurrence.type);
      setInterval(timeblock.recurrence.interval);
      setDaysOfWeek(timeblock.recurrence.daysOfWeek ?? []);
      setDayOfMonth(timeblock.recurrence.dayOfMonth);
      setMonthOfYear(timeblock.recurrence.monthOfYear);
      setEndDate(timeblock.recurrence.endDate ?? "");
    } else {
      const preferredBoard = defaultBoardId
        ? boards.find((b) => b.id === defaultBoardId && !b.archived)
        : null;
      const firstBoard = boards.find((b) => !b.archived);
      const targetBoard = preferredBoard ?? firstBoard ?? null;
      const targetBoardId = targetBoard?.id ?? "";
      const boardSwimlanes = allSwimlanes.filter(
        (s) => s.boardId === targetBoardId && !s.archived,
      );
      const preferredSwimlane = defaultSwimlaneId
        ? boardSwimlanes.find((s) => s.id === defaultSwimlaneId)
        : null;
      const targetSwimlaneId = preferredSwimlane?.id ?? boardSwimlanes[0]?.id ?? "";

      const newSwimlane = allSwimlanes.find((s) => s.id === targetSwimlaneId);
      setTitle("");
      setDescription("");
      setColor(newSwimlane?.color ?? COLORS[0]);
      setColorCustomized(false);
      setStartTime("09:00");
      setEndTime("10:00");
      setBoardId(targetBoardId);
      setSwimlaneId(targetSwimlaneId);
      setShowAsHabit(false);
      setRecurrenceType("weekly");
      setInterval(1);
      setDaysOfWeek([1, 2, 3, 4, 5]); // Mon-Fri default
      setDayOfMonth(undefined);
      setMonthOfYear(undefined);
      setEndDate("");
    }
    setErrors({});
  }, [open, timeblock, boards, allSwimlanes, defaultBoardId, defaultSwimlaneId]);

  const selectedBoard = boards.find((b) => b.id === boardId);
  const selectedSwimlane = allSwimlanes.find((s) => s.id === swimlaneId);
  const boardSwimlanes = allSwimlanes.filter((s) => s.boardId === boardId && !s.archived);
  const effectiveWeekStartDay = selectedBoard?.weekStart ?? weekStartDay;
  const orderedWeekDays = Array.from({ length: 7 }, (_, i) => (effectiveWeekStartDay + i) % 7);

  function toggleDayOfWeek(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!startTime) errs.startTime = "Start time is required";
    if (!endTime) errs.endTime = "End time is required";
    if (startTime && endTime && startTime >= endTime)
      errs.endTime = "End time must be after start time";
    if (!boardId) errs.boardId = "Board is required";
    if (!swimlaneId) errs.swimlaneId = "Swimlane is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  useEffect(() => {
    if (!open) {
      setConflictWarning(null);
    }
  }, [open]);

  /** Returns names of timeblocks that overlap on any shared recurrence day */
  function findConflicts(): string[] {
    if (!startTime || !endTime || startTime >= endTime) return [];

    // Build a 2-week window from today to check recurrence overlap
    const today = new Date();
    const rangeStart = today.toISOString().slice(0, 10);
    const rangeEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // Candidate days for the new/edited TB
    const candidateDays = new Set(
      computeOccurrencesInRange(
        {
          type: recurrenceType,
          interval,
          ...(recurrenceType === "weekly" && daysOfWeek.length > 0 ? { daysOfWeek } : {}),
          ...(dayOfMonth != null ? { dayOfMonth } : {}),
          ...(monthOfYear != null ? { monthOfYear } : {}),
          ...(endDate ? { endDate } : {}),
        },
        rangeStart,
        rangeEnd,
      ),
    );

    if (candidateDays.size === 0) return [];

    const conflicts: string[] = [];
    for (const other of allTimeblocks) {
      if (other.id === timeblock?.id) continue; // skip self
      // Check time overlap: (s1 < e2) && (s2 < e1)
      if (!(startTime < other.endTime && other.startTime < endTime)) continue;
      // Check recurrence day overlap
      const otherDays = computeOccurrencesInRange(other.recurrence, rangeStart, rangeEnd);
      const hasSharedDay = otherDays.some((d) => candidateDays.has(d));
      if (hasSharedDay) conflicts.push(other.title);
    }
    return conflicts;
  }

  async function handleSave() {
    if (!validate()) return;
    const conflicts = findConflicts();
    if (conflicts.length > 0) {
      setConflictWarning(
        `This time block overlaps with: ${conflicts.join(", ")}. Save anyway?`,
      );
      return;
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    setConflictWarning(null);
    try {
      const recurrence: RecurrenceRule = {
        type: recurrenceType,
        interval,
        ...(recurrenceType === "weekly" && daysOfWeek.length > 0 ? { daysOfWeek } : {}),
        ...(dayOfMonth != null ? { dayOfMonth } : {}),
        ...(monthOfYear != null ? { monthOfYear } : {}),
        ...(endDate ? { endDate } : {}),
      };
      const payload: Partial<Timeblock> = {
        ...(timeblock ? { id: timeblock.id } : {}),
        title: title.trim(),
        description: description.trim() || null,
        color,
        startTime,
        endTime,
        recurrence,
        boardId,
        swimlaneId,
        showAsHabit,
      };
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const summary = recurrenceSummary({
    type: recurrenceType,
    interval,
    daysOfWeek: recurrenceType === "weekly" ? daysOfWeek : undefined,
    dayOfMonth,
    monthOfYear,
    endDate: endDate || undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold">
            {timeblock ? "Edit Time Block" : "New Time Block"}
          </DialogTitle>
          {(selectedBoard || selectedSwimlane) && (
            <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <Layers className="size-3 shrink-0" />
              {selectedBoard && <span>{selectedBoard.name}</span>}
              {selectedBoard && selectedSwimlane && <ChevronRight className="size-3 shrink-0" />}
              {selectedSwimlane && <span>{selectedSwimlane.name}</span>}
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Board / Swimlane */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Location
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Board</Label>
                <Select value={boardId} onValueChange={(v) => { setBoardId(v); setSwimlaneId(""); }}>
                  <SelectTrigger className={cn(errors.boardId && "border-destructive")}>
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.filter((b) => !b.archived).map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.boardId && <p className="text-xs text-destructive">{errors.boardId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Swimlane</Label>
                <Select value={swimlaneId} onValueChange={(v) => {
                  setSwimlaneId(v);
                  if (!colorCustomized) {
                    const sw = allSwimlanes.find((s) => s.id === v);
                    if (sw?.color) setColor(sw.color);
                  }
                }}>
                  <SelectTrigger className={cn(errors.swimlaneId && "border-destructive")}>
                    <SelectValue placeholder="Select swimlane" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardSwimlanes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.swimlaneId && <p className="text-xs text-destructive">{errors.swimlaneId}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Details
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="tb-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Deep work, Morning routine"
                className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
                autoFocus
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tb-desc">Description</Label>
              <Textarea
                id="tb-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setColor(c); setColorCustomized(true); }}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      color === c ? "border-foreground scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
                {/* Custom color picker */}
                <label
                  className={cn(
                    "size-6 rounded-full border-2 cursor-pointer transition-all overflow-hidden",
                    !COLORS.includes(color) ? "border-foreground scale-110" : "border-border",
                  )}
                  title="Custom color"
                  style={{ backgroundColor: COLORS.includes(color) ? "transparent" : color }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); setColorCustomized(true); }}
                    className="opacity-0 w-0 h-0 absolute"
                  />
                  {COLORS.includes(color) && (
                    <span className="flex items-center justify-center w-full h-full text-[10px] text-muted-foreground">+</span>
                  )}
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time range */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Time Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tb-start">
                  Start time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="tb-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      if (newStart && startTime && endTime && startTime < endTime) {
                        const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
                        setEndTime(minutesToTime(timeToMinutes(newStart) + duration));
                      }
                      setStartTime(newStart);
                    }}
                    className={cn("pl-8", errors.startTime && "border-destructive")}
                  />
                </div>
                {errors.startTime && <p className="text-xs text-destructive">{errors.startTime}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tb-end">
                  End time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="tb-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={cn("pl-8", errors.endTime && "border-destructive")}
                  />
                </div>
                {errors.endTime && <p className="text-xs text-destructive">{errors.endTime}</p>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule / Recurrence */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Schedule
            </p>

            <div className="space-y-1.5">
              <Label>Repeats</Label>
              <Select
                value={recurrenceType}
                onValueChange={(v) => {
                  setRecurrenceType(v as RecurrenceType);
                  setDaysOfWeek([]);
                  setDayOfMonth(undefined);
                  setMonthOfYear(undefined);
                  if (v !== "custom") setInterval(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bi-weekly shortcut for weekly */}
            {recurrenceType === "weekly" && (
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-xs">Every</Label>
                <button
                  type="button"
                  onClick={() => setInterval(Math.max(1, interval - 1))}
                  className="flex size-7 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-6 text-center">{interval}</span>
                <button
                  type="button"
                  onClick={() => setInterval(interval + 1)}
                  className="flex size-7 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  +
                </button>
                <Label className="text-muted-foreground text-xs">week(s)</Label>
              </div>
            )}

            {/* Custom interval */}
            {recurrenceType === "custom" && (
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-xs">Every</Label>
                <button
                  type="button"
                  onClick={() => setInterval(Math.max(1, interval - 1))}
                  className="flex size-7 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  −
                </button>
                <Input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center"
                />
                <button
                  type="button"
                  onClick={() => setInterval(interval + 1)}
                  className="flex size-7 items-center justify-center rounded-md border text-sm hover:bg-muted transition-colors"
                >
                  +
                </button>
                <Label className="text-muted-foreground text-xs">days</Label>
              </div>
            )}

            {/* Weekly: days of week */}
            {recurrenceType === "weekly" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>On days</Label>
                  {daysOfWeek.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDaysOfWeek([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {orderedWeekDays.map((dayIndex) => (
                    <button
                      key={dayIndex}
                      type="button"
                      onClick={() => toggleDayOfWeek(dayIndex)}
                      title={DAY_FULL[dayIndex]}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-xs font-medium border transition-colors",
                        daysOfWeek.includes(dayIndex)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {DAY_NAMES[dayIndex]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly / Yearly: day of month */}
            {(recurrenceType === "monthly" || recurrenceType === "yearly") && (
              <div className="space-y-1.5">
                <Label htmlFor="tb-dom">Day of month</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tb-dom"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth ?? ""}
                    onChange={(e) =>
                      setDayOfMonth(
                        e.target.value
                          ? Math.min(31, Math.max(1, parseInt(e.target.value)))
                          : undefined,
                      )
                    }
                    placeholder="e.g. 15"
                    className="w-28"
                  />
                  {dayOfMonth && (
                    <span className="text-sm text-muted-foreground">
                      {dayOfMonth}{ordinal(dayOfMonth)} of the month
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Yearly: month */}
            {recurrenceType === "yearly" && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select
                  value={monthOfYear?.toString() ?? ""}
                  onValueChange={(v) => setMonthOfYear(parseInt(v) || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Recurrence summary */}
            <div className="rounded-md bg-muted/60 px-3 py-2 flex items-center gap-2">
              <Calendar className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{summary}</span>
                {endDate && ` · until ${endDate}`}
              </span>
            </div>

            {/* End date */}
            <div className="space-y-1.5">
              <Label htmlFor="tb-end-date" className="text-muted-foreground">
                Ends on <span className="font-normal">(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tb-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-44"
                />
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/40">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={showAsHabit}
                  onCheckedChange={(value) => setShowAsHabit(Boolean(value))}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Show as a habit</p>
                  <p className="text-xs text-blue-700/90 dark:text-blue-300/90">
                    This creates a timeblock-owned habit row in Habits. It can be checked there, but archive/delete is managed only from Time Blocks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-col gap-2">
          {conflictWarning && (
            <div className="w-full rounded-md border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
              <p className="font-medium mb-1">Overlap detected</p>
              <p className="mb-2">{conflictWarning}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setConflictWarning(null)}
                >
                  Go back
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={doSave}
                  disabled={saving}
                >
                  Save anyway
                </Button>
              </div>
            </div>
          )}
          {!conflictWarning && (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : timeblock ? "Save changes" : "Create time block"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
