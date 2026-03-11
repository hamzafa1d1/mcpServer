import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAllAccounts, getAccountById } from "../data/store.js";

export function registerAccountResources(server: McpServer): void {
  // ── accounts://list ────────────────────────────────────────────────────────
  server.resource(
    "accounts-list",
    "accounts://list",
    { description: "All accounts with their current balances" },
    async (uri) => {
      const accs = getAllAccounts();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(accs, null, 2),
          },
        ],
      };
    },
  );

  // ── accounts://{id} ────────────────────────────────────────────────────────
  server.resource(
    "account-by-id",
    new ResourceTemplate("accounts://{id}", { list: undefined }),
    { description: "Fetch a single account by its ID (e.g. accounts://acc_001)" },
    async (uri, variables) => {
      const id = String(variables.id);
      const account = getAccountById(id);
      if (!account) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: `Account "${id}" not found` }),
            },
          ],
        };
      }
      return {
        contents: [
          { uri: uri.href, mimeType: "application/json", text: JSON.stringify(account, null, 2) },
        ],
      };
    },
  );
}
