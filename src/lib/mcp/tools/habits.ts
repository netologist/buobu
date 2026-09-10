import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "../context";

export function registerHabitsTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "habits_list",
    "List habits, optionally filtered by board or swimlane",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
    },
    async ({ boardId, swimlaneId, archived }) => {
      let query = ctx.supabase
        .from("habits")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("order", { ascending: true });

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "habits_logs",
    "Get habit logs for a date range",
    {
      habitId: z.string().optional().describe("Filter by habit ID"),
      startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
      limit: z.number().optional().default(500).describe("Max results"),
    },
    async ({ habitId, startDate, endDate, limit }) => {
      let query = ctx.supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("date", { ascending: false })
        .limit(limit!);

      if (habitId) query = query.eq("habitId", habitId);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "habits_create",
    "Create a new habit",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      title: z.string().describe("Habit title"),
      color: z.string().optional().describe("Color hex"),
      frequencyDays: z
        .array(z.number().min(0).max(6))
        .optional()
        .describe("Days of week (0=Sun, 6=Sat)"),
      breakHabit: z.boolean().optional().default(false).describe("Is this a break habit?"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const habit = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        title: input.title,
        color: input.color ?? null,
        frequencyDays: input.frequencyDays ?? [],
        breakHabit: input.breakHabit ?? false,
        order: 0,
        archived: false,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase.from("habits").insert(habit);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "habits_log",
    "Log a habit completion for a date",
    {
      habitId: z.string().describe("Habit ID"),
      date: z.string().describe("Date (YYYY-MM-DD)"),
      value: z.number().optional().default(1).describe("Log value (default 1)"),
    },
    async ({ habitId, date, value }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const log = {
        id,
        user_id: ctx.userId,
        habitId,
        date,
        value: value ?? 1,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase.from("habit_logs").insert(log);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "logged" }) }] };
    }
  );

  server.tool(
    "habits_unlog",
    "Remove a habit log for a specific date",
    {
      habitId: z.string().describe("Habit ID"),
      date: z.string().describe("Date (YYYY-MM-DD)"),
    },
    async ({ habitId, date }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("habit_logs")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("habitId", habitId)
        .eq("date", date)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ status: "unlogged" }) }] };
    }
  );
}
