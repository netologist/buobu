import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type McpContext, requireScope } from "../context";

export function registerTasksTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "tasks_list",
    "List tasks, optionally filtered by board, swimlane, status, priority, or date range",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      columnId: z.string().optional().describe("Filter by column ID"),
      priority: z
        .enum(["low", "medium", "high"])
        .optional()
        .describe("Filter by priority"),
      dueBefore: z
        .string()
        .optional()
        .describe("Filter tasks with deadline before this date (YYYY-MM-DD)"),
      archived: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include archived tasks"),
      limit: z.number().optional().default(100).describe("Max results"),
    },
    async ({ boardId, swimlaneId, columnId, priority, dueBefore, archived, limit }) => {
      requireScope(ctx, "read");
      let query = ctx.supabase
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("_modified", { ascending: false })
        .limit(limit!);

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);
      if (columnId) query = query.eq("columnId", columnId);
      if (priority) query = query.eq("priority", priority);
      if (dueBefore) query = query.lte("deadline", dueBefore);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );

  server.tool(
    "tasks_get",
    "Get a single task by ID",
    { id: z.string().describe("Task ID") },
    async ({ id }) => {
      requireScope(ctx, "read");
      const { data, error } = await ctx.supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "tasks_create",
    "Create a new task",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      columnId: z.string().describe("Column ID"),
      title: z.string().describe("Task title"),
      description: z.string().optional().default("").describe("Task description"),
      labels: z.array(z.string()).optional().default([]).describe("Labels"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Priority"),
      date: z.string().optional().describe("Scheduled date (YYYY-MM-DD)"),
      deadline: z.string().optional().describe("Deadline (YYYY-MM-DD)"),
      time: z.string().optional().describe("Time (HH:MM)"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();
      const { nanoid } = await import("nanoid");
      const id = nanoid();

      const task = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        columnId: input.columnId,
        title: input.title,
        description: input.description,
        labels: input.labels ?? [],
        comments: [],
        checklists: [],
        transactions: [],
        worklogs: [],
        priority: input.priority ?? null,
        date: input.date ?? null,
        deadline: input.deadline ?? null,
        time: input.time ?? null,
        archived: false,
        archivedAt: null,
        completedAt: null,
        routineId: null,
        order: 0,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase.from("tasks").insert(task);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "tasks_update",
    "Update an existing task",
    {
      id: z.string().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      columnId: z.string().optional().describe("Move to column"),
      labels: z.array(z.string()).optional().describe("Replace labels"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Set priority"),
      date: z.string().optional().describe("Scheduled date"),
      deadline: z.string().optional().describe("Deadline"),
      time: z.string().optional().describe("Time (HH:MM)"),
      archived: z.boolean().optional().describe("Archive/unarchive"),
    },
    async ({ id, ...updates }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();
      const patch: Record<string, unknown> = { ...updates, updatedAt: now, _updatedAt: now, _modified: Date.now() };
      if (updates.archived === true) patch.archivedAt = now;
      if (updates.archived === false) patch.archivedAt = null;

      const { error } = await ctx.supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "updated" }) }] };
    }
  );

  server.tool(
    "tasks_delete",
    "Soft-delete a task",
    { id: z.string().describe("Task ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("tasks")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );

  server.tool(
    "tasks_move",
    "Move a task to a different column, swimlane, or board",
    {
      id: z.string().describe("Task ID"),
      boardId: z.string().optional().describe("Target board ID"),
      swimlaneId: z.string().optional().describe("Target swimlane ID"),
      columnId: z.string().optional().describe("Target column ID"),
    },
    async ({ id, ...target }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const patch: Record<string, unknown> = {
        ...target,
        updatedAt: new Date().toISOString(),
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "moved" }) }] };
    }
  );
}
