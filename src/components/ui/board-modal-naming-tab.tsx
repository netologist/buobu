import { Save, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRESET_OPTIONS } from "@/lib/naming";
import type { NamingLabels } from "@/lib/types";

type BoardModalNamingTabProps = {
  displayLabels: NamingLabels;
  currentNamingPreset: string;
  currentNamingLabels: NamingLabels;
  namingPreviewLabels: NamingLabels;
  isEditMode: boolean;
  isNamingSaving: boolean;
  onNamingPresetChange: (value: string) => void;
  onCustomNamingChange: (field: keyof NamingLabels, value: string) => void;
  onSaveCustomNaming: () => void;
};

export function BoardModalNamingTab({
  displayLabels,
  currentNamingPreset,
  currentNamingLabels,
  namingPreviewLabels,
  isEditMode,
  isNamingSaving,
  onNamingPresetChange,
  onCustomNamingChange,
  onSaveCustomNaming,
}: BoardModalNamingTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Naming Strategy
        </CardTitle>
        <CardDescription>
          Customize how {displayLabels.boardPlural.toLowerCase()} and {" "}
          {displayLabels.swimlanePlural.toLowerCase()} appear throughout the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="namingPreset">Preset</Label>
          <Select value={currentNamingPreset} onValueChange={onNamingPresetChange}>
            <SelectTrigger id="namingPreset">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentNamingPreset === "custom" && (
          <div className="space-y-4">
            <Separator />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Custom Labels
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="namingBoard">Board (singular)</Label>
                <Input
                  id="namingBoard"
                  value={currentNamingLabels.board}
                  onChange={(event) => onCustomNamingChange("board", event.target.value)}
                  placeholder="e.g., Journey"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="namingBoardPlural">Board (plural)</Label>
                <Input
                  id="namingBoardPlural"
                  value={currentNamingLabels.boardPlural}
                  onChange={(event) => onCustomNamingChange("boardPlural", event.target.value)}
                  placeholder="e.g., Journeys"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="namingSwimlane">Swimlane (singular)</Label>
                <Input
                  id="namingSwimlane"
                  value={currentNamingLabels.swimlane}
                  onChange={(event) => onCustomNamingChange("swimlane", event.target.value)}
                  placeholder="e.g., Milestone"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="namingSwimlanePlural">Swimlane (plural)</Label>
                <Input
                  id="namingSwimlanePlural"
                  value={currentNamingLabels.swimlanePlural}
                  onChange={(event) => onCustomNamingChange("swimlanePlural", event.target.value)}
                  placeholder="e.g., Milestones"
                />
              </div>
            </div>
            {isEditMode && (
              <Button onClick={onSaveCustomNaming} disabled={isNamingSaving} size="sm" variant="secondary">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isNamingSaving ? "Saving…" : "Save Labels"}
              </Button>
            )}
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Preview
          </p>
          <p>
            <span className="text-muted-foreground">Board / Swimlane: </span>
            <strong>{namingPreviewLabels.board}</strong>
            {" / "}
            <strong>{namingPreviewLabels.swimlane}</strong>
          </p>
          <p className="text-muted-foreground text-xs">
            &ldquo;3 {namingPreviewLabels.swimlanePlural} in this {namingPreviewLabels.board}&rdquo;
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
