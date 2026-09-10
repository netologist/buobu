import type { NamingLabels } from "./types";

export const DEFAULT_NAMING: NamingLabels = {
  board: "Board",
  boardPlural: "Boards",
  swimlane: "Swimlane",
  swimlanePlural: "Swimlanes",
};

export const NAMING_PRESETS: Record<string, NamingLabels> = {
  default: DEFAULT_NAMING,
  journey: {
    board: "Journey",
    boardPlural: "Journeys",
    swimlane: "Milestone",
    swimlanePlural: "Milestones",
  },
  goal: {
    board: "Goal",
    boardPlural: "Goals",
    swimlane: "Objective",
    swimlanePlural: "Objectives",
  },
  project: {
    board: "Project",
    boardPlural: "Projects",
    swimlane: "Phase",
    swimlanePlural: "Phases",
  },
};

export const PRESET_OPTIONS = [
  { value: "default", label: "Board / Swimlane" },
  { value: "journey", label: "Journey / Milestone" },
  { value: "goal", label: "Goal / Objective" },
  { value: "project", label: "Project / Phase" },
  { value: "custom", label: "Custom" },
];

export function getPresetKey(labels: NamingLabels): string {
  for (const [key, preset] of Object.entries(NAMING_PRESETS)) {
    if (
      preset.board === labels.board &&
      preset.boardPlural === labels.boardPlural &&
      preset.swimlane === labels.swimlane &&
      preset.swimlanePlural === labels.swimlanePlural
    ) {
      return key;
    }
  }
  return "custom";
}
