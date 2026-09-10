import type { Task } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAmountWithSymbol } from "@/lib/formatters/amountFormatter";

type TransactionRow = {
  task: Task;
  tx: NonNullable<Task["transactions"]>[number];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: TransactionRow[];
  currency: string;
  swimlaneName: string;
};

export function SwimlaneTransactionsDialog({ open, onOpenChange, rows, currency, swimlaneName }: Props) {
  const total = rows.reduce((acc, { tx }) => {
    const amount = Number(tx.amount) || 0;
    return acc + (tx.type === "income" ? amount : -amount);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Swimlane Totals</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions for this swimlane yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{swimlaneName}</span>
              <span className="text-sm font-semibold">
                {total < 0 ? "-" : ""}
                {formatAmountWithSymbol(Math.abs(total), currency)}
              </span>
            </div>

            <div className="space-y-2">
              {rows.map(({ task, tx }) => (
                <Card key={`${task.id}::${tx.id}`} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                        {tx.date ? <span>{tx.date}</span> : null}
                        {tx.note ? <span>{tx.note}</span> : null}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "income" ? "" : "-"}
                      {formatAmountWithSymbol(Number(tx.amount) || 0, tx.currency)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
