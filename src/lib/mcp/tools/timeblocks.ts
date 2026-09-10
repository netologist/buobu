import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "../context";

const recurrenceSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]).describe("Recurrence type"),
  interval: z.number().min(1).default(1).describe("Repeat every N units"),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional().describe("Days of week (0=Sun … 6=Sat), used for weekly"),
  dayOfMonth: z.number().min(1).max(31).optional().describe("Day of month, used for monthly/yearly"),
  monthOfYear: z.number().min(1).max(12).optional().describe("Month of year, used for yearly"),
  endDate: z.string().optional().describe("Recurrence end date (YYYY-MM-DD)"),
});

export function registerTimeblocksTools(server: McpServer, ctx: McpContext) {
  // ─── LIST ────────────────────────────────────────────────────────────────────
  server.tool(
    "timeblocks_list",
    "List time blocks, optionally filtered by board, swimlane, or archived status",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      archived: z.boolean().optional().default(false).describe("Include archived time blocks"),
    },
    async ({ boardId, swimlaneId, archived }) => {
      let query = ctx.supabase
        .from("timeblocks")
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

  // ─── GET ─────────────────────────────────────────────────────────────────────
  server.tool(
    "timeblocks_get",
    "Get a single time block by ID",
    { id: z.string().describe("Time block ID") },
    async ({ id }) => {
      const { data, error } = await ctx.supabase
        .from("timeblocks")
        .select("*")
        .eq("id", id)
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .single();

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  server.tool(
    "timeblocks_create",
    "Create a new time block",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      title: z.string().describe("Time block title"),
      description: z.string().optional().describe("Optional description"),
      color: z.string().optional().describe("Color hex (e.g. #3b82f6)"),
      startTime: z.string().describe("Start time in HH:MM 24h format"),
      endTime: z.string().describe("End time in HH:MM 24h format"),
      recurrence: recurrenceSchema.describe("Recurrence rule"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const timeblock = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        title: input.title,
        description: input.description ?? null,
        color: input.color ?? "#3b82f6",
        startTime: input.startTime,
        endTime: input.endTime,
        recurrence: input.recurrence,
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

      const { error } = await ctx.supabase.from("timeblocks").insert(timeblock);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  // ─── UPDATE ──────────────────────────────────────────────────────────────────
  server.tool(
    "timeblocks_update",
    "Update an existing time block",
    {
      id: z.string().describe("Time block ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      color: z.string().optional().describe("New color hex"),
      startTime: z.string().optional().describe("New start time (HH:MM)"),
      endTime: z.string().optional().describe("New end time (HH:MM)"),
      recurrence: recurrenceSchema.optional().describe("New recurrence rule"),
      boardId: z.string().optional().describe("Move to board"),
      swimlaneId: z.string().optional().describe("Move to swimlane"),
    },
    async ({ id, ...updates }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();
      const patch = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(patch).length === 0) {
        return { content: [{ type: "text" as const, text: "No fields to update" }], isError: true };
      }

      const { error } = await ctx.supabase
        .from("timeblocks")
        .update({ ...patch, updatedAt: now, _updatedAt: now, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "updated" }) }] };
    }
  );

  // ─── ARCHIVE / UNARCHIVE ─────────────────────────────────────────────────────
  server.tool(
    "timeblocks_archive",
    "Archive or unarchive a time block",
    {
      id: z.string().describe("Time block ID"),
      archived: z.boolean().describe("true to archive, false to unarchive"),
    },
    async ({ id, archived }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();

      const { error } = await ctx.supabase
        .from("timeblocks")
        .update({
          archived,
          archivedAt: archived ? now : null,
          updatedAt: now,
          _updatedAt: now,
          _modified: Date.now(),
        })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: archived ? "archived" : "unarchived" }) }] };
    }
  );

  // ─── DELETE ──────────────────────────────────────────────────────────────────
  server.tool(
    "timeblocks_delete",
    "Permanently delete a time block (soft-delete via _deleted flag)",
    { id: z.string().describe("Time block ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const now = new Date().toISOString();

      const { error } = await ctx.supabase
        .from("timeblocks")
        .update({ _deleted: true, _modified: Date.now(), _updatedAt: now, updatedAt: now })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );

  // ─── LINKED HABITS & ROUTINES ────────────────────────────────────────────────
  server.tool(
    "timeblocks_linked_items",
    "Get habits and routines linked to a time block",
    { id: z.string().describe("Time block ID") },
    async ({ id }) => {
      const [habitsResult, routinesResult] = await Promise.all([
        ctx.supabase
          .from("habits")
          .select("id, title, archived")
          .eq("user_id", ctx.userId)
          .eq("timeblockId", id)
          .eq("_deleted", false),
        ctx.supabase
          .from("routines")
          .select("id, title, archived")
          .eq("user_id", ctx.userId)
          .eq("timeblockId", id)
          .eq("_deleted", false),
      ]);

      if (habitsResult.error) return { content: [{ type: "text" as const, text: `Error: ${habitsResult.error.message}` }], isError: true };
      if (routinesResult.error) return { content: [{ type: "text" as const, text: `Error: ${routinesResult.error.message}` }], isError: true };

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ habits: habitsResult.data, routines: routinesResult.data }, null, 2),
        }],
      };
    }
  );
}
