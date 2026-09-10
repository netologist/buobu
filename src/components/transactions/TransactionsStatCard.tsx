import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type TransactionsStatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  className?: string;
};

export function TransactionsStatCard({
  label,
  value,
  icon,
  className,
}: TransactionsStatCardProps) {
  return (
    <Card className={`flex flex-col gap-1 p-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <span className="text-lg font-bold tracking-tight">{value}</span>
    </Card>
  );
}
