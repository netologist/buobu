import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "../context";

export function registerRoutinesTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "routines_list",
    "List routines, optionally filtered by board or type",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      type: z
        .enum(["task", "event", "payment"])
        .optional()
        .describe("Filter by routine type"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
    },
    async ({ boardId, swimlaneId, type, archived }) => {
      let query = ctx.supabase
        .from("routines")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("nextDueDate", { ascending: true });

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);
      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "routines_logs",
    "Get routine execution logs",
    {
      routineId: z.string().optional().describe("Filter by routine ID"),
      startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
      limit: z.number().optional().default(200).describe("Max results"),
    },
    async ({ routineId, startDate, endDate, limit }) => {
      let query = ctx.supabase
        .from("routine_logs")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("date", { ascending: false })
        .limit(limit!);

      if (routineId) query = query.eq("routineId", routineId);
      if (startDate) query = query.gte("date", startDate);
      if (endDate) query = query.lte("date", endDate);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "routines_create",
    "Create a new routine",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      columnId: z.string().describe("Column ID for generated tasks"),
      title: z.string().describe("Routine title"),
      description: z.string().optional().describe("Description"),
      type: z.enum(["task", "event", "payment"]).describe("Routine type"),
      recurrence: z
        .object({
          type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
          interval: z.number().min(1),
          daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
          dayOfMonth: z.number().min(1).max(31).optional(),
          monthOfYear: z.number().min(1).max(12).optional(),
          endDate: z.string().optional(),
        })
        .describe("Recurrence rule"),
      eventTime: z.string().optional().describe("Event time (HH:MM)"),
      paymentAmount: z.number().optional().describe("Payment amount"),
      paymentCurrency: z.string().optional().describe("Payment currency"),
      paymentType: z.enum(["income", "expense"]).optional().describe("Payment type"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const routine = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        recurrence: input.recurrence,
        eventTime: input.eventTime ?? null,
        paymentAmount: input.paymentAmount ?? null,
        paymentCurrency: input.paymentCurrency ?? null,
        paymentType: input.paymentType ?? null,
        paymentNote: null,
        lastGeneratedAt: null,
        nextDueDate: null,
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

      const { error } = await ctx.supabase.from("routines").insert(routine);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "routines_run_now",
    "Log a routine execution (approve/skip)",
    {
      routineId: z.string().describe("Routine ID"),
      date: z.string().describe("Date (YYYY-MM-DD)"),
      status: z
        .enum(["approved", "skipped"])
        .describe("Execution status"),
      taskId: z.string().optional().describe("Associated task ID if approved"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const log = {
        id,
        user_id: ctx.userId,
        routineId: input.routineId,
        date: input.date,
        status: input.status,
        taskId: input.taskId ?? null,
        createdAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase.from("routine_logs").insert(log);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "logged" }) }] };
    }
  );
}
