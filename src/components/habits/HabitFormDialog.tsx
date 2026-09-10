import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timer, Info } from "lucide-react";
import { useActiveTimeblocks } from "@/stores/hooks/use-timeblocks";
import { recurrenceSummary } from "@/lib/timeblocks/formatters";

const DAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const ALL_DAYS = DAY_OPTIONS.map((d) => d.value);

type HabitFormValues = {
  title: string;
  isBreak: boolean;
  archived: boolean;
  days: number[];
  timeblockId?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialValues?: Partial<HabitFormValues>;
  weekStartDay?: number;
  /** swimlaneId of the habit — used to filter timeblocks to the same swimlane */
  swimlaneId?: string;
  onSave: (values: HabitFormValues) => void;
  onDelete?: () => void;
};

export function HabitFormDialog({ open, onOpenChange, mode, initialValues, weekStartDay = 1, swimlaneId, onSave, onDelete }: Props) {
  const dialogKey = [
    mode,
    initialValues?.title ?? "",
    initialValues?.days?.join(",") ?? "all",
    initialValues?.isBreak ? "break" : "habit",
    initialValues?.archived ? "archived" : "active",
    initialValues?.timeblockId ?? "none",
  ].join(":");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <HabitFormDialogContent
          key={dialogKey}
          onOpenChange={onOpenChange}
          mode={mode}
          initialValues={initialValues}
          weekStartDay={weekStartDay}
          swimlaneId={swimlaneId}
          onSave={onSave}
          onDelete={onDelete}
          open={open}
        />
      ) : null}
    </Dialog>
  );
}

function HabitFormDialogContent({ onOpenChange, mode, initialValues, weekStartDay = 1, swimlaneId, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [isBreak, setIsBreak] = useState(initialValues?.isBreak ?? false);
  const [archived, setArchived] = useState(initialValues?.archived ?? false);
  const [days, setDays] = useState<number[]>(initialValues?.days ?? ALL_DAYS);
  const [timeblockId, setTimeblockId] = useState<string | null>(initialValues?.timeblockId ?? null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const allTimeblocks = useActiveTimeblocks();
  // Filter to the same swimlane if provided; fall back to all active timeblocks
  const eligibleTimeblocks = swimlaneId
    ? allTimeblocks.filter((tb) => tb.swimlaneId === swimlaneId)
    : allTimeblocks;

  const selectedTimeblock = eligibleTimeblocks.find((tb) => tb.id === timeblockId) ?? null;
  const orderedDayOptions = Array.from({ length: 7 }, (_, i) => {
    const dayValue = (weekStartDay + i) % 7;
    return DAY_OPTIONS.find((d) => d.value === dayValue)!;
  });

  useEffect(() => {
    if (mode !== "add") return;
    const timer = window.setTimeout(() => { inputRef.current?.focus(); }, 0);
    return () => { window.clearTimeout(timer); };
  }, [mode]);

  function handleClose() { onOpenChange(false); }

  function handleSubmit() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), isBreak, archived, days, timeblockId });
  }

  function toggleDay(value: number) {
    setDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  const dialogTitle = mode === "add" ? "Add Habit" : "Edit Habit";

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="text-lg uppercase tracking-[0.1em] text-emerald-600">
          {dialogTitle}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Habit
          </label>
          <Input
            ref={inputRef}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); handleSubmit(); }
              if (event.key === "Escape") { event.preventDefault(); handleClose(); }
            }}
            placeholder="Type habit name"
            className="h-10 border-emerald-400 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          {mode === "add" && (
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-emerald-600"
              aria-expanded="true"
            >
              <span className="inline-block h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-emerald-600" />
              Advanced options
            </button>
          )}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isBreak}
              onCheckedChange={(value) => setIsBreak(Boolean(value))}
              className="mt-1 border-emerald-500 data-[state=checked]:bg-emerald-600"
            />
            <div>
              <div className="text-sm font-medium">Break habit</div>
              <p className="text-xs text-muted-foreground">The colourful scale will be descending.</p>
            </div>
          </div>
        </div>

        {/* Time Block picker */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2">
            <Timer className="size-3.5 text-muted-foreground" />
            <Label className="text-sm font-semibold text-muted-foreground">
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
            <Select
              value={timeblockId ?? "none"}
              onValueChange={(v) => setTimeblockId(v === "none" ? null : v)}
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
          {selectedTimeblock && (
            <p className="text-xs text-muted-foreground">
              Schedule from block: <span className="font-medium text-foreground">{recurrenceSummary(selectedTimeblock.recurrence)}</span>
            </p>
          )}
        </div>

        {/* Frequency — hidden when a time block is linked */}
        {!timeblockId ? (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-600">Frequency</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={days.length === orderedDayOptions.length}
                  onCheckedChange={(value) => setDays(value ? ALL_DAYS : [])}
                />
                Every day!
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {orderedDayOptions.map((day) => {
                const active = days.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-muted text-muted-foreground"
                    }`}
                  >
                    {day.label}
                    <span className={`h-2 w-full rounded ${active ? "bg-emerald-500" : "bg-muted"}`} />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              The app will automatically skip the days you specify.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900 dark:bg-blue-950/40">
            <Info className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Frequency is controlled by the linked time block. The original frequency is preserved and will be restored if you unlink.
            </p>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={archived}
              onCheckedChange={(value) => setArchived(Boolean(value))}
            />
            <div>
              <div className="text-sm font-medium">Archived</div>
              <p className="text-xs text-muted-foreground">
                Archive your habits to pause them or to keep your data safely away from the board :)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {mode === "edit" && onDelete && (
              <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!title.trim()}
            onClick={handleSubmit}
          >
            {mode === "add" ? "Save Habit" : "Save Changes"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
