"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { useTaskDetailContext } from "./TaskDetailContext";

export function CommentsSection() {
  const { model, isReadOnly } = useTaskDetailContext();
  const { draftTask } = model;

  if (!draftTask) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Comments</p>
          <p className="text-xs text-muted-foreground">Keep the conversation with context.</p>
        </div>
      </div>

      {!isReadOnly && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              You
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={model.commentInput}
                onChange={(event) => model.setCommentInput(event.target.value)}
                className="min-h-22.5"
              />
              <div className="flex justify-end">
                <Button type="button" onClick={() => model.addComment()}>
                  Add comment
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {draftTask.comments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </div>
      ) : (
        <div className="space-y-3">
          {draftTask.comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    You
                  </div>
                  <div className="space-y-2">
                    {model.editingCommentId === comment.id ? (
                      <Textarea
                        value={model.editingCommentText}
                        disabled={isReadOnly}
                        className="min-h-20 resize-none text-sm"
                        onChange={(event) => model.setEditingCommentText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            model.saveEditComment();
                          }
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{comment.text}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{comment.createdAt}</p>
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {model.editingCommentId === comment.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={model.saveEditComment}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={model.cancelEditComment}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => model.startEditComment(comment.id, comment.text)}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => model.removeComment(comment.id)}>
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
