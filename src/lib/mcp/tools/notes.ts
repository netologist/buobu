import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpContext } from "../context";

export function registerNotesTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "notes_list",
    "List notes, optionally filtered by board, swimlane, or tags",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      search: z.string().optional().describe("Search in title"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
      limit: z.number().optional().default(100).describe("Max results"),
    },
    async ({ boardId, swimlaneId, search, archived, limit }) => {
      let query = ctx.supabase
        .from("notes")
        .select("id, \"boardId\", \"swimlaneId\", title, tags, pinned, archived, \"createdAt\", \"updatedAt\"")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("_modified", { ascending: false })
        .limit(limit!);

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);
      if (search) query = query.ilike("title", `%${search}%`);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "notes_get",
    "Get a single note with full content",
    { id: z.string().describe("Note ID") },
    async ({ id }) => {
      const { data, error } = await ctx.supabase
        .from("notes")
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
    "notes_create",
    "Create a new note",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      title: z.string().describe("Note title"),
      content: z.string().optional().default("").describe("Note content (HTML or plain text)"),
      tags: z.array(z.string()).optional().default([]).describe("Tags"),
      pinned: z.boolean().optional().default(false).describe("Pin the note"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const note = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        title: input.title,
        content: input.content,
        tags: input.tags ?? [],
        references: [],
        pinned: input.pinned ?? false,
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

      const { error } = await ctx.supabase.from("notes").insert(note);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "notes_update",
    "Update an existing note",
    {
      id: z.string().describe("Note ID"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content"),
      tags: z.array(z.string()).optional().describe("Replace tags"),
      pinned: z.boolean().optional().describe("Pin/unpin"),
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
        .from("notes")
        .update(patch)
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "updated" }) }] };
    }
  );

  server.tool(
    "notes_delete",
    "Soft-delete a note",
    { id: z.string().describe("Note ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("notes")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );
}
