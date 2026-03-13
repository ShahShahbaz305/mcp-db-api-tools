#!/usr/bin/env node
/**
 * API Runner MCP Server
 * Allows AI to hit local or staged API endpoints with Bearer auth.
 * Supports GET and POST requests.
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
    process.stderr.write(`[API-Runner] ${new Date().toISOString()} ${args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`)
  }
}

import { readFileSync, existsSync } from 'fs'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

function getConfig() {
  const baseUrl = process.env.API_BASE_URL || process.env.API_URL
  const authToken = process.env.API_AUTH_TOKEN || process.env.AUTH_TOKEN

  if (!baseUrl) {
    throw new Error(
      'Missing API_BASE_URL or API_URL in .env. Example: http://localhost:1900 or https://dev-retail.example.com/api'
    )
  }
  if (!authToken) {
    throw new Error(
      'Missing API_AUTH_TOKEN or AUTH_TOKEN in .env. Required for Bearer authentication.'
    )
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    authToken,
  }
}

async function executeRequest(method, path, body = null) {
  const { baseUrl, authToken } = getConfig()
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  }

  const options = {
    method,
    headers,
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  log(`  HTTP ${method} ${url}`)
  const res = await fetch(url, options)
  const text = await res.text()
  log(`  ← ${res.status} ${res.statusText}`)
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { _raw: text }
  }

  return {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    data,
  }
}

function loadEndpoints() {
  const paths = [
    join(__dirname, 'endpoints.json'),
    join(__dirname, '..', 'api-runner', 'endpoints.json'),
  ]
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8'))
      } catch {
        // ignore
      }
    }
  }
  return { endpoints: [] }
}

const TOOLS = [
  {
    name: 'api_list_endpoints',
    description:
      'List available API endpoints. Use to discover what endpoints you can call.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'api_get',
    description: 'Execute a GET request to an API endpoint. Uses Bearer token from config.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'API path (e.g. /api/v1/reports/store-transactions) or full URL',
        },
        queryString: {
          type: 'string',
          description: 'Optional query string (e.g. storeId=1&startDate=2025-01-01&endDate=2025-01-31)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'api_post',
    description: 'Execute a POST request to an API endpoint. Uses Bearer token from config.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'API path (e.g. /api/v1/auth/login) or full URL',
        },
        body: {
          type: 'object',
          description: 'JSON body for the POST request',
        },
      },
      required: ['path'],
    },
  },
]

const server = new Server(
  {
    name: 'api-runner',
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
    switch (name) {
      case 'api_list_endpoints': {
        const config = loadEndpoints()
        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(config, null, 2),
            },
          ],
        }
        break
      }
      case 'api_get': {
        const path = args?.path
        if (!path) throw new Error('path is required')
        let url = path
        if (args?.queryString) {
          url += (path.includes('?') ? '&' : '?') + args.queryString
        }
        const res = await executeRequest('GET', url)
        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res, null, 2),
            },
          ],
        }
        break
      }
      case 'api_post': {
        const path = args?.path
        if (!path) throw new Error('path is required')
        const body = args?.body || null
        const res = await executeRequest('POST', path, body)
        result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res, null, 2),
            },
          ],
        }
        break
      }
      default:
        throw new Error(`Unknown tool: ${name}`)
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
