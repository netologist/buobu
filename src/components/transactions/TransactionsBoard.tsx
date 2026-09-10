"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Swimlane, Task } from "@/lib/types";
import { getAllTasks } from "@/lib/db";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import { AppLayout } from "@/components/layout/AppLayout";
import { TransactionListItem } from "@/components/transactions/TransactionListItem";
import { TransactionsStatCard } from "@/components/transactions/TransactionsStatCard";
import { useBoardBase } from "@/hooks/useBoardBase";
import { useDbStore } from "@/stores/db-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarClock,
  Coins,
  DollarSign,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatAmountWithSymbol,
  isFutureDate,
  parseLocalDate,
  PIE_COLORS,
  type TransactionRow,
} from "./transactions-board-utils";

export function TransactionsBoard() {
  const db = useDbStore((s) => s.db);
  const [tasks, setTasks] = useState<Task[]>([]);
  const {
    boards,
    swimlanes,
    activeBoards,
    activeSwimlanes,
    labels,
    hasSelections,
    selectedSwimlaneIds,
    isAllSelected,
    isArchivedSelectionMode,
    primaryBoardId,
    putSwimlane: storePutSwimlane,
    deleteSwimlane: storeDeleteSwimlane,
    filteredItems: selectionFilteredTasks,
  } = useBoardBase<Task>({ items: tasks });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("current");


  useEffect(() => {
    let isActive = true;

    void getAllTasks().then((items) => {
      if (isActive) {
        setTasks(items);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const handleAddSwimlane = useCallback(async (boardId: string, data: Partial<Swimlane>) => {
    await storePutSwimlane({ ...data, boardId });
  }, [storePutSwimlane]);

  const handleEditSwimlane = useCallback(async (swimlane: Swimlane) => {
    await storePutSwimlane(swimlane);
  }, [storePutSwimlane]);

  const handleDeleteSwimlane = useCallback(async (swimlaneId: string) => {
    await storeDeleteSwimlane(swimlaneId);
  }, [storeDeleteSwimlane]);

  const filteredTasks = useMemo(() => {
    if (isArchivedSelectionMode) return selectionFilteredTasks.filter((task) => task.archived === true);
    return selectionFilteredTasks.filter((task) => !task.archived);
  }, [selectionFilteredTasks, isArchivedSelectionMode]);

  const allTransactionRows = useMemo(() => {
    const rows: TransactionRow[] = [];
    for (const task of filteredTasks) {
      for (const tx of task.transactions ?? []) {
        rows.push({ task, tx });
      }
    }
    return rows;
  }, [filteredTasks]);

  const currentRows = useMemo(() => {
    let rows = allTransactionRows.filter((r) => !isFutureDate(r.tx.date));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.task.title.toLowerCase().includes(q) ||
          (r.tx.note ?? "").toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => {
      const aD = parseLocalDate(a.tx.date ?? "")?.getTime() ?? 0;
      const bD = parseLocalDate(b.tx.date ?? "")?.getTime() ?? 0;
      return bD - aD;
    });
  }, [allTransactionRows, searchQuery]);

  const scheduledRows = useMemo(() => {
    let rows = allTransactionRows.filter((r) => isFutureDate(r.tx.date));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.task.title.toLowerCase().includes(q) ||
          (r.tx.note ?? "").toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => {
      const aD =
        parseLocalDate(a.tx.date ?? "")?.getTime() ??
        Number.POSITIVE_INFINITY;
      const bD =
        parseLocalDate(b.tx.date ?? "")?.getTime() ??
        Number.POSITIVE_INFINITY;
      return aD - bD;
    });
  }, [allTransactionRows, searchQuery]);

  const activeRows = activeTab === "current" ? currentRows : scheduledRows;

  const stats = useMemo(() => {
    const current = allTransactionRows.filter(
      (r) => !isFutureDate(r.tx.date)
    );
    const scheduled = allTransactionRows.filter((r) =>
      isFutureDate(r.tx.date)
    );

    const currentIncome = current
      .filter((r) => r.tx.type === "income")
      .reduce((sum, r) => sum + (Number(r.tx.amount) || 0), 0);
    const currentExpense = current
      .filter((r) => r.tx.type === "expense")
      .reduce((sum, r) => sum + (Number(r.tx.amount) || 0), 0);

    const scheduledIncome = scheduled
      .filter((r) => r.tx.type === "income")
      .reduce((sum, r) => sum + (Number(r.tx.amount) || 0), 0);
    const scheduledExpense = scheduled
      .filter((r) => r.tx.type === "expense")
      .reduce((sum, r) => sum + (Number(r.tx.amount) || 0), 0);

    return {
      currentIncome,
      currentExpense,
      currentNet: currentIncome - currentExpense,
      scheduledIncome,
      scheduledExpense,
      scheduledNet: scheduledIncome - scheduledExpense,
      totalNet: currentIncome - currentExpense + scheduledIncome - scheduledExpense,
      transactionCount: allTransactionRows.length,
    };
  }, [allTransactionRows]);

  const activeCurrency = useMemo(() => {
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
        return sw?.currency || DEFAULT_CURRENCY;
    }
    if (primaryBoardId) {
      const boardSwimlanes = swimlanes.filter((s) => s.boardId === primaryBoardId);
        return boardSwimlanes[0]?.currency || DEFAULT_CURRENCY;
    }
      return swimlanes[0]?.currency || DEFAULT_CURRENCY;
  }, [selectedSwimlaneIds, swimlanes, primaryBoardId]);

  const countsBySwimlane = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of tasks) {
      const count = (task.transactions ?? []).length;
      if (count > 0) {
        map[task.swimlaneId] = (map[task.swimlaneId] || 0) + count;
      }
    }
    return map;
  }, [tasks]);

  const totalTransactionCount = useMemo(() => {
    return filteredTasks.reduce(
      (sum, t) => sum + (t.transactions ?? []).length,
      0
    );
  }, [filteredTasks]);

  const monthlyChartData = useMemo(() => {
    const current = allTransactionRows.filter(
      (r) => !isFutureDate(r.tx.date)
    );
    const monthMap: Record<
      string,
      { month: string; income: number; expense: number }
    > = {};

    for (const r of current) {
      const d = parseLocalDate(r.tx.date ?? "");
      const key = d
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : "No date";
      if (!monthMap[key]) {
        const label = d
          ? new Intl.DateTimeFormat("en", {
              month: "short",
              year: "2-digit",
            }).format(d)
          : "No date";
        monthMap[key] = { month: label, income: 0, expense: 0 };
      }
      const amount = Number(r.tx.amount) || 0;
      if (r.tx.type === "income") monthMap[key].income += amount;
      else monthMap[key].expense += amount;
    }

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allTransactionRows]);

  const swimlaneExpenseData = useMemo(() => {
    const current = allTransactionRows.filter(
      (r) => !isFutureDate(r.tx.date) && r.tx.type === "expense"
    );
    const map: Record<string, { name: string; value: number; color: string }> =
      {};
    for (const r of current) {
      const sw = swimlanes.find((s) => s.id === r.task.swimlaneId);
      const key = r.task.swimlaneId;
      if (!map[key]) {
        map[key] = {
          name: sw?.name ?? "Unknown",
          value: 0,
          color: sw?.color ?? "#6B7280",
        };
      }
      map[key].value += Number(r.tx.amount) || 0;
    }
    return Object.values(map).filter((d) => d.value > 0);
  }, [allTransactionRows, swimlanes]);

  const topSpendingTasks = useMemo(() => {
    const taskTotals: Record<
      string,
      { title: string; total: number; swimlaneName: string }
    > = {};
    const current = allTransactionRows.filter(
      (r) => !isFutureDate(r.tx.date) && r.tx.type === "expense"
    );
    for (const r of current) {
      if (!taskTotals[r.task.id]) {
        const sw = swimlanes.find((s) => s.id === r.task.swimlaneId);
        taskTotals[r.task.id] = {
          title: r.task.title,
          total: 0,
          swimlaneName: sw?.name ?? "",
        };
      }
      taskTotals[r.task.id].total += Number(r.tx.amount) || 0;
    }
    return Object.values(taskTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allTransactionRows, swimlanes]);

  const sidebarLabel = useMemo(() => {
    if (!hasSelections || isAllSelected) return "All Transactions";
    if (selectedSwimlaneIds.size === 1) {
      const sw = swimlanes.find((s) => selectedSwimlaneIds.has(s.id));
      return sw?.name ?? "Transactions";
    }
    return `${selectedSwimlaneIds.size} ${labels.swimlanePlural}`;
  }, [hasSelections, isAllSelected, selectedSwimlaneIds, swimlanes, labels]);

  const middlePanel = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold">{sidebarLabel}</span>
        <Badge variant="outline" className="text-xs">
          {activeRows.length} items
        </Badge>
      </div>
      <div className="relative border-b px-3 py-2">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search task or note…"
          className="h-7 pl-7 text-xs"
        />
      </div>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="current" className="text-xs">
            <Coins className="mr-1 h-3 w-3" />
            Current ({currentRows.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-xs">
            <CalendarClock className="mr-1 h-3 w-3" />
            Scheduled ({scheduledRows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="current"
          className="mt-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {currentRows.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No current transactions
                </div>
              )}
              {currentRows.map((row, i) => (
                <TransactionListItem
                  key={`${row.tx.id}-${i}`}
                  row={row}
                  currency={activeCurrency}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="scheduled"
          className="mt-0 flex-1 overflow-hidden"
        >
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {scheduledRows.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No scheduled transactions
                </div>
              )}
              {scheduledRows.map((row, i) => (
                <TransactionListItem
                  key={`${row.tx.id}-${i}`}
                  row={row}
                  currency={activeCurrency}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );

  const rightPanel = (
    <ScrollArea className="h-full flex-1">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <TransactionsStatCard
            label="Current Income"
            value={formatAmountWithSymbol(
              stats.currentIncome,
              activeCurrency
            )}
            icon={
              <ArrowUpCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            }
            className="border-emerald-200 dark:border-emerald-900"
          />
          <TransactionsStatCard
            label="Current Expense"
            value={formatAmountWithSymbol(
              stats.currentExpense,
              activeCurrency
            )}
            icon={
              <ArrowDownCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
            }
            className="border-rose-200 dark:border-rose-900"
          />
          <TransactionsStatCard
            label="Net Balance"
            value={`${stats.currentNet < 0 ? "-" : ""}${formatAmountWithSymbol(Math.abs(stats.currentNet), activeCurrency)}`}
            icon={
              stats.currentNet >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              )
            }
            className={
              stats.currentNet >= 0
                ? "border-emerald-200 dark:border-emerald-900"
                : "border-rose-200 dark:border-rose-900"
            }
          />
          <TransactionsStatCard
            label="Scheduled Net"
            value={`${stats.scheduledNet < 0 ? "-" : ""}${formatAmountWithSymbol(Math.abs(stats.scheduledNet), activeCurrency)}`}
            icon={
              <CalendarClock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            }
            className="border-blue-200 dark:border-blue-900"
          />
        </div>

        {(stats.scheduledIncome > 0 || stats.scheduledExpense > 0) && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              Scheduled Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +
                  {formatAmountWithSymbol(
                    stats.scheduledIncome,
                    activeCurrency
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expense</p>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  -
                  {formatAmountWithSymbol(
                    stats.scheduledExpense,
                    activeCurrency
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Projected Total
                </p>
                <p
                  className={`text-sm font-semibold ${stats.totalNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  {stats.totalNet < 0 ? "-" : "+"}
                  {formatAmountWithSymbol(
                    Math.abs(stats.totalNet),
                    activeCurrency
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {monthlyChartData.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
              Monthly Income vs Expense
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  formatter={(value) =>
                    formatAmountWithSymbol(Number(value ?? 0), activeCurrency)
                  }
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {selectedSwimlaneIds.size === 0 &&
          swimlaneExpenseData.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                Expense by Swimlane
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={swimlaneExpenseData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={true}
                  >
                    {swimlaneExpenseData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          entry.color ??
                          PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatAmountWithSymbol(Number(value ?? 0), activeCurrency)
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

        {topSpendingTasks.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingDown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              Top Spending Tasks
            </h3>
            <div className="space-y-2">
              {topSpendingTasks.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                    {item.swimlaneName && (
                      <span className="text-[10px] text-muted-foreground">
                        {item.swimlaneName}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                    -
                    {formatAmountWithSymbol(
                      item.total,
                      activeCurrency
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {allTransactionRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Coins className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              No transactions yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Transactions are added to tasks on the Board. Once you
              add income or expense entries to your tasks, they will
              appear here with statistics and charts.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <AppLayout
      sidebarConfig={{
        boards: activeBoards,
        swimlanes: activeSwimlanes,
        allBoards: boards,
        allSwimlanes: swimlanes,
        swimlaneCounts: countsBySwimlane,
        allItemVisible: true,
        allItemLabel: "Transactions",
        allItemCount: totalTransactionCount,
        isArchivedSelectionMode,
        onAddSwimlane: handleAddSwimlane,
        onEditSwimlane: handleEditSwimlane,
        onDeleteSwimlane: handleDeleteSwimlane,
        db,
      }}
      middlePanel={middlePanel}
      rightPanel={rightPanel}
      middlePanelClassName="w-72"
    />
  );
}
