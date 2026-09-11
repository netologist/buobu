import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type McpContext, requireScope } from "../context";

export function registerBoardsTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "boards_list",
    "List all boards",
    {
      archived: z.boolean().optional().default(false).describe("Include archived boards"),
    },
    async ({ archived }) => {
      requireScope(ctx, "read");
      let query = ctx.supabase
        .from("boards")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("order", { ascending: true });

      if (!archived) query = query.eq("archived", false);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "boards_get",
    "Get a single board with columns",
    { id: z.string().describe("Board ID") },
    async ({ id }) => {
      requireScope(ctx, "read");
      const { data, error } = await ctx.supabase
        .from("boards")
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
    "swimlanes_list",
    "List swimlanes, optionally filtered by board",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
    },
    async ({ boardId, archived }) => {
      requireScope(ctx, "read");
      let query = ctx.supabase
        .from("swimlanes")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("order", { ascending: true });

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "swimlanes_create",
    "Create a new swimlane on a board",
    {
      boardId: z.string().describe("Board ID"),
      name: z.string().describe("Swimlane name"),
      label: z.string().optional().describe("Short label badge"),
      currency: z.string().optional().default("USD").describe("Currency code (e.g. USD, TRY, EUR)"),
      color: z.string().optional().default("#6366f1").describe("Hex color code"),
      description: z.string().optional().default("").describe("Description"),
      order: z.number().optional().describe("Display order"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const swimlane = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        name: input.name,
        label: input.label ?? null,
        currency: input.currency ?? "USD",
        color: input.color ?? "#6366f1",
        durationHours: null,
        pomodoroMinutes: 25,
        breakMinutes: 5,
        deadline: null,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
        archived: false,
        archivedAt: null,
        order: input.order ?? 0,
        description: input.description ?? "",
      };

      const { error } = await ctx.supabase.from("swimlanes").insert(swimlane);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "swimlanes_move_to_board",
    "Move a swimlane and all its resources (tasks, habits, routines, notes, bookmarks, mindmaps, vision board items) to a different board. Column IDs of tasks and routines are remapped to the target board's first column (or archive column for archived items).",
    {
      swimlaneId: z.string().describe("ID of the swimlane to move"),
      targetBoardId: z.string().describe("ID of the destination board"),
    },
    async ({ swimlaneId, targetBoardId }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();
      const meta = { updatedAt: now, _updatedAt: now, _modified: Date.now() };

      // 1. Fetch swimlane (ownership check)
      const { data: swimlane, error: swErr } = await ctx.supabase
        .from("swimlanes")
        .select("id, boardId")
        .eq("id", swimlaneId)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .single();
      if (swErr || !swimlane) {
        return { content: [{ type: "text" as const, text: `Error: swimlane not found` }], isError: true };
      }
      if (swimlane.boardId === targetBoardId) {
        return { content: [{ type: "text" as const, text: `Error: swimlane is already on target board` }], isError: true };
      }

      // 2. Fetch target board columns
      const { data: targetBoard, error: tbErr } = await ctx.supabase
        .from("boards")
        .select("id, columns, archiveColumnId")
        .eq("id", targetBoardId)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .single();
      if (tbErr || !targetBoard) {
        return { content: [{ type: "text" as const, text: `Error: target board not found` }], isError: true };
      }

      // 3. Fetch source board archive column ID for mapping
      const { data: sourceBoard } = await ctx.supabase
        .from("boards")
        .select("archiveColumnId")
        .eq("id", swimlane.boardId)
        .eq("user_id", ctx.userId)
        .single();

      const columns: Array<{ id: string }> = targetBoard.columns ?? [];
      const targetFirstColId: string | undefined = columns[0]?.id;
      const targetArchiveColId: string = (targetBoard.archiveColumnId as string | undefined) ?? targetFirstColId ?? "";
      const sourceArchiveColId: string | undefined = sourceBoard?.archiveColumnId;

      const mapColumnId = (colId: string | undefined): string | undefined => {
        if (!colId || !targetFirstColId) return colId;
        if (colId === sourceArchiveColId) return targetArchiveColId;
        return targetFirstColId;
      };

      // 4. Move swimlane itself
      const { error: swMoveErr } = await ctx.supabase
        .from("swimlanes")
        .update({ boardId: targetBoardId, ...meta })
        .eq("id", swimlaneId)
        .eq("user_id", ctx.userId);
      if (swMoveErr) return { content: [{ type: "text" as const, text: `Error updating swimlane: ${swMoveErr.message}` }], isError: true };

      // 5. Fetch tasks and update boardId + columnId
      const { data: tasks } = await ctx.supabase
        .from("tasks")
        .select("id, columnId")
        .eq("swimlaneId", swimlaneId)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false);

      for (const task of tasks ?? []) {
        await ctx.supabase
          .from("tasks")
          .update({ boardId: targetBoardId, columnId: mapColumnId(task.columnId) ?? task.columnId, ...meta })
          .eq("id", task.id)
          .eq("user_id", ctx.userId);
      }

      // 6. Update routines boardId + columnId
      const { data: routines } = await ctx.supabase
        .from("routines")
        .select("id, columnId")
        .eq("swimlaneId", swimlaneId)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false);

      for (const routine of routines ?? []) {
        await ctx.supabase
          .from("routines")
          .update({ boardId: targetBoardId, columnId: mapColumnId(routine.columnId) ?? routine.columnId, ...meta })
          .eq("id", routine.id)
          .eq("user_id", ctx.userId);
      }

      // 7. Update flat resources (only boardId changes)
      const flatTables = ["habits", "notes", "bookmarks", "mindmaps", "visionItems"] as const;
      for (const table of flatTables) {
        await ctx.supabase
          .from(table)
          .update({ boardId: targetBoardId, ...meta })
          .eq("swimlaneId", swimlaneId)
          .eq("user_id", ctx.userId)
          .eq("_deleted", false);
      }

      // 8. Summary
      const summary = {
        swimlaneId,
        targetBoardId,
        movedTasks: (tasks ?? []).length,
        movedRoutines: (routines ?? []).length,
        status: "moved",
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    "transactions_list",
    "List task transactions (income/expense), optionally filtered by task or date range",
    {
      taskId: z.string().optional().describe("Filter by task ID"),
      boardId: z.string().optional().describe("Filter by board ID"),
      startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
      limit: z.number().optional().default(500).describe("Max results"),
    },
    async ({ taskId, boardId, startDate, endDate, limit }) => {
      // Transactions are embedded in tasks as JSONB, so we query tasks and extract
      let query = ctx.supabase
        .from("tasks")
        .select("id, title, \"boardId\", \"swimlaneId\", transactions")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .limit(limit!);

      if (taskId) query = query.eq("id", taskId);
      if (boardId) query = query.eq("boardId", boardId);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };

      // Flatten transactions from tasks and optionally filter by date
      const transactions = (data ?? []).flatMap((task: Record<string, unknown>) => {
        const txns = (task.transactions as Array<Record<string, unknown>>) ?? [];
        return txns
          .filter((t) => {
            if (startDate && t.date && (t.date as string) < startDate) return false;
            if (endDate && t.date && (t.date as string) > endDate) return false;
            return true;
          })
          .map((t) => ({
            ...t,
            taskId: task.id,
            taskTitle: task.title,
            boardId: task.boardId,
            swimlaneId: task.swimlaneId,
          }));
      });

      return { content: [{ type: "text" as const, text: JSON.stringify(transactions, null, 2) }] };
    }
  );
}
