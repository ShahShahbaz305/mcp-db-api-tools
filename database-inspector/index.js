#!/usr/bin/env node
/**
 * Database Inspector MCP Server (Read-Only)
 * Allows AI to query MySQL database for verification and debugging.
 * Only allows SELECT queries - no writes.
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPaths = [
  join(process.cwd(), '.mcp-cheatsheet', '.env'),
  join(__dirname, '..', '.env'),
]
for (const p of envPaths) {
  if (existsSync(p)) {
    dotenv.config({ path: p })
    break
  }
}

const MCP_DEBUG = process.env.MCP_DEBUG !== '0'
function log(...args) {
  if (MCP_DEBUG) {
    process.stderr.write(`[DB-Inspector] ${new Date().toISOString()} ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`)
  }
}

import mysql from 'mysql2/promise'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Build connection config from env or connection string
function getConnectionConfig() {
  const connStr = process.env.DB_CONNECTION_STRING
  if (connStr) {
    try {
      const url = new URL(connStr.replace(/^mysql:\/\//, 'https://'))
      return {
        host: url.hostname,
        port: url.port || 3306,
        user: url.username,
        password: url.password,
        database: url.pathname?.replace(/^\//, '') || undefined,
      }
    } catch {
      throw new Error('Invalid DB_CONNECTION_STRING format. Use: mysql://user:pass@host:port/dbname')
    }
  }
  const host = process.env.DB_HOST || process.env.MYSQL_DB_HOST || 'localhost'
  const user = process.env.DB_USERNAME || process.env.MYSQL_DB_USERNAME
  const password = process.env.DB_PASSWORD || process.env.MYSQL_DB_PASSWORD
  const database = process.env.DB_NAME || process.env.MYSQL_DB_NAME
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_DB_PORT || '3306', 10)

  if (!user || !password || !database) {
    throw new Error(
      'Missing DB config. Set DB_CONNECTION_STRING or DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME in .env'
    )
  }
  return { host, port, user, password, database }
}

// Only allow SELECT queries (read-only)
const SELECT_ONLY_REGEX = /^\s*SELECT\b/i
const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'LOAD', 'OUTFILE',
  'INTO OUTFILE', 'INTO DUMPFILE', 'LOCK', 'UNLOCK', 'COMMIT', 'ROLLBACK',
]

function isReadOnlyQuery(sql) {
  const trimmed = sql.trim()
  if (!SELECT_ONLY_REGEX.test(trimmed)) return false
  const upper = trimmed.toUpperCase()
  return !FORBIDDEN_KEYWORDS.some((kw) => upper.includes(kw))
}

async function getConnection() {
  const config = getConnectionConfig()
  return mysql.createConnection(config)
}

const TOOLS = [
  {
    name: 'db_list_tables',
    description: 'List all tables in the database. Use to discover available tables.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'db_describe_table',
    description: 'Describe the schema of a table (columns, types). Use to understand table structure.',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: {
          type: 'string',
          description: 'Name of the table to describe',
        },
      },
      required: ['tableName'],
    },
  },
  {
    name: 'db_execute_query',
    description:
      'Execute a read-only SELECT query. Use to verify data exists (e.g. "Check if transaction ID X exists"). Only SELECT is allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'A valid MySQL SELECT query',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'db_check_record_exists',
    description:
      'Check if a record exists in a table by ID. Convenience tool for common verification (e.g. transaction, order).',
    inputSchema: {
      type: 'object',
      properties: {
        tableName: { type: 'string', description: 'Table name (e.g. Transactions, Orders)' },
        idColumn: { type: 'string', description: 'ID column name (default: id)', default: 'id' },
        idValue: { type: 'string', description: 'The ID value to look for' },
      },
      required: ['tableName', 'idValue'],
    },
  },
]

const server = new Server(
  {
    name: 'database-inspector',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  log(`→ Tool called: ${name}`, '| args:', args)
  let result

  try {
    const conn = await getConnection()
    try {
      switch (name) {
        case 'db_list_tables': {
          const [rows] = await conn.query(
            "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
          )
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(rows, null, 2),
              },
            ],
          }
          break
        }
        case 'db_describe_table': {
          const tableName = args?.tableName
          if (!tableName) throw new Error('tableName is required')
          const [rows] = await conn.query(
            `DESCRIBE \`${String(tableName).replace(/`/g, '``')}\``
          )
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(rows, null, 2),
              },
            ],
          }
          break
        }
        case 'db_execute_query': {
          const query = args?.query
          if (!query || typeof query !== 'string') throw new Error('query is required')
          if (!isReadOnlyQuery(query)) {
            throw new Error('Only SELECT queries are allowed. Write operations are forbidden.')
          }
          const [rows] = await conn.query(query)
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(rows, null, 2),
              },
            ],
          }
          break
        }
        case 'db_check_record_exists': {
          const tableName = args?.tableName
          const idValue = args?.idValue
          const idColumn = args?.idColumn || 'id'
          if (!tableName || idValue === undefined) {
            throw new Error('tableName and idValue are required')
          }
          const safeTable = String(tableName).replace(/`/g, '``')
          const safeCol = String(idColumn).replace(/`/g, '``')
          const query = `SELECT * FROM \`${safeTable}\` WHERE \`${safeCol}\` = ? LIMIT 1`
          const [rows] = await conn.query(query, [idValue])
          const found = Array.isArray(rows) && rows.length > 0
          result = {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { exists: found, record: found ? rows[0] : null },
                  null,
                  2
                ),
              },
            ],
          }
          break
        }
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } finally {
      await conn.end()
    }
  } catch (err) {
    result = {
      content: [
        {
          type: 'text',
          text: `Error: ${err.message}`,
        },
      ],
      isError: true,
    }
  }

  const resultPreview = result?.content?.[0]?.text
  const preview = typeof resultPreview === 'string'
    ? (resultPreview.length > 500 ? resultPreview.slice(0, 500) + '...[truncated]' : resultPreview)
    : '(no text)'
  log(`← Result (${result?.isError ? 'ERROR' : 'OK'}):`, preview)
  return result
})

const transport = new StdioServerTransport()
server.connect(transport)
