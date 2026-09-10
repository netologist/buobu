"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { useTaskDetailContext } from "./TaskDetailContext";

export function ChecklistSection() {
  const { model, isReadOnly } = useTaskDetailContext();
  const { draftTask } = model;

  if (!draftTask) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Checklists</p>
          <p className="text-xs text-muted-foreground">Break down tasks into clear steps.</p>
        </div>
        {!isReadOnly && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Input
              placeholder="New checklist title"
              value={model.checklistTitleInput}
              onChange={(event) => model.setChecklistTitleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  model.addChecklist();
                }
              }}
              className="h-9"
            />
            <Button type="button" onClick={() => model.addChecklist()}>
              Add list
            </Button>
          </div>
        )}
      </div>

      {draftTask.checklists.length === 0 && (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No checklists yet.
        </div>
      )}

      <div className="space-y-4">
        {draftTask.checklists.map((list) => {
          const collapsed = model.collapsedChecklists[list.id] ?? false;
          const doneCount = list.items.filter((item) => item.done).length;
          return (
            <Card key={list.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {model.editingChecklistId === list.id ? (
                    <Input
                      value={model.editingChecklistTitle}
                      disabled={isReadOnly}
                      className="h-9 px-3 text-sm font-semibold"
                      onChange={(event) => model.setEditingChecklistTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          model.saveEditChecklistTitle();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{list.title}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {doneCount}/{list.items.length} done
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => model.toggleChecklistVisibility(list.id)}>
                    {collapsed ? "Show" : "Hide"}
                  </Button>
                  {!isReadOnly &&
                    (model.editingChecklistId === list.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={model.saveEditChecklistTitle}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={model.cancelEditChecklistTitle}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => model.removeChecklist(list.id)}>
                        Remove
                      </Button>
                    ))}
                </div>
              </div>

              {!collapsed && (
                <>
                  <div className="mt-3 space-y-2">
                    {list.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.done}
                            disabled={isReadOnly}
                            onCheckedChange={(value) => model.toggleChecklistItem(list.id, item.id, Boolean(value))}
                          />
                          {model.editingChecklistItem &&
                          model.editingChecklistItem.checklistId === list.id &&
                          model.editingChecklistItem.itemId === item.id ? (
                            <Input
                              value={model.editingChecklistItemText}
                              disabled={isReadOnly}
                              className={`h-8 px-2 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}
                              onChange={(event) => model.setEditingChecklistItemText(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  model.saveEditChecklistItem();
                                }
                              }}
                            />
                          ) : (
                            <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
                              {item.text}
                            </span>
                          )}
                        </div>
                        {!isReadOnly && (
                          <div className="flex items-center gap-1">
                            {model.editingChecklistItem &&
                            model.editingChecklistItem.checklistId === list.id &&
                            model.editingChecklistItem.itemId === item.id ? (
                              <>
                                <Button variant="ghost" size="sm" onClick={model.saveEditChecklistItem}>
                                  Save
                                </Button>
                                <Button variant="ghost" size="sm" onClick={model.cancelEditChecklistItem}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => model.startEditChecklistItem(list.id, item.id, item.text)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => model.removeChecklistItem(list.id, item.id)}
                                >
                                  Remove
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!isReadOnly && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Add checklist item"
                        value={model.checklistItemInputs[list.id] ?? ""}
                        onChange={(event) =>
                          model.setChecklistItemInputs((prev) => ({
                            ...prev,
                            [list.id]: event.target.value,
                          }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            model.addChecklistItem(list.id);
                          }
                        }}
                        className="h-9"
                      />
                      <Button type="button" onClick={() => model.addChecklistItem(list.id)}>
                        Add item
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
