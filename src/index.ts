import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

/**
 * Entry point — connects the MCP server to a transport and starts listening.
 *
 * Transport is the communication channel between the server and the client.
 * The SDK ships with two built-in transports:
 *
 *   StdioServerTransport  — reads JSON-RPC messages from stdin, writes to
 *                           stdout. Used by Claude Desktop and most CLI hosts.
 *                           This is the standard for local servers.
 *
 *   SSEServerTransport    — HTTP server using Server-Sent Events. Used when
 *                           you need a remotely accessible server (over a
 *                           network, in a container, etc.).
 *
 * We use stdio here because it requires zero network setup and is the de-facto
 * standard for local MCP development.
 *
 * IMPORTANT: Once on stdio transport, ALL console output must go to stderr.
 *            Writing anything to stdout corrupts the JSON-RPC message stream.
 */
async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("[payment-mcp-server] Server started — listening on stdio");
}

main().catch((err) => {
  console.error("[payment-mcp-server] Fatal error:", err);
  process.exit(1);
});
