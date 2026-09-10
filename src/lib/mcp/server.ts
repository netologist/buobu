import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools";
import type { McpContext } from "./context";

/**
 * Creates an MCP server instance with all tools registered for the given user context.
 * A new server is created per request since context (userId, scopes) varies.
 */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer({
    name: "buobu",
    version: "1.0.0",
  });

  registerAllTools(server, ctx);

  return server;
}
