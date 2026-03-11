import type { Transaction, Account } from "../types.js";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory stores — simulates a database (no persistence between restarts)
// ─────────────────────────────────────────────────────────────────────────────

const accounts = new Map<string, Account>();
const transactions = new Map<string, Transaction>();

let txnCounter = 5;
let accCounter = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Seed data — gives us something to query from the start
// ─────────────────────────────────────────────────────────────────────────────

const SEED_ACCOUNTS: Account[] = [
  {
    id: "acc_001",
    name: "Alice Johnson",
    email: "alice@example.com",
    balance: 4500.0,
    currency: "USD",
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "acc_002",
    name: "Bob Smith",
    email: "bob@example.com",
    balance: 2250.0,
    currency: "USD",
    createdAt: "2025-01-15T09:00:00Z",
  },
  {
    id: "acc_003",
    name: "Carol White",
    email: "carol@example.com",
    balance: 8200.0,
    currency: "USD",
    createdAt: "2025-01-20T10:00:00Z",
  },
  {
    id: "acc_004",
    name: "ACME Corp",
    email: "billing@acme.com",
    balance: 49250.0,
    currency: "USD",
    createdAt: "2024-12-01T00:00:00Z",
  },
];

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: "txn_001",
    fromAccountId: "acc_001",
    toAccountId: "acc_004",
    amount: 250.0,
    currency: "USD",
    status: "completed",
    type: "payment",
    description: "Monthly SaaS subscription",
    createdAt: "2025-03-01T10:00:00Z",
    updatedAt: "2025-03-01T10:00:05Z",
  },
  {
    id: "txn_002",
    fromAccountId: "acc_002",
    toAccountId: "acc_001",
    amount: 150.0,
    currency: "USD",
    status: "completed",
    type: "transfer",
    description: "Shared rent contribution",
    createdAt: "2025-03-05T14:30:00Z",
    updatedAt: "2025-03-05T14:30:03Z",
  },
  {
    id: "txn_003",
    fromAccountId: "acc_003",
    toAccountId: "acc_004",
    amount: 500.0,
    currency: "USD",
    status: "completed",
    type: "payment",
    description: "Annual software license",
    createdAt: "2025-03-10T09:15:00Z",
    updatedAt: "2025-03-10T09:15:02Z",
  },
  {
    id: "txn_004",
    fromAccountId: "acc_001",
    toAccountId: "acc_002",
    amount: 75.5,
    currency: "USD",
    status: "pending",
    type: "transfer",
    description: "Dinner split",
    createdAt: "2026-03-11T19:00:00Z",
    updatedAt: "2026-03-11T19:00:00Z",
  },
  {
    id: "txn_005",
    fromAccountId: "acc_004",
    toAccountId: "acc_003",
    amount: 500.0,
    currency: "USD",
    status: "refunded",
    type: "refund",
    description: "Refund for txn_003 — duplicate charge",
    createdAt: "2025-03-12T11:00:00Z",
    updatedAt: "2025-03-12T11:00:10Z",
  },
];

// Populate the stores with seed data
for (const acc of SEED_ACCOUNTS) accounts.set(acc.id, acc);
for (const txn of SEED_TRANSACTIONS) transactions.set(txn.id, txn);

// ─────────────────────────────────────────────────────────────────────────────
// ID generators
// ─────────────────────────────────────────────────────────────────────────────

export function nextTxnId(): string {
  return `txn_${String(++txnCounter).padStart(3, "0")}`;
}

export function nextAccId(): string {
  return `acc_${String(++accCounter).padStart(3, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Account helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAllAccounts(): Account[] {
  return Array.from(accounts.values());
}

export function getAccountById(id: string): Account | undefined {
  return accounts.get(id);
}

export function saveAccount(account: Account): Account {
  accounts.set(account.id, account);
  return account;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAllTransactions(): Transaction[] {
  return Array.from(transactions.values());
}

export function getTransactionById(id: string): Transaction | undefined {
  return transactions.get(id);
}

export function saveTransaction(txn: Transaction): Transaction {
  transactions.set(txn.id, txn);
  return txn;
}

export function getTransactionsByAccount(accountId: string): Transaction[] {
  return getAllTransactions().filter(
    (t) => t.fromAccountId === accountId || t.toAccountId === accountId,
  );
}
