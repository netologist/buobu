import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type McpContext, requireScope } from "../context";

export function registerAnalyticsTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "analytics_habit_streaks",
    "Calculate habit streaks — current and longest — for all or a specific habit",
    {
      habitId: z.string().optional().describe("Specific habit ID (all if omitted)"),
    },
    async ({ habitId }) => {
      requireScope(ctx, "read");
      // Fetch habits
      let habitsQuery = ctx.supabase
        .from("habits")
        .select("id, title, \"frequencyDays\", \"breakHabit\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .eq("archived", false);
      if (habitId) habitsQuery = habitsQuery.eq("id", habitId);

      const { data: habits, error: hErr } = await habitsQuery;
      if (hErr) return { content: [{ type: "text" as const, text: `Error: ${hErr.message}` }], isError: true };

      // Fetch logs
      let logsQuery = ctx.supabase
        .from("habit_logs")
        .select("\"habitId\", date, value")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("date", { ascending: true });
      if (habitId) logsQuery = logsQuery.eq("habitId", habitId);

      const { data: logs, error: lErr } = await logsQuery;
      if (lErr) return { content: [{ type: "text" as const, text: `Error: ${lErr.message}` }], isError: true };

      const logsByHabit = new Map<string, string[]>();
      for (const log of logs ?? []) {
        const hId = (log as Record<string, unknown>).habitId as string;
        const arr = logsByHabit.get(hId) ?? [];
        arr.push((log as Record<string, unknown>).date as string);
        logsByHabit.set(hId, arr);
      }

      const results = (habits ?? []).map((habit: Record<string, unknown>) => {
        const dates = logsByHabit.get(habit.id as string) ?? [];
        const uniqueDates = [...new Set(dates)].sort();
        const { current, longest } = computeStreaks(uniqueDates);
        return {
          habitId: habit.id,
          title: habit.title,
          currentStreak: current,
          longestStreak: longest,
          totalLogs: uniqueDates.length,
        };
      });

      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "analytics_task_velocity",
    "Task velocity: completed vs created per week for the last N weeks",
    {
      weeks: z.number().optional().default(8).describe("Number of weeks to analyze"),
      boardId: z.string().optional().describe("Filter by board ID"),
    },
    async ({ weeks, boardId }) => {
      requireScope(ctx, "read");
      const numWeeks = weeks ?? 8;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - numWeeks * 7);
      const startStr = startDate.toISOString().slice(0, 10);

      let createdQuery = ctx.supabase
        .from("tasks")
        .select("id, \"createdAt\", \"completedAt\", \"boardId\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .gte("createdAt", startStr);
      if (boardId) createdQuery = createdQuery.eq("boardId", boardId);

      const { data: tasks, error } = await createdQuery;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      const weekBuckets: Record<string, { created: number; completed: number }> = {};
      for (const task of tasks ?? []) {
        const t = task as Record<string, unknown>;
        const createdWeek = getISOWeek(t.createdAt as string);
        if (!weekBuckets[createdWeek]) weekBuckets[createdWeek] = { created: 0, completed: 0 };
        weekBuckets[createdWeek].created++;

        if (t.completedAt) {
          const completedWeek = getISOWeek(t.completedAt as string);
          if (!weekBuckets[completedWeek]) weekBuckets[completedWeek] = { created: 0, completed: 0 };
          weekBuckets[completedWeek].completed++;
        }
      }

      const sorted = Object.entries(weekBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, data]) => ({ week, ...data }));

      return { content: [{ type: "text" as const, text: JSON.stringify(sorted, null, 2) }] };
    }
  );

  server.tool(
    "analytics_routine_completion",
    "Routine completion rate over the last N days",
    {
      days: z.number().optional().default(30).describe("Number of days to analyze"),
      routineId: z.string().optional().describe("Filter by routine ID"),
    },
    async ({ days, routineId }) => {
      requireScope(ctx, "read");
      const numDays = days ?? 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - numDays);
      const startStr = startDate.toISOString().slice(0, 10);

      let logsQuery = ctx.supabase
        .from("routine_logs")
        .select("\"routineId\", date, status")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .gte("date", startStr);
      if (routineId) logsQuery = logsQuery.eq("routineId", routineId);

      const { data: logs, error } = await logsQuery;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      const byRoutine = new Map<string, { approved: number; skipped: number; auto: number }>();
      for (const log of logs ?? []) {
        const l = log as Record<string, unknown>;
        const rId = l.routineId as string;
        const entry = byRoutine.get(rId) ?? { approved: 0, skipped: 0, auto: 0 };
        if (l.status === "approved") entry.approved++;
        else if (l.status === "skipped") entry.skipped++;
        else entry.auto++;
        byRoutine.set(rId, entry);
      }

      const results = Array.from(byRoutine.entries()).map(([rId, counts]) => {
        const total = counts.approved + counts.skipped + counts.auto;
        return {
          routineId: rId,
          total,
          approved: counts.approved,
          skipped: counts.skipped,
          autoProcessed: counts.auto,
          completionRate: total > 0 ? Math.round(((counts.approved + counts.auto) / total) * 100) : 0,
        };
      });

      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  );

  server.tool(
    "analytics_spending_summary",
    "Spending summary from task transactions, grouped by type and optionally by month",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format, expected YYYY-MM-DD").optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format, expected YYYY-MM-DD").optional().describe("End date (YYYY-MM-DD)"),
    },
    async ({ boardId, startDate, endDate }) => {
      requireScope(ctx, "read");
      let query = ctx.supabase
        .from("tasks")
        .select("transactions, \"boardId\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false);
      if (boardId) query = query.eq("boardId", boardId);

      const { data: tasks, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      let totalIncome = 0;
      let totalExpense = 0;
      const byCurrency: Record<string, { income: number; expense: number }> = {};
      const byMonth: Record<string, { income: number; expense: number }> = {};

      for (const task of tasks ?? []) {
        const txns = ((task as Record<string, unknown>).transactions as Array<Record<string, unknown>>) ?? [];
        for (const txn of txns) {
          if (startDate && txn.date && (txn.date as string) < startDate) continue;
          if (endDate && txn.date && (txn.date as string) > endDate) continue;

          const amount = (txn.amount as number) ?? 0;
          const currency = (txn.currency as string) ?? "TRY";
          const type = txn.type as string;

          if (!byCurrency[currency]) byCurrency[currency] = { income: 0, expense: 0 };
          if (type === "income") {
            totalIncome += amount;
            byCurrency[currency].income += amount;
          } else {
            totalExpense += amount;
            byCurrency[currency].expense += amount;
          }

          if (txn.date) {
            const month = (txn.date as string).slice(0, 7);
            if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
            if (type === "income") byMonth[month].income += amount;
            else byMonth[month].expense += amount;
          }
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ totalIncome, totalExpense, net: totalIncome - totalExpense, byCurrency, byMonth }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "analytics_daily_summary",
    "Get a daily summary: tasks due today, habits to complete, routines pending",
    {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD").optional().describe("Date (YYYY-MM-DD), defaults to today"),
    },
    async ({ date }) => {
      requireScope(ctx, "read");
      const targetDate = date ?? new Date().toISOString().slice(0, 10);
      const dayOfWeek = new Date(targetDate).getDay();

      // Tasks due today
      const { data: tasks } = await ctx.supabase
        .from("tasks")
        .select("id, title, \"columnId\", priority, \"boardId\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .eq("archived", false)
        .or(`date.eq.${targetDate},deadline.eq.${targetDate}`);

      // Habits active today
      const { data: habits } = await ctx.supabase
        .from("habits")
        .select("id, title, \"frequencyDays\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .eq("archived", false);

      const todayHabits = (habits ?? []).filter((h: Record<string, unknown>) => {
        const freq = h.frequencyDays as number[] | null;
        return !freq || freq.length === 0 || freq.includes(dayOfWeek);
      });

      // Check which habits are logged today
      const habitIds = todayHabits.map((h: Record<string, unknown>) => h.id as string);
      const { data: habitLogs } = await ctx.supabase
        .from("habit_logs")
        .select("\"habitId\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .eq("date", targetDate)
        .in("habitId", habitIds.length > 0 ? habitIds : ["__none__"]);

      const loggedSet = new Set((habitLogs ?? []).map((l: Record<string, unknown>) => l.habitId as string));

      // Routines due today
      const { data: routines } = await ctx.supabase
        .from("routines")
        .select("id, title, type, \"nextDueDate\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .eq("archived", false)
        .lte("nextDueDate", targetDate);

      const summary = {
        date: targetDate,
        tasks: {
          count: (tasks ?? []).length,
          items: (tasks ?? []).map((t: Record<string, unknown>) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
          })),
        },
        habits: {
          total: todayHabits.length,
          completed: loggedSet.size,
          remaining: todayHabits.length - loggedSet.size,
          items: todayHabits.map((h: Record<string, unknown>) => ({
            id: h.id,
            title: h.title,
            done: loggedSet.has(h.id as string),
          })),
        },
        routines: {
          pending: (routines ?? []).length,
          items: (routines ?? []).map((r: Record<string, unknown>) => ({
            id: r.id,
            title: r.title,
            type: r.type,
          })),
        },
      };

      return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
    }
  );
}

// ── Helpers ──

function computeStreaks(sortedDates: string[]): { current: number; longest: number } {
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  let current = 1;
  let longest = 1;
  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    if (diffDays === 1) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 1;
    }
  }

  // Check if current streak is still active (last log was today or yesterday)
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffFromToday = Math.round((today.getTime() - lastDate.getTime()) / 86400000);
  current = diffFromToday <= 1 ? streak : 0;

  return { current, longest };
}

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}
