import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type McpContext, requireScope } from "../context";

export function registerBookmarksTools(server: McpServer, ctx: McpContext) {
  server.tool(
    "bookmarks_list",
    "List bookmarks, optionally filtered by board, status, or domain",
    {
      boardId: z.string().optional().describe("Filter by board ID"),
      swimlaneId: z.string().optional().describe("Filter by swimlane ID"),
      status: z
        .enum(["unread", "reading", "important", "archived", "favorite"])
        .optional()
        .describe("Filter by status"),
      domain: z.string().optional().describe("Filter by domain"),
      search: z.string().optional().describe("Search in title"),
      archived: z.boolean().optional().default(false).describe("Include archived"),
      limit: z.number().optional().default(100).describe("Max results"),
    },
    async ({ boardId, swimlaneId, status, domain, search, archived, limit }) => {
      requireScope(ctx, "read");
      let query = ctx.supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", ctx.userId)
        .eq("_deleted", false)
        .order("_modified", { ascending: false })
        .limit(limit!);

      if (!archived) query = query.eq("archived", false);
      if (boardId) query = query.eq("boardId", boardId);
      if (swimlaneId) query = query.eq("swimlaneId", swimlaneId);
      if (status) query = query.eq("status", status);
      if (domain) query = query.eq("domain", domain);
      if (search) query = query.ilike("title", `%${search}%`);

      const { data, error } = await query;
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "bookmarks_create",
    "Create a new bookmark",
    {
      boardId: z.string().describe("Board ID"),
      swimlaneId: z.string().describe("Swimlane ID"),
      url: z.string().url().describe("Bookmark URL"),
      title: z.string().optional().describe("Title (auto-fetched if omitted)"),
      description: z.string().optional().default("").describe("Description"),
      tags: z.array(z.string()).optional().default([]).describe("Tags"),
      status: z
        .enum(["unread", "reading", "important", "favorite"])
        .optional()
        .default("unread")
        .describe("Initial status"),
    },
    async (input) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { nanoid } = await import("nanoid");
      const now = new Date().toISOString();
      const id = nanoid();

      const urlObj = new URL(input.url);
      const domain = urlObj.hostname;
      const urlNormalized = urlObj.href.replace(/\/+$/, "").toLowerCase();

      const bookmark = {
        id,
        user_id: ctx.userId,
        boardId: input.boardId,
        swimlaneId: input.swimlaneId,
        url: input.url,
        urlNormalized,
        domain,
        title: input.title ?? input.url,
        description: input.description,
        tags: input.tags ?? [],
        comments: [],
        links: [],
        status: input.status ?? "unread",
        rating: null,
        pinned: false,
        archived: false,
        archivedAt: null,
        metadataFetchStatus: "pending",
        metadataLastFetchedAt: null,
        isBroken: false,
        previewImage: null,
        favicon: null,
        siteName: null,
        createdAt: now,
        updatedAt: now,
        _version: 1,
        _createdAt: now,
        _updatedAt: now,
        _deleted: false,
        _deviceId: "mcp",
        _modified: Date.now(),
      };

      const { error } = await ctx.supabase.from("bookmarks").insert(bookmark);
      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "created" }) }] };
    }
  );

  server.tool(
    "bookmarks_delete",
    "Soft-delete a bookmark",
    { id: z.string().describe("Bookmark ID") },
    async ({ id }) => {
      const { requireScope } = await import("../context");
      requireScope(ctx, "write");

      const { error } = await ctx.supabase
        .from("bookmarks")
        .update({ _deleted: true, _modified: Date.now() })
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "deleted" }) }] };
    }
  );

  server.tool(
    "bookmarks_update",
    "Update a bookmark",
    {
      id: z.string().describe("Bookmark ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      status: z
        .enum(["unread", "reading", "important", "archived", "favorite"])
        .optional()
        .describe("New status"),
      rating: z.number().min(0).max(5).optional().describe("Rating (0-5)"),
      tags: z.array(z.string()).optional().describe("Replace tags"),
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
        .from("bookmarks")
        .update(patch)
        .eq("id", id)
        .eq("user_id", ctx.userId);

      if (error) return { content: [{ type: "text" as const, text: `Error: ${error.message}` }], isError: true };
      return { content: [{ type: "text" as const, text: JSON.stringify({ id, status: "updated" }) }] };
    }
  );
}
