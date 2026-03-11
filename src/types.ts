// ─────────────────────────────────────────────────────────────────────────────
// Shared domain types for the payment MCP server
// ─────────────────────────────────────────────────────────────────────────────

export type TransactionStatus = "pending" | "completed" | "failed" | "refunded";
export type TransactionType = "payment" | "transfer" | "refund";

export interface Transaction {
  id: string;              // e.g. "txn_001"
  fromAccountId: string;
  toAccountId: string;
  amount: number;          // in the account's currency, e.g. 99.99
  currency: string;        // ISO 4217, e.g. "USD"
  status: TransactionStatus;
  type: TransactionType;
  description: string;
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

export interface Account {
  id: string;              // e.g. "acc_001"
  name: string;
  email: string;
  balance: number;         // current balance in the account's currency
  currency: string;        // ISO 4217
  createdAt: string;       // ISO 8601
}
