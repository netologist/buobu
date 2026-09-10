"use client";

import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { useTaskDetailContext } from "./TaskDetailContext";

export function WorklogSection() {
  const { model, isReadOnly } = useTaskDetailContext();
  const { draftTask } = model;

  if (!draftTask) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Worklog</p>
      {draftTask.worklogs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pomodoros logged yet.</p>
      ) : (
        <div className="space-y-2">
          {draftTask.worklogs.map((log) => (
            <Card key={log.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Timer className="h-3.5 w-3.5" />
                    <span>{log.durationMinutes} min</span>
                    {log.breakMinutes ? (
                      <span className="text-xs text-muted-foreground">+{log.breakMinutes} min break</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">Started {log.startedAt}</p>
                  <p className="text-xs text-muted-foreground">Ended {log.endedAt}</p>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => model.removeWorklog(log.id)}>
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
