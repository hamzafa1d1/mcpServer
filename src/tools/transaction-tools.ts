import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAllTransactions,
  getTransactionById,
  getTransactionsByAccount,
  saveTransaction,
  getAccountById,
  saveAccount,
  nextTxnId,
} from "../data/store.js";
import type { Transaction } from "../types.js";

/**
 * Tools are the "actions" primitive in MCP.
 * They let the model do things — create, update, or query data.
 * Each tool has:
 *   - a name (snake_case, used to call it)
 *   - a description (shown to the model so it knows when to use it)
 *   - a Zod schema (validates & documents input parameters)
 *   - a handler (the actual logic)
 */
export function registerTransactionTools(server: McpServer): void {
  // ── create_transaction ─────────────────────────────────────────────────────
  server.tool(
    "create_transaction",
    "Create a new payment or transfer between two accounts. Validates that the sender has enough balance and immediately processes the transaction.",
    {
      fromAccountId: z.string().describe("ID of the account sending money (e.g. acc_001)"),
      toAccountId: z.string().describe("ID of the account receiving money"),
      amount: z.number().positive().describe("Amount to transfer in the sender's currency (e.g. 99.99)"),
      type: z.enum(["payment", "transfer"]).describe("'payment' for goods/services, 'transfer' for moving funds"),
      description: z.string().max(200).describe("Human-readable reason for the transaction"),
    },
    async ({ fromAccountId, toAccountId, amount, type, description }) => {
      const sender = getAccountById(fromAccountId);
      if (!sender) {
        return {
          content: [{ type: "text", text: `Error: Account "${fromAccountId}" not found.` }],
          isError: true,
        };
      }

      const receiver = getAccountById(toAccountId);
      if (!receiver) {
        return {
          content: [{ type: "text", text: `Error: Account "${toAccountId}" not found.` }],
          isError: true,
        };
      }

      if (sender.balance < amount) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Insufficient funds. Balance is $${sender.balance.toFixed(2)}, tried to send $${amount.toFixed(2)}.`,
            },
          ],
          isError: true,
        };
      }

      const now = new Date().toISOString();
      const txn: Transaction = {
        id: nextTxnId(),
        fromAccountId,
        toAccountId,
        amount,
        currency: sender.currency,
        status: "completed",
        type,
        description,
        createdAt: now,
        updatedAt: now,
      };

      // Apply balance changes atomically
      saveAccount({ ...sender, balance: +(sender.balance - amount).toFixed(2) });
      saveAccount({ ...receiver, balance: +(receiver.balance + amount).toFixed(2) });
      saveTransaction(txn);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, transaction: txn }, null, 2) }],
      };
    },
  );

  // ── get_transaction ────────────────────────────────────────────────────────
  server.tool(
    "get_transaction",
    "Retrieve the full details of a specific transaction by its ID.",
    {
      id: z.string().describe("Transaction ID, e.g. txn_001"),
    },
    async ({ id }) => {
      const txn = getTransactionById(id);
      if (!txn) {
        return {
          content: [{ type: "text", text: `Error: Transaction "${id}" not found.` }],
          isError: true,
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(txn, null, 2) }] };
    },
  );

  // ── list_transactions ──────────────────────────────────────────────────────
  server.tool(
    "list_transactions",
    "List transactions with optional filters. All filters are combinable. Results are sorted newest first.",
    {
      accountId: z
        .string()
        .optional()
        .describe("Filter to transactions involving this account (as sender OR receiver)"),
      status: z
        .enum(["pending", "completed", "failed", "refunded"])
        .optional()
        .describe("Filter by transaction status"),
      type: z
        .enum(["payment", "transfer", "refund"])
        .optional()
        .describe("Filter by transaction type"),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum number of results to return (default 20, max 100)"),
    },
    async ({ accountId, status, type, limit }) => {
      let results = accountId ? getTransactionsByAccount(accountId) : getAllTransactions();

      if (status) results = results.filter((t) => t.status === status);
      if (type) results = results.filter((t) => t.type === type);

      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ total: results.length, transactions: results }, null, 2),
          },
        ],
      };
    },
  );

  // ── refund_transaction ─────────────────────────────────────────────────────
  server.tool(
    "refund_transaction",
    "Refund a completed transaction. Reverses the balance transfer and creates a refund record.",
    {
      id: z.string().describe("ID of the completed transaction to refund"),
      reason: z.string().max(200).optional().describe("Reason for the refund"),
    },
    async ({ id, reason }) => {
      const original = getTransactionById(id);
      if (!original) {
        return {
          content: [{ type: "text", text: `Error: Transaction "${id}" not found.` }],
          isError: true,
        };
      }

      if (original.status !== "completed") {
        return {
          content: [
            {
              type: "text",
              text: `Error: Only completed transactions can be refunded. This transaction has status: "${original.status}".`,
            },
          ],
          isError: true,
        };
      }

      // Reverse balance transfer
      const sender = getAccountById(original.fromAccountId);
      const receiver = getAccountById(original.toAccountId);
      if (sender) saveAccount({ ...sender, balance: +(sender.balance + original.amount).toFixed(2) });
      if (receiver) saveAccount({ ...receiver, balance: +(receiver.balance - original.amount).toFixed(2) });

      const now = new Date().toISOString();

      // Mark original as refunded
      saveTransaction({ ...original, status: "refunded", updatedAt: now });

      // Create a new refund transaction record for the audit trail
      const refundTxn: Transaction = {
        id: nextTxnId(),
        fromAccountId: original.toAccountId,
        toAccountId: original.fromAccountId,
        amount: original.amount,
        currency: original.currency,
        status: "completed",
        type: "refund",
        description: `Refund for ${original.id}${reason ? ` — ${reason}` : ""}`,
        createdAt: now,
        updatedAt: now,
      };
      saveTransaction(refundTxn);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, refundTransaction: refundTxn }, null, 2),
          },
        ],
      };
    },
  );
}
