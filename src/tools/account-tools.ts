import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAllAccounts, getAccountById, saveAccount, nextAccId } from "../data/store.js";
import type { Account } from "../types.js";

export function registerAccountTools(server: McpServer): void {
  // ── list_accounts ──────────────────────────────────────────────────────────
  server.tool(
    "list_accounts",
    "List all accounts in the system with their current balances.",
    {},
    async () => {
      const accs = getAllAccounts();
      return {
        content: [
          { type: "text", text: JSON.stringify({ total: accs.length, accounts: accs }, null, 2) },
        ],
      };
    },
  );

  // ── get_account ────────────────────────────────────────────────────────────
  server.tool(
    "get_account",
    "Get the full details of an account by its ID, including its current balance.",
    {
      id: z.string().describe("Account ID, e.g. acc_001"),
    },
    async ({ id }) => {
      const account = getAccountById(id);
      if (!account) {
        return {
          content: [{ type: "text", text: `Error: Account "${id}" not found.` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(account, null, 2) }] };
    },
  );

  // ── get_account_balance ────────────────────────────────────────────────────
  server.tool(
    "get_account_balance",
    "Get just the current balance of an account — a lightweight alternative to get_account.",
    {
      id: z.string().describe("Account ID"),
    },
    async ({ id }) => {
      const account = getAccountById(id);
      if (!account) {
        return {
          content: [{ type: "text", text: `Error: Account "${id}" not found.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: `${account.name}\nBalance: ${account.currency} ${account.balance.toFixed(2)}`,
          },
        ],
      };
    },
  );

  // ── create_account ─────────────────────────────────────────────────────────
  server.tool(
    "create_account",
    "Create a new account with an optional initial balance.",
    {
      name: z.string().min(1).max(100).describe("Full name or company name"),
      email: z.string().email().describe("Contact email address"),
      initialBalance: z
        .number()
        .min(0)
        .optional()
        .default(0)
        .describe("Starting balance (defaults to 0)"),
      currency: z
        .string()
        .length(3)
        .optional()
        .default("USD")
        .describe("ISO 4217 currency code (defaults to USD)"),
    },
    async ({ name, email, initialBalance, currency }) => {
      const account: Account = {
        id: nextAccId(),
        name,
        email,
        balance: initialBalance ?? 0,
        currency: currency ?? "USD",
        createdAt: new Date().toISOString(),
      };
      saveAccount(account);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, account }, null, 2) }],
      };
    },
  );

  // ── deposit_funds ──────────────────────────────────────────────────────────
  server.tool(
    "deposit_funds",
    "Add funds to an account — simulates an external top-up or initial funding.",
    {
      accountId: z.string().describe("Account ID to deposit into"),
      amount: z.number().positive().describe("Amount to deposit"),
    },
    async ({ accountId, amount }) => {
      const account = getAccountById(accountId);
      if (!account) {
        return {
          content: [{ type: "text", text: `Error: Account "${accountId}" not found.` }],
          isError: true,
        };
      }
      const updated: Account = {
        ...account,
        balance: +(account.balance + amount).toFixed(2),
      };
      saveAccount(updated);
      return {
        content: [
          {
            type: "text",
            text:
              `Deposited ${account.currency} ${amount.toFixed(2)} into ${account.name}'s account.\n` +
              `New balance: ${account.currency} ${updated.balance.toFixed(2)}`,
          },
        ],
      };
    },
  );
}
