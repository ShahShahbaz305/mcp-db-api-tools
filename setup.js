#!/usr/bin/env node
/**
 * SDK-style setup: creates .mcp-cheatsheet, .cursor/mcp.json, and .gitignore entry.
 * Run: npx @shah1900/mcp-db-api-tools init
 * Or runs automatically after npm install (postinstall).
 */

import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// INIT_CWD = project root (where user ran npm install). Set by npm.
// __dirname = package root (where setup.js lives)
const projectRoot = process.env.INIT_CWD || process.cwd()
const pkgDir = __dirname

const mcpDir = join(projectRoot, '.mcp-cheatsheet')
const cursorDir = join(projectRoot, '.cursor')
const envExample = join(pkgDir, '.env.example')
const envDest = join(mcpDir, '.env')
const mcpJsonPath = join(cursorDir, 'mcp.json')
const gitignorePath = join(projectRoot, '.gitignore')

const mcpConfig = {
  mcpServers: {
    'database-inspector': {
      command: 'node',
      args: ['./node_modules/@shah1900/mcp-db-api-tools/database-inspector/index.js'],
      env: {},
      disabled: false,
    },
    'api-runner': {
      command: 'node',
      args: ['./node_modules/@shah1900/mcp-db-api-tools/api-runner/index.js'],
      env: {},
      disabled: false,
    },
  },
}

function setup() {
  console.log('\n🔧 @shah1900/mcp-db-api-tools setup:\n')

  // 1. Create .mcp-cheatsheet and copy .env
  mkdirSync(mcpDir, { recursive: true })
  if (!existsSync(envDest)) {
    copyFileSync(envExample, envDest)
    console.log('  ✓ Created .mcp-cheatsheet/.env (edit with your credentials)')
  } else {
    console.log('  ✓ .mcp-cheatsheet/.env already exists')
  }

  // 2. Create .cursor/mcp.json
  mkdirSync(cursorDir, { recursive: true })
  writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2))
  console.log('  ✓ Created .cursor/mcp.json')

  // 3. Add .mcp-cheatsheet to .gitignore
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8')
    if (!content.includes('.mcp-cheatsheet')) {
      const updated = content.trimEnd() + '\n\n# MCP credentials (never commit)\n.mcp-cheatsheet/\n'
      writeFileSync(gitignorePath, updated)
      console.log('  ✓ Added .mcp-cheatsheet/ to .gitignore')
    } else {
      console.log('  ✓ .mcp-cheatsheet/ already in .gitignore')
    }
  } else {
    writeFileSync(gitignorePath, '# MCP credentials (never commit)\n.mcp-cheatsheet/\n')
    console.log('  ✓ Created .gitignore with .mcp-cheatsheet/')
  }

  console.log('\n✅ Setup complete! Edit .mcp-cheatsheet/.env with your DB and API credentials, then restart Cursor.\n')
}

try {
  setup()
} catch (err) {
  console.error('Setup error:', err.message)
  process.exit(1)
}
