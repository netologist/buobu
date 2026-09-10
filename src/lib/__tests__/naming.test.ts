import { describe, it, expect } from 'vitest';
import { DEFAULT_NAMING, NAMING_PRESETS, PRESET_OPTIONS, getPresetKey } from '../naming';
import type { NamingLabels } from '../types';

describe('DEFAULT_NAMING', () => {
  it('has expected default labels', () => {
    expect(DEFAULT_NAMING.board).toBe('Board');
    expect(DEFAULT_NAMING.boardPlural).toBe('Boards');
    expect(DEFAULT_NAMING.swimlane).toBe('Swimlane');
    expect(DEFAULT_NAMING.swimlanePlural).toBe('Swimlanes');
  });
});

describe('NAMING_PRESETS', () => {
  it('contains default, journey, goal, project presets', () => {
    expect(Object.keys(NAMING_PRESETS)).toEqual(
      expect.arrayContaining(['default', 'journey', 'goal', 'project'])
    );
  });

  it('default preset matches DEFAULT_NAMING', () => {
    expect(NAMING_PRESETS.default).toEqual(DEFAULT_NAMING);
  });

  it('journey preset has correct labels', () => {
    expect(NAMING_PRESETS.journey.board).toBe('Journey');
    expect(NAMING_PRESETS.journey.swimlane).toBe('Milestone');
  });

  it('goal preset has correct labels', () => {
    expect(NAMING_PRESETS.goal.board).toBe('Goal');
    expect(NAMING_PRESETS.goal.swimlane).toBe('Objective');
  });

  it('project preset has correct labels', () => {
    expect(NAMING_PRESETS.project.board).toBe('Project');
    expect(NAMING_PRESETS.project.swimlane).toBe('Phase');
  });

  it('every preset has all four required fields', () => {
    const requiredFields: (keyof NamingLabels)[] = ['board', 'boardPlural', 'swimlane', 'swimlanePlural'];
    for (const preset of Object.values(NAMING_PRESETS)) {
      for (const field of requiredFields) {
        expect(preset[field]).toBeTruthy();
      }
    }
  });
});

describe('PRESET_OPTIONS', () => {
  it('has an option for each preset plus custom', () => {
    const values = PRESET_OPTIONS.map((o) => o.value);
    expect(values).toContain('default');
    expect(values).toContain('journey');
    expect(values).toContain('goal');
    expect(values).toContain('project');
    expect(values).toContain('custom');
  });

  it('every option has a non-empty label', () => {
    for (const option of PRESET_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe('getPresetKey', () => {
  it('returns "default" for DEFAULT_NAMING', () => {
    expect(getPresetKey(DEFAULT_NAMING)).toBe('default');
  });

  it('returns "journey" for journey labels', () => {
    expect(getPresetKey(NAMING_PRESETS.journey)).toBe('journey');
  });

  it('returns "goal" for goal labels', () => {
    expect(getPresetKey(NAMING_PRESETS.goal)).toBe('goal');
  });

  it('returns "project" for project labels', () => {
    expect(getPresetKey(NAMING_PRESETS.project)).toBe('project');
  });

  it('returns "custom" for unrecognized labels', () => {
    const custom: NamingLabels = {
      board: 'Epic',
      boardPlural: 'Epics',
      swimlane: 'Sprint',
      swimlanePlural: 'Sprints',
    };
    expect(getPresetKey(custom)).toBe('custom');
  });

  it('returns "custom" for partial match (only board differs)', () => {
    const almostDefault: NamingLabels = {
      ...DEFAULT_NAMING,
      board: 'Different',
    };
    expect(getPresetKey(almostDefault)).toBe('custom');
  });
});
