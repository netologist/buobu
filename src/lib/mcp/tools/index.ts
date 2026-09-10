import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpContext } from "../context";
import { registerTasksTools } from "./tasks";
import { registerHabitsTools } from "./habits";
import { registerRoutinesTools } from "./routines";
import { registerNotesTools } from "./notes";
import { registerBookmarksTools } from "./bookmarks";
import { registerMindmapsTools } from "./mindmaps";
import { registerBoardsTools } from "./boards";
import { registerAnalyticsTools } from "./analytics";
import { registerTimeblocksTools } from "./timeblocks";

export function registerAllTools(server: McpServer, ctx: McpContext) {
  registerTasksTools(server, ctx);
  registerHabitsTools(server, ctx);
  registerRoutinesTools(server, ctx);
  registerNotesTools(server, ctx);
  registerBookmarksTools(server, ctx);
  registerMindmapsTools(server, ctx);
  registerBoardsTools(server, ctx);
  registerAnalyticsTools(server, ctx);
  registerTimeblocksTools(server, ctx);
}
