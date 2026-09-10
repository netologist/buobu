"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { putSwimlane } from "@/lib/db";
import { SwimlaneListItem } from "@/components/ui/swimlane-list-item";
import type { NamingLabels, Swimlane } from "@/lib/types";

export interface SwimlanesTabContentProps {
  boardId: string | null;
  swimlanes: Swimlane[];
  labels: NamingLabels;
  onSwimlanesChange: (swimlanes: Swimlane[]) => void;
  onEditSwimlane: (swimlane: Swimlane) => void;
  onNewSwimlane: () => void;
}

export function SwimlanesTabContent({
  swimlanes,
  labels,
  onSwimlanesChange,
  onEditSwimlane,
  onNewSwimlane,
}: SwimlanesTabContentProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    async (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = swimlanes.findIndex((s) => s.id === active.id);
      const newIndex = swimlanes.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(swimlanes, oldIndex, newIndex).map((s, idx) => ({
        ...s,
        order: idx,
      }));
      onSwimlanesChange(reordered);
      for (const swimlane of reordered) {
        await putSwimlane({ id: swimlane.id, order: swimlane.order });
      }
    },
    [swimlanes, onSwimlanesChange],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{labels.swimlanePlural}</CardTitle>
            <CardDescription>Drag to reorder · click a row to edit</CardDescription>
          </div>
          <Button size="sm" onClick={onNewSwimlane}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New {labels.swimlane}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {swimlanes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No {labels.swimlanePlural.toLowerCase()} yet. Add one to get started.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={swimlanes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {swimlanes.map((swimlane) => (
                  <SwimlaneListItem
                    key={swimlane.id}
                    swimlane={swimlane}
                    onEdit={onEditSwimlane}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
