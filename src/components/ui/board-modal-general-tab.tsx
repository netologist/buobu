import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NamingLabels } from "@/lib/types";
import type { BoardFormValues } from "@/lib/validation/boardForm";

type BoardModalGeneralTabProps = {
  displayLabels: NamingLabels;
  isEditMode: boolean;
  control: Control<BoardFormValues>;
  register: UseFormRegister<BoardFormValues>;
  errors: FieldErrors<BoardFormValues>;
};

export function BoardModalGeneralTab({
  displayLabels,
  isEditMode,
  control,
  register,
  errors,
}: BoardModalGeneralTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{displayLabels.board} Settings</CardTitle>
        <CardDescription>
          Name and calendar configuration for this {displayLabels.board.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="board-name">{displayLabels.board} Name</Label>
          <Input
            id="board-name"
            placeholder="e.g., Product Roadmap"
            autoFocus={!isEditMode}
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="board-description">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="board-description"
            placeholder="e.g., Track quarterly OKRs and team milestones"
            rows={2}
            {...register("description")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="weekStart">Week Starts On</Label>
          <Controller
            name="weekStart"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="weekStart">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
