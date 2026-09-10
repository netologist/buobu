import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "../context";

export function registerMindmapsTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "mindmaps_list",
    "List mindmaps",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
    },
    async ({ boardId, swimlaneId, archived }) => {
      let query = ctx.supabase
        .from("mindmaps")
        .select("id, \"boardId\", \"swimlaneId\", title, archived, \"createdAt\", \"updatedAt\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("_modified", { ascending: false });

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "mindmaps_get",
    "Get a mindmap with all nodes",
    { id: z.string().describe("Mindmap ID") },
    async ({ id }) => {
      const { data, error } = await ctx.supabase
        .from("mindmaps")
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
    "mindmaps_create",
    "Create a new mindmap",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      title: z.string().describe("Mindmap title"),
      nodes: z
        .array(
          z.object({
            id: z.string(),
            parentId: z.string().nullable(),
            label: z.string(),
            color: z.string().default("#3b82f6"),
            x: z.number().default(0),
            y: z.number().default(0),
            order: z.number().default(0),
            collapsed: z.boolean().optional(),
            direction: z.enum(["right", "left", "up", "down"]).optional(),
          })
        )
        .optional()
        .default([])
        .describe("Initial nodes"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const mindmap = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        title: input.title,
        nodes: input.nodes ?? [],
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

      const { error } = await ctx.supabase.from("mindmaps").insert(mindmap);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "mindmaps_update",
    "Update a mindmap (title or nodes)",
    {
      id: z.string().describe("Mindmap ID"),
      title: z.string().optional().describe("New title"),
      nodes: z
        .array(
          z.object({
            id: z.string(),
            parentId: z.string().nullable(),
            label: z.string(),
            color: z.string(),
            x: z.number(),
            y: z.number(),
            order: z.number(),
            collapsed: z.boolean().optional(),
            direction: z.enum(["right", "left", "up", "down"]).optional(),
          })
        )
        .optional()
        .describe("Replace all nodes"),
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
        .from("mindmaps")
        .update(patch)
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "updated" }) }] };
    }
  );

  server.tool(
    "mindmaps_delete",
    "Soft-delete a mindmap",
    { id: z.string().describe("Mindmap ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("mindmaps")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );

  // ── Whiteboards (vision_items) ──

  server.tool(
    "whiteboards_list",
    "List whiteboards (vision board items)",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
    },
    async ({ boardId, swimlaneId, archived }) => {
      let query = ctx.supabase
        .from("vision_items")
        .select("id, \"boardId\", \"swimlaneId\", title, archived, \"createdAt\", \"updatedAt\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("_modified", { ascending: false });

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "whiteboards_get",
    "Get a whiteboard with excalidraw data",
    { id: z.string().describe("Whiteboard ID") },
    async ({ id }) => {
      const { data, error } = await ctx.supabase
        .from("vision_items")
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
    "whiteboards_create",
    "Create a new whiteboard",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      title: z.string().describe("Whiteboard title"),
      content: z.string().optional().describe("Text content"),
      excalidrawData: z.string().optional().describe("Excalidraw JSON string"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const item = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        title: input.title,
        content: input.content ?? null,
        excalidrawData: input.excalidrawData ?? null,
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

      const { error } = await ctx.supabase.from("vision_items").insert(item);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "whiteboards_delete",
    "Soft-delete a whiteboard",
    { id: z.string().describe("Whiteboard ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("vision_items")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );
}
