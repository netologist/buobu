"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Routine, RecurrenceRule } from "@/lib/types";
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
import { CheckSquare, Calendar, Banknote, TrendingUp, TrendingDown, Layers, ChevronRight, Timer, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { routineFormSchema, type RoutineFormInput } from "@/lib/validation/routineForm";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { useActiveTimeblocks } from "@/stores/hooks/use-timeblocks";
import { recurrenceSummary as formatRecurrenceSummary } from "@/lib/timeblocks/formatters";

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type RoutineType = Routine["type"];
type RecurrenceType = RecurrenceRule["type"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routine?: Routine | null;
  defaultBoardId?: string | null;
  defaultSwimlaneId?: string | null;
  onSave: (data: Partial<Routine>) => Promise<void>;
};

function buildRecurrenceSummary(
  type: RecurrenceType,
  interval: number,
  daysOfWeek: number[],
  dayOfMonth: number | undefined,
  monthOfYear: number | undefined,
): string {
  const every = interval > 1 ? `Every ${interval}` : "Every";

  switch (type) {
    case "daily":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    case "weekly": {
      if (daysOfWeek.length === 0) return `${every} week`;
      if (daysOfWeek.length === 7) return "Every day";
      const sorted = [...daysOfWeek].sort((a, b) => a - b);
      const names = sorted.map((d) => DAY_FULL[d]);
      const dayStr =
        names.length <= 3
          ? names.join(", ")
          : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
      return interval === 1 ? `Every ${dayStr}` : `Every ${interval} weeks on ${dayStr}`;
    }
    case "monthly":
      return dayOfMonth
        ? `Monthly on the ${dayOfMonth}${ordinal(dayOfMonth)}`
        : `${every} month`;
    case "yearly": {
      const monthStr = monthOfYear ? MONTH_NAMES[monthOfYear - 1] : "—";
      return dayOfMonth
        ? `Every year on ${monthStr} ${dayOfMonth}`
        : monthOfYear
        ? `Every year in ${monthStr}`
        : `${every} year`;
    }
    case "custom":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function RoutineDialog({
  open,
  onOpenChange,
  routine,
  defaultBoardId,
  defaultSwimlaneId,
  onSave,
}: Props) {
  const { boards, swimlanes: allSwimlanes } = useBoards();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoutineFormInput>({
    resolver: zodResolver(routineFormSchema, undefined, { mode: "sync" }),
    defaultValues: {
      title: "",
      description: "",
      routineType: "task",
      recurrenceType: "daily",
      interval: 1,
      daysOfWeek: [],
      dayOfMonth: undefined,
      monthOfYear: undefined,
      endDate: "",
      eventTime: "",
      paymentAmount: undefined,
      paymentType: "expense",
      paymentNote: "",
      boardId: "",
      swimlaneId: "",
      timeblockId: null,
    },
  });

  const routineType = watch("routineType");
  const recurrenceType = watch("recurrenceType");
  const daysOfWeek = watch("daysOfWeek");
  const dayOfMonth = watch("dayOfMonth");
  const monthOfYear = watch("monthOfYear");
  const endDate = watch("endDate");
  const interval = watch("interval");
  const boardId = watch("boardId");
  const swimlaneId = watch("swimlaneId");
  const paymentType = watch("paymentType");
  const timeblockId = watch("timeblockId");

  useEffect(() => {
    if (!open) return;
    if (routine) {
      reset({
        title: routine.title,
        description: routine.description ?? "",
        routineType: routine.type,
        recurrenceType: routine.recurrence.type,
        interval: routine.recurrence.interval,
        daysOfWeek: routine.recurrence.daysOfWeek ?? [],
        dayOfMonth: routine.recurrence.dayOfMonth,
        monthOfYear: routine.recurrence.monthOfYear,
        endDate: routine.recurrence.endDate ?? "",
        eventTime: routine.eventTime ?? "",
        paymentAmount: routine.paymentAmount ?? undefined,
        paymentType: routine.paymentType ?? "expense",
        paymentNote: routine.paymentNote ?? "",
        boardId: routine.boardId ?? "",
        swimlaneId: routine.swimlaneId ?? "",
        timeblockId: routine.timeblockId ?? null,
      });
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

      reset({
        title: "",
        description: "",
        routineType: "task",
        recurrenceType: "daily",
        interval: 1,
        daysOfWeek: [],
        dayOfMonth: undefined,
        monthOfYear: undefined,
        endDate: "",
        eventTime: "",
        paymentAmount: undefined,
        paymentType: "expense",
        paymentNote: "",
        boardId: targetBoardId,
        swimlaneId: targetSwimlaneId,
        timeblockId: null,
      });
    }
  }, [routine, open, boards, allSwimlanes, defaultBoardId, defaultSwimlaneId, reset]);

  const selectedBoard = boards.find((b) => b.id === boardId);
  const selectedSwimlane = allSwimlanes.find((s) => s.id === swimlaneId);
  const firstColumnId = selectedBoard?.columns?.[0]?.id ?? "";
  const swimlaneCurrency = selectedSwimlane?.currency ?? DEFAULT_CURRENCY;

  const allTimeblocks = useActiveTimeblocks();
  const eligibleTimeblocks = swimlaneId
    ? allTimeblocks.filter((tb) => tb.swimlaneId === swimlaneId)
    : allTimeblocks;
  const selectedTimeblock = eligibleTimeblocks.find((tb) => tb.id === timeblockId) ?? null;

  function toggleDayOfWeek(day: number) {
    const current = daysOfWeek ?? [];
    setValue(
      "daysOfWeek",
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
      { shouldValidate: true },
    );
  }

  async function handleSave(data: RoutineFormInput) {
    setSaving(true);
    try {
      const recurrence: RecurrenceRule = {
        type: data.recurrenceType,
        interval: data.interval,
        ...(data.recurrenceType === "weekly" && (data.daysOfWeek ?? []).length > 0
          ? { daysOfWeek: data.daysOfWeek ?? [] }
          : {}),
        ...(data.dayOfMonth != null ? { dayOfMonth: data.dayOfMonth } : {}),
        ...(data.monthOfYear != null ? { monthOfYear: data.monthOfYear } : {}),
        ...(data.endDate ? { endDate: data.endDate } : {}),
      };
      const payload: Partial<Routine> = {
        ...(routine ? { id: routine.id } : {}),
        title: data.title,
        description: data.description?.trim() || null,
        type: data.routineType,
        recurrence,
        timeblockId: data.timeblockId ?? null,
        boardId: data.boardId,
        swimlaneId: data.swimlaneId,
        columnId: routine?.columnId || firstColumnId,
        ...(data.routineType === "event" ? { eventTime: data.eventTime || null } : {}),
        ...(data.routineType === "payment"
          ? {
              paymentAmount: data.paymentAmount ?? null,
              paymentCurrency: swimlaneCurrency || null,
              paymentType: data.paymentType,
              paymentNote: data.paymentNote || null,
            }
          : {}),
      };
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const recurrenceSummary = buildRecurrenceSummary(
    recurrenceType,
    interval,
    daysOfWeek ?? [],
    dayOfMonth,
    monthOfYear,
  );

  const TYPE_OPTIONS: { value: RoutineType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: "task",
      label: "Task",
      icon: <CheckSquare className="size-4" />,
      desc: "Creates a recurring task",
    },
    {
      value: "event",
      label: "Event",
      icon: <Calendar className="size-4" />,
      desc: "Calendar event with time",
    },
    {
      value: "payment",
      label: "Payment",
      icon: <Banknote className="size-4" />,
      desc: "Track income or expense",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-semibold">
            {routine ? "Edit Routine" : "New Routine"}
          </DialogTitle>
          {(selectedBoard || selectedSwimlane) && (
            <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <Layers className="size-3 shrink-0" />
              {selectedBoard && <span>{selectedBoard.name}</span>}
              {selectedBoard && selectedSwimlane && (
                <ChevronRight className="size-3 shrink-0" />
              )}
              {selectedSwimlane && <span>{selectedSwimlane.name}</span>}
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon, desc }) => (
              <button
                key={value}
                type="button"
                aria-label={label}
                onClick={() => setValue("routineType", value, { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all",
                  routineType === value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "transition-colors",
                    routineType === value ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {icon}
                </span>
                <span className="text-xs font-semibold leading-none">{label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
              </button>
            ))}
          </div>

          <Separator />

          {/* Basic info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Details
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="routine-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="routine-title"
                {...register("title")}
                placeholder={
                  routineType === "task"
                    ? "e.g. Morning standup"
                    : routineType === "event"
                    ? "e.g. Team sync"
                    : "e.g. Netflix subscription"
                }
                className={cn(errors.title && "border-destructive focus-visible:ring-destructive")}
                autoFocus
              />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="routine-desc">Description</Label>
              <Textarea
                id="routine-desc"
                {...register("description")}
                placeholder="Optional notes..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Event time — inline with Details */}
            {routineType === "event" && (
              <div className="space-y-1.5">
                <Label htmlFor="routine-event-time">Event time</Label>
                <Input
                  id="routine-event-time"
                  type="time"
                  {...register("eventTime")}
                />
                {errors.eventTime && (
                  <p className="text-xs text-destructive">{errors.eventTime.message}</p>
                )}
              </div>
            )}

            {/* Payment fields — inline with Details */}
            {routineType === "payment" && (
              <div className="space-y-3">
                {/* Income / Expense toggle */}
                <div className="space-y-1.5">
                  <Label>Payment type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["expense", "income"] as const).map((pt) => (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => setValue("paymentType", pt)}
                        className={cn(
                          "flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all",
                          paymentType === pt
                            ? pt === "expense"
                              ? "border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive"
                              : "border-emerald-500 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        {pt === "expense" ? (
                          <TrendingDown className="size-3.5" />
                        ) : (
                          <TrendingUp className="size-3.5" />
                        )}
                        {pt === "expense" ? "Expense" : "Income"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="routine-amount">Amount</Label>
                    <Controller
                      name="paymentAmount"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="routine-amount"
                          type="number"
                          min={0}
                          step={0.01}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || undefined)
                          }
                          placeholder="0.00"
                        />
                      )}
                    />
                    {errors.paymentAmount && (
                      <p className="text-xs text-destructive">{errors.paymentAmount.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="routine-currency">Currency</Label>
                    <Input
                      id="routine-currency"
                      value={swimlaneCurrency}
                      readOnly
                      className="bg-muted text-muted-foreground cursor-default"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="routine-payment-note">Note</Label>
                  <Input
                    id="routine-payment-note"
                    {...register("paymentNote")}
                    placeholder="e.g. Annual plan, charged Jan 1"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Schedule
            </p>

            {/* Time Block picker */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Timer className="size-3.5 text-muted-foreground" />
                <Label className="text-sm text-muted-foreground">
                  Link to Time Block <span className="font-normal">(optional)</span>
                </Label>
              </div>
              {eligibleTimeblocks.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No time blocks in this swimlane yet.{" "}
                  <a href="/timeblocks" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
                    Create one
                  </a>
                </p>
              ) : (
                <Controller
                  name="timeblockId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No time block" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No time block</SelectItem>
                        {eligibleTimeblocks.map((tb) => (
                          <SelectItem key={tb.id} value={tb.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-block size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: tb.color ?? "#3b82f6" }}
                              />
                              {tb.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {selectedTimeblock && (
                <p className="text-xs text-muted-foreground">
                  Schedule from block:{" "}
                  <span className="font-medium text-foreground">
                  {formatRecurrenceSummary(selectedTimeblock.recurrence)}
                  </span>
                </p>
              )}
            </div>

            {/* When time block is linked, replace schedule editor with info banner */}
            {timeblockId ? (
              <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/40">
                <Info className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Recurrence is controlled by the linked time block. The original schedule is preserved and will be restored if you unlink.
                </p>
              </div>
            ) : (
              <>
              <div className="space-y-1.5">
                <Label>Repeats</Label>
                <Controller
                  name="recurrenceType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // Reset type-specific fields on change
                        setValue("daysOfWeek", []);
                        setValue("dayOfMonth", undefined);
                        setValue("monthOfYear", undefined);
                        if (v !== "custom") setValue("interval", 1);
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
                  )}
                />
              </div>

            {/* Custom interval */}
            {recurrenceType === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="routine-interval">Repeat every (days)</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("interval", Math.max(1, interval - 1))}
                    className="flex size-8 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    −
                  </button>
                  <Input
                    id="routine-interval"
                    type="number"
                    min={1}
                    value={interval}
                    onChange={(e) =>
                      setValue("interval", Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-20 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setValue("interval", interval + 1)}
                    className="flex size-8 items-center justify-center rounded-md border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    +
                  </button>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
            )}

            {/* Weekly: days of week */}
            {recurrenceType === "weekly" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>On days</Label>
                  {(daysOfWeek ?? []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setValue("daysOfWeek", [])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDayOfWeek(i)}
                      title={DAY_FULL[i]}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-xs font-medium border transition-colors",
                        (daysOfWeek ?? []).includes(i)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {errors.daysOfWeek && (
                  <p className="text-xs text-destructive">{errors.daysOfWeek.message}</p>
                )}
              </div>
            )}

            {/* Monthly / Yearly: day of month */}
            {(recurrenceType === "monthly" || recurrenceType === "yearly") && (
              <div className="space-y-1.5">
                <Label htmlFor="routine-dom">Day of month</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="routine-dom"
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth ?? ""}
                    onChange={(e) =>
                      setValue(
                        "dayOfMonth",
                        e.target.value
                          ? Math.min(31, Math.max(1, parseInt(e.target.value)))
                          : undefined,
                        { shouldValidate: true },
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
                {errors.dayOfMonth && (
                  <p className="text-xs text-destructive">{errors.dayOfMonth.message}</p>
                )}
              </div>
            )}

            {/* Yearly: month */}
            {recurrenceType === "yearly" && (
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Controller
                  name="monthOfYear"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(parseInt(v) || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((name, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.monthOfYear && (
                  <p className="text-xs text-destructive">{errors.monthOfYear.message}</p>
                )}
              </div>
            )}

            {/* Recurrence summary */}
            <div className="rounded-md bg-muted/60 px-3 py-2 flex items-center gap-2">
              <span className="text-muted-foreground">
                <Calendar className="size-3.5" />
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{recurrenceSummary}</span>
                {endDate && ` · until ${endDate}`}
              </span>
            </div>

            {/* End date */}
            <div className="space-y-1.5">
              <Label htmlFor="routine-end-date" className="text-muted-foreground">
                Ends on <span className="font-normal">(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="routine-end-date"
                  type="date"
                  {...register("endDate")}
                  className="w-44"
                />
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setValue("endDate", "")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            </>
            )}
          </div>

          {/* Hidden assignment state — registered so handleSubmit sees them */}
          <input type="hidden" {...register("boardId")} />
          <input type="hidden" {...register("swimlaneId")} />
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit(handleSave)} disabled={saving} className="flex-1">
            {saving ? "Saving..." : routine ? "Save changes" : "Create routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
