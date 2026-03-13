# MCP Cheatsheet

> Local MCP servers for [Cursor](https://cursor.com): **Database Inspector** (read-only MySQL) and **API Runner** (Bearer auth). Let AI query your database and hit your API for debugging and verification.

[![npm version](https://img.shields.io/npm/v/@shah1900/mcp-db-api-tools.svg)](https://www.npmjs.com/package/@shah1900/mcp-db-api-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Complete Setup](#complete-setup-copy-paste)
- [Where files go](#where-files-go)
- [Database Inspector](#database-inspector)
- [API Runner](#api-runner)
- [Configuration](#configuration)
- [Debug Logging](#debug-logging)
- [Security](#security)
- [License](#license)

---

## Features

| Server | Purpose |
|--------|---------|
| **Database Inspector** | Read-only MySQL queries. List tables, describe schemas, run SELECT queries, check if records exist. |
| **API Runner** | Execute GET/POST requests to your API with Bearer token auth. |

**Use cases:**
- "Check if transaction ID 123 exists in the DB"
- "Compare DB results with API response"
- "Call the store-transactions API and verify the data"

---

## Installation

```bash
npm install @shah1900/mcp-db-api-tools
```

**SDK-style setup:** On install, the package automatically creates:
- `.mcp-cheatsheet/.env` (from template)
- `.cursor/mcp.json` (Cursor MCP config)
- Adds `.mcp-cheatsheet/` to `.gitignore`

**Manual setup** (if you skipped install or need to re-run):

```bash
npx @shah1900/mcp-db-api-tools init
```

---

## Complete Setup

1. **Install** (runs setup automatically):
   ```bash
   npm install @shah1900/mcp-db-api-tools
   ```

2. **Edit** `.mcp-cheatsheet/.env` with your DB and API credentials.

3. **Restart Cursor** (MCP servers load at startup).

---

## Where files go

| What | Location |
|------|----------|
| MCP servers | `.mcp-cheatsheet/database-inspector/`, `.mcp-cheatsheet/api-runner/` (full copy) |
| Your credentials | `.mcp-cheatsheet/.env` (created by setup) |
| Cursor config | `.cursor/mcp.json` (created by setup) |

The setup copies the full package into `.mcp-cheatsheet` so you have everything in one place.

---

## Database Inspector

Read-only MySQL access. Only `SELECT` queries are allowed.

### Tools

| Tool | Description |
|------|-------------|
| `db_list_tables` | List all tables in the database |
| `db_describe_table` | Describe schema of a table |
| `db_execute_query` | Run a read-only SELECT query |
| `db_check_record_exists` | Check if a record exists by ID |

### Example prompts

- "Check if a transaction with ID 123 exists in the DB"
- "List all tables in the database"
- "Describe the transactions table schema"

### Environment variables

| Variable | Description |
|---------|-------------|
| `DB_CONNECTION_STRING` | Full URL: `mysql://user:pass@host:3306/dbname` |
| `DB_HOST` | Database host |
| `DB_PORT` | Port (default 3306) |
| `DB_USERNAME` | Username |
| `DB_PASSWORD` | Password |
| `DB_NAME` | Database name |

---

## API Runner

Execute GET/POST requests to your API with Bearer token auth.

### Tools

| Tool | Description |
|------|-------------|
| `api_list_endpoints` | List available API endpoints |
| `api_get` | Execute GET request |
| `api_post` | Execute POST request |

### Example prompts

- "Call the store-transactions API with storeId=1"
- "Compare DB results with API response for transaction 123"

### Environment variables

| Variable | Description |
|---------|-------------|
| `API_BASE_URL` | Base URL (e.g. `http://localhost:3000`) |
| `API_AUTH_TOKEN` | Bearer token for auth |

### Endpoints config

Edit `api-runner/endpoints.json` to customize the list returned by `api_list_endpoints`.

---

## Configuration

**Use project-level config.** Each project should have its own `.cursor/mcp.json` and `.mcp-cheatsheet/.env`. Do not use global Cursor config—it uses a fixed path and one set of credentials for all projects.

---

## Debug Logging

Both servers log to stderr (tool name, args, result preview). View in Cursor: **View → Output** → select the MCP server channel.

To disable: set `MCP_DEBUG=0` in `.env`.

---

## Security

- **Never commit** `.mcp-cheatsheet` or `.env`
- Credentials live in `.env` only
- Add `.mcp-cheatsheet/` to `.gitignore`

---

## License

MIT © [Shah Shahbaz](https://github.com/ShahShahbaz305)
