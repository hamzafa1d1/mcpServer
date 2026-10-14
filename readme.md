# Payment MCP Lab

A payments & transactions MCP server built in TypeScript — designed as a **deep-dive learning project** into MCP server architecture.


## Verification

```sh
npm ci
npm run build
node scripts/smoke-test.mjs
```

The smoke check opens an MCP stdio client connection, discovers tools and retrieves the synthetic seed accounts. It checks protocol integration, not production payment correctness. The same build and smoke check run in GitHub Actions.

## Scope and limitations

This is an independent learning project, not a payment processor. It uses synthetic seed data and an in-memory store that resets when the process restarts. It does not connect to a bank or move real money. The examples demonstrate MCP integration; they do not establish production-grade authentication, persistence, monetary precision or reliability.

**Stack:** TypeScript, MCP SDK, Zod and a local stdio transport.


---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that lets AI models (like Claude) communicate with external servers to access data and take actions. Think of it as a structured API layer between an LLM and the outside world.

An MCP server exposes three types of primitives:

| Primitive | Who initiates? | Purpose | Analogy |
|-----------|---------------|---------|---------|
| **Tools** | The model | Actions with side-effects (create, update, query) | POST/PUT/DELETE endpoints |
| **Resources** | The client/user | Read-only, URI-addressed data | GET endpoints |
| **Prompts** | The user | Reusable conversation templates | Slash commands |

---

## Project Structure

```
src/
├── index.ts                     # Entry point — wires server to transport
├── server.ts                    # McpServer instance + registers all primitives
├── types.ts                     # Shared TypeScript interfaces (Transaction, Account)
│
├── data/
│   └── store.ts                 # In-memory data store with seed data (simulates a DB)
│
├── tools/
│   ├── transaction-tools.ts     # create_transaction, get_transaction, list_transactions, refund_transaction
│   └── account-tools.ts         # list_accounts, get_account, get_account_balance, create_account, deposit_funds
│
├── resources/
│   ├── transaction-resources.ts # transactions://history  |  transactions://{id}
│   └── account-resources.ts     # accounts://list  |  accounts://{id}
│
└── prompts/
    └── payment-prompts.ts       # analyze_spending, payment_report, fraud_check
```

---

## Architecture Deep-Dive

### 1. Transport Layer (`src/index.ts`)

The entry point wires the server to a **transport** — the communication channel between server and client.

```
MCP Client (Claude Desktop, CLI, etc.)
        ↕  JSON-RPC 2.0 over stdin/stdout
MCP Server (this project)
        ↕  function calls
Domain logic (tools, resources, prompts)
        ↕  function calls
In-memory store (simulates a database)
```

The SDK ships two transports:
- **`StdioServerTransport`** — stdin/stdout, used for local servers (Claude Desktop, CLI)
- **`SSEServerTransport`** — HTTP + Server-Sent Events, used for remote/network servers

> **Key rule for stdio:** All `console.log` must be replaced with `console.error`. Anything written to stdout corrupts the JSON-RPC message stream.

### 2. Server (`src/server.ts`)

`McpServer` is the high-level class from `@modelcontextprotocol/sdk`. It handles:
- JSON-RPC message serialization/deserialization
- Protocol negotiation (capabilities exchange on connect)
- Routing incoming requests to the correct handler
- Schema validation via Zod before your handler is called

All you do is call `.tool()`, `.resource()`, `.prompt()` to register primitives.

### 3. Tools (`src/tools/`)

Tools are **model-invoked** — the LLM decides to call them based on the conversation.

```typescript
server.tool(
  "create_transaction",           // name — used to call the tool
  "Creates a new payment...",     // description — shown to the model
  { amount: z.number().positive() /* Zod schema */ },
  async ({ amount }) => {         // handler — receives validated args
    return { content: [{ type: "text", text: "..." }] };
  }
);
```

The Zod schema serves double duty: **runtime validation** + **automatic JSON Schema generation** (sent to the client so the model knows what parameters to provide).

### 4. Resources (`src/resources/`)

Resources are **client-read** — the host app reads them to load context into the model's window.

```typescript
// Static URI
server.resource("transaction-history", "transactions://history", async (uri) => {
  return { contents: [{ uri: uri.href, mimeType: "application/json", text: "..." }] };
});

// URI template — {id} is extracted from the URI and passed as a variable
server.resource(
  "transaction-by-id",
  new ResourceTemplate("transactions://{id}", { list: undefined }),
  async (uri, { id }) => { /* ... */ }
);
```

Resources are purely read-only — they should never have side effects.

### 5. Prompts (`src/prompts/`)

Prompts are **user-invoked** — the user picks one from the client UI (like a slash command).

```typescript
server.prompt(
  "analyze_spending",
  "Analyze spending patterns for an account.",
  { accountId: z.string() },        // Zod schema for prompt arguments
  async ({ accountId }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: `Analyze account ${accountId}...` }
    }]
  })
);
```

The handler fetches live data and injects it into the message template before returning it. The returned `messages` array is injected directly into the conversation.

---

## Getting Started

### Install & Build

```bash
npm install
npm run build        # compiles TypeScript → dist/
```

### Run

```bash
npm start            # runs the compiled server
# or for development (watch mode, no build step):
npm run dev
```

### Inspect with MCP Inspector

The MCP Inspector is a browser-based tool to explore and test your server interactively:

```bash
npm run inspect
```

This opens a UI where you can call tools, read resources, and invoke prompts manually.

### Connect to Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "payment-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcpServer/dist/index.js"]
    }
  }
}
```

---

## Seed Data

The server starts with pre-loaded data so you can query it immediately:

**Accounts**
| ID | Name | Balance |
|----|------|---------|
| acc_001 | Alice Johnson | $4,500.00 |
| acc_002 | Bob Smith | $2,250.00 |
| acc_003 | Carol White | $8,200.00 |
| acc_004 | ACME Corp | $49,250.00 |

**Transactions**
| ID | From → To | Amount | Status |
|----|-----------|--------|--------|
| txn_001 | Alice → ACME | $250.00 | completed |
| txn_002 | Bob → Alice | $150.00 | completed |
| txn_003 | Carol → ACME | $500.00 | completed |
| txn_004 | Alice → Bob | $75.50 | pending |
| txn_005 | ACME → Carol | $500.00 | refunded |

---

## Tools Reference

| Tool | Description |
|------|-------------|
| `create_transaction` | Create a payment or transfer between two accounts |
| `get_transaction` | Get transaction details by ID |
| `list_transactions` | List transactions with filters (account, status, type) |
| `refund_transaction` | Refund a completed transaction |
| `list_accounts` | List all accounts |
| `get_account` | Get account details by ID |
| `get_account_balance` | Get just the balance of an account |
| `create_account` | Create a new account |
| `deposit_funds` | Add funds to an account |

## Resources Reference

| URI | Description |
|-----|-------------|
| `transactions://history` | Full transaction ledger |
| `transactions://{id}` | Single transaction, e.g. `transactions://txn_001` |
| `accounts://list` | All accounts |
| `accounts://{id}` | Single account, e.g. `accounts://acc_001` |

## Prompts Reference

| Prompt | Description |
|--------|-------------|
| `analyze_spending` | Detailed spending analysis for one account |
| `payment_report` | High-level report across all transactions |
| `fraud_check` | Suspicious activity scan (scoped or global) |
