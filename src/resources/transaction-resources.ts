import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllTransactions, getTransactionById } from "../data/store.js";

/**
 * Resources are the "data" primitive in MCP.
 * They represent read-only content that can be addressed by a URI,
 * similar to GET endpoints in a REST API.
 *
 * Two flavours:
 *   - Static resource  → fixed URI,    e.g. "transactions://history"
 *   - Template resource → URI pattern, e.g. "transactions://{id}"
 *
 * The model (or the user via the client) can read resources to load context
 * before issuing tool calls. Resources are NOT meant for write operations.
 */
export function registerTransactionResources(server: McpServer): void {
  // ── transactions://history ─────────────────────────────────────────────────
  // Static resource — returns the full transaction ledger
  server.resource(
    "transaction-history",
    "transactions://history",
    { description: "Full transaction ledger, sorted newest first" },
    async (uri) => {
      const txns = getAllTransactions().sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(txns, null, 2),
          },
        ],
      };
    },
  );

  // ── transactions://{id} ────────────────────────────────────────────────────
  // Template resource — the {id} segment is extracted from the URI and passed
  // to the callback as `variables.id`
  server.resource(
    "transaction-by-id",
    new ResourceTemplate("transactions://{id}", { list: undefined }),
    { description: "Fetch a single transaction by its ID (e.g. transactions://txn_001)" },
    async (uri, variables) => {
      const id = String(variables.id);
      const txn = getTransactionById(id);
      if (!txn) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: `Transaction "${id}" not found` }),
            },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(txn, null, 2) }],
      };
    },
  );
}
