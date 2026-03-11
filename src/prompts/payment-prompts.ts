import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getAllTransactions,
  getTransactionsByAccount,
  getAccountById,
} from "../data/store.js";

/**
 * Prompts are the "templates" primitive in MCP.
 * They are reusable message templates that the client surfaces in its UI
 * (e.g. as slash commands), letting the user trigger a pre-built conversation.
 *
 * A prompt handler receives arguments, builds context from live data, and
 * returns a `messages` array — essentially a ready-to-send conversation.
 *
 * Unlike tools, prompts are user-initiated, not model-initiated.
 */
export function registerPaymentPrompts(server: McpServer): void {
  // ── analyze_spending ───────────────────────────────────────────────────────
  server.prompt(
    "analyze_spending",
    "Analyze the spending and income patterns for a specific account.",
    {
      accountId: z.string().describe("Account ID to analyze, e.g. acc_001"),
    },
    async ({ accountId }) => {
      const account = getAccountById(accountId);
      if (!account) throw new Error(`Account "${accountId}" not found`);

      const txns = getTransactionsByAccount(accountId);
      const sent = txns.filter(
        (t) => t.fromAccountId === accountId && t.status === "completed",
      );
      const received = txns.filter(
        (t) => t.toAccountId === accountId && t.status === "completed",
      );
      const totalSent = sent.reduce((sum, t) => sum + t.amount, 0);
      const totalReceived = received.reduce((sum, t) => sum + t.amount, 0);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Analyze the financial activity for the following account and provide actionable insights:\n\n` +
                `**Account:** ${account.name} (${account.id})\n` +
                `**Current Balance:** ${account.currency} ${account.balance.toFixed(2)}\n` +
                `**Total Sent:** ${account.currency} ${totalSent.toFixed(2)} across ${sent.length} outgoing transactions\n` +
                `**Total Received:** ${account.currency} ${totalReceived.toFixed(2)} across ${received.length} incoming transactions\n\n` +
                `**All Transactions:**\n${JSON.stringify(txns, null, 2)}\n\n` +
                `Please provide:\n` +
                `1. A clear summary of spending vs. income\n` +
                `2. Notable trends or anomalies\n` +
                `3. Recommendations for improving financial health`,
            },
          },
        ],
      };
    },
  );

  // ── payment_report ─────────────────────────────────────────────────────────
  server.prompt(
    "payment_report",
    "Generate a high-level summary report of all payment activity across all accounts.",
    {},
    async () => {
      const txns = getAllTransactions();
      const byStatus = {
        completed: txns.filter((t) => t.status === "completed"),
        pending: txns.filter((t) => t.status === "pending"),
        failed: txns.filter((t) => t.status === "failed"),
        refunded: txns.filter((t) => t.status === "refunded"),
      };
      const totalVolume = byStatus.completed.reduce((sum, t) => sum + t.amount, 0);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Generate a concise payment activity report based on the data below:\n\n` +
                `**Total Transactions:** ${txns.length}\n` +
                `  - Completed: ${byStatus.completed.length} (volume: $${totalVolume.toFixed(2)})\n` +
                `  - Pending:   ${byStatus.pending.length}\n` +
                `  - Failed:    ${byStatus.failed.length}\n` +
                `  - Refunded:  ${byStatus.refunded.length}\n\n` +
                `**Full Transaction Data:**\n${JSON.stringify(txns, null, 2)}\n\n` +
                `Format the report with these sections: Overview, Transaction Breakdown, Notable Activity, Recommendations.`,
            },
          },
        ],
      };
    },
  );

  // ── fraud_check ────────────────────────────────────────────────────────────
  server.prompt(
    "fraud_check",
    "Analyze transactions for suspicious or potentially fraudulent activity.",
    {
      accountId: z
        .string()
        .optional()
        .describe("Scope the check to a specific account (omit to check all accounts)"),
    },
    async ({ accountId }) => {
      const txns = accountId ? getTransactionsByAccount(accountId) : getAllTransactions();

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `You are a fraud detection specialist. Analyze the following transactions for suspicious patterns:\n\n` +
                `${JSON.stringify(txns, null, 2)}\n\n` +
                `Look for:\n` +
                `1. Unusually large or round-number transactions (potential structuring)\n` +
                `2. Rapid back-to-back transfers between the same accounts\n` +
                `3. Transactions refunded immediately after completion\n` +
                `4. Accounts sending more than they receive consistently\n\n` +
                `For each finding, report: description, risk level (low/medium/high), and reasoning.`,
            },
          },
        ],
      };
    },
  );
}
