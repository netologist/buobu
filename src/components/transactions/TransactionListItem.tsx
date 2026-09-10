import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import {
  formatAmountWithSymbol,
  formatDate,
  type TransactionRow,
} from "./transactions-board-utils";

type TransactionListItemProps = {
  row: TransactionRow;
  currency: string;
};

export function TransactionListItem({
  row,
  currency,
}: TransactionListItemProps) {
  const isIncome = row.tx.type === "income";
  const amount = Number(row.tx.amount) || 0;

  return (
    <div className="flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors hover:bg-muted/50">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {isIncome ? (
            <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <ArrowDownCircle className="h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
          )}
          <span className="truncate text-sm font-medium">{row.task.title}</span>
        </div>
        <span
          className={`shrink-0 text-sm font-semibold ${
            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isIncome ? "+" : "-"}
          {formatAmountWithSymbol(amount, row.tx.currency || currency)}
        </span>
      </div>
      <div className="flex items-center gap-2 pl-5">
        <span className="text-[10px] text-muted-foreground">{formatDate(row.tx.date)}</span>
        {row.tx.note && (
          <span className="truncate text-[10px] text-muted-foreground">{row.tx.note}</span>
        )}
        <Badge
          variant="outline"
          className="ml-auto rounded-full px-1.5 py-0 text-[9px]"
        >
          {isIncome ? "income" : "expense"}
        </Badge>
      </div>
    </div>
  );
}
