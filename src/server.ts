import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTransactionTools } from "./tools/transaction-tools.js";
import { registerAccountTools } from "./tools/account-tools.js";
import { registerTransactionResources } from "./resources/transaction-resources.js";
import { registerAccountResources } from "./resources/account-resources.js";
import { registerPaymentPrompts } from "./prompts/payment-prompts.js";

/**
 * Builds and returns the fully configured MCP server.
 *
 * An MCP server exposes three types of primitives to connected clients:
 *
 *  ┌─────────────┬──────────────────────────────────────────────────────────┐
 *  │  Primitive  │  Purpose                                                 │
 *  ├─────────────┼──────────────────────────────────────────────────────────┤
 *  │  Tools      │  Actions the MODEL can call (read/write, side-effects)   │
 *  │  Resources  │  Data the CLIENT can read (read-only, URI-addressed)     │
 *  │  Prompts    │  Templates the USER can invoke (pre-built conversations) │
 *  └─────────────┴──────────────────────────────────────────────────────────┘
 *
 * Keeping registration logic in separate files per domain (transactions,
 * accounts) makes the server easy to extend — just add a new register*()
 * call here.
 */
export function buildServer(): McpServer {
  const server = new McpServer({
    name: "payment-mcp-server",
    version: "0.1.0",
  });

  // Tools — model-invokable actions
  registerTransactionTools(server);
  registerAccountTools(server);

  // Resources — URI-addressed read-only data
  registerTransactionResources(server);
  registerAccountResources(server);

  // Prompts — user-invokable conversation templates
  registerPaymentPrompts(server);

  return server;
}
