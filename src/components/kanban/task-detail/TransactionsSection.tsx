"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isFutureDate } from "@/lib/kanban/dateUtils";

import { useTaskDetailContext } from "./TaskDetailContext";

export function TransactionsSection() {
  const { model, isReadOnly, swimlaneCurrency } = useTaskDetailContext();
  const { draftTask } = model;

  if (!draftTask) {
    return null;
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Add transaction</p>
            <p className="text-xs text-muted-foreground">Track income and expenses for this task.</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {swimlaneCurrency}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Type</p>
            <Select
              value={model.transactionType}
              onValueChange={(value) => model.setTransactionType(value as "income" | "expense")}
            >
              <SelectTrigger className="mt-2 h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Amount</p>
            <Input
              className="mt-2 h-9"
              type="number"
              min="0"
              step="0.01"
              value={model.transactionAmount}
              disabled={isReadOnly}
              onChange={(event) => model.setTransactionAmount(event.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Currency: {swimlaneCurrency}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Date</p>
            <Input
              className="mt-2 h-9"
              type="date"
              value={model.transactionDate}
              disabled={isReadOnly}
              onChange={(event) => model.setTransactionDate(event.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Note</p>
          <Input
            className="mt-2 h-9"
            value={model.transactionNote}
            disabled={isReadOnly}
            onChange={(event) => model.setTransactionNote(event.target.value)}
            placeholder="Optional"
          />
        </div>
        {!isReadOnly && (
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={() => model.addTransaction() }>
              Add transaction
            </Button>
          </div>
        )}
      </Card>

      {draftTask.transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {draftTask.transactions.map((tx) => (
            <Card key={tx.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  {model.editingTransactionId === tx.id && model.editingTransactionDraft ? (
                    <>
                      <div className="grid gap-2 md:grid-cols-[140px_140px_1fr]">
                        <Select
                          value={model.editingTransactionDraft.type}
                          disabled={isReadOnly}
                          onValueChange={(value) =>
                            model.setEditingTransactionDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    type: value as "income" | "expense",
                                  }
                                : current
                            )
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={model.editingTransactionDraft.amount}
                          disabled={isReadOnly}
                          className="h-9"
                          onChange={(event) =>
                            model.setEditingTransactionDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    amount: event.target.value,
                                  }
                                : current
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              model.saveEditTransaction();
                            }
                          }}
                        />
                        <Input value={tx.currency} disabled className="h-9" />
                      </div>
                      <div className="grid gap-2 md:grid-cols-[1fr_180px]">
                        <Input
                          value={model.editingTransactionDraft.note}
                          disabled={isReadOnly}
                          placeholder="Note"
                          className="h-9"
                          onChange={(event) =>
                            model.setEditingTransactionDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    note: event.target.value,
                                  }
                                : current
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              model.saveEditTransaction();
                            }
                          }}
                        />
                        <Input
                          type="date"
                          value={model.editingTransactionDraft.date}
                          disabled={isReadOnly}
                          className="h-9"
                          onChange={(event) =>
                            model.setEditingTransactionDraft((current) =>
                              current
                                ? {
                                    ...current,
                                    date: event.target.value,
                                  }
                                : current
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              model.saveEditTransaction();
                            }
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            tx.type === "income"
                              ? "text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200"
                              : "text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200"
                          }
                        >
                          {tx.type === "income" ? "Income" : "Expense"}
                        </Badge>
                        {isFutureDate(tx.date) && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                          >
                            Scheduled
                          </Badge>
                        )}
                        <span className="text-sm font-semibold">
                          {tx.amount.toFixed(2)} {tx.currency}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">{tx.note ? tx.note : "No note"}</div>
                      {tx.date && (
                        <div
                          className={`text-xs ${
                            isFutureDate(tx.date) ? "font-medium text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                          }`}
                        >
                          {tx.date} {isFutureDate(tx.date) && "(future)"}
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {model.editingTransactionId === tx.id ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={model.saveEditTransaction}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={model.cancelEditTransaction}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => model.startEditTransaction(tx)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => model.removeTransaction(tx.id)}>
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
    </>
  );
}
