#!/usr/bin/env node
/**
 * SDK-style setup: copies full package into .mcp-cheatsheet (database-inspector, api-runner, etc.)
 * Run: npx @shah1900/mcp-db-api-tools init
 * Or runs automatically after npm install (postinstall).
 */

import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, cpSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// INIT_CWD = project root (where user ran npm install). Set by npm.
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
      args: ['./.mcp-cheatsheet/database-inspector/index.js'],
      env: {},
      disabled: false,
    },
    'api-runner': {
      command: 'node',
      args: ['./.mcp-cheatsheet/api-runner/index.js'],
      env: {},
      disabled: false,
    },
  },
}

const mcpPackageJson = {
  name: 'mcp-db-api-tools-local',
  version: '1.0.0',
  private: true,
  type: 'module',
  dependencies: {
    '@modelcontextprotocol/sdk': '^1.27.1',
    dotenv: '^16.3.1',
    mysql2: '^3.6.1',
    zod: '^3.23.0',
  },
}

function setup() {
  console.log('\n🔧 @shah1900/mcp-db-api-tools setup:\n')

  mkdirSync(mcpDir, { recursive: true })

  // 1. Copy database-inspector and api-runner folders
  cpSync(join(pkgDir, 'database-inspector'), join(mcpDir, 'database-inspector'), { recursive: true })
  console.log('  ✓ Copied database-inspector/')
  cpSync(join(pkgDir, 'api-runner'), join(mcpDir, 'api-runner'), { recursive: true })
  console.log('  ✓ Copied api-runner/')

  // 2. Copy .env (from template if not exists)
  if (!existsSync(envDest)) {
    copyFileSync(envExample, envDest)
    console.log('  ✓ Created .mcp-cheatsheet/.env (edit with your credentials)')
  } else {
    console.log('  ✓ .mcp-cheatsheet/.env already exists')
  }

  // 3. Write package.json and install deps
  writeFileSync(join(mcpDir, 'package.json'), JSON.stringify(mcpPackageJson, null, 2))
  console.log('  ✓ Installing dependencies in .mcp-cheatsheet/...')
  execSync('npm install', { cwd: mcpDir, stdio: 'pipe' })
  console.log('  ✓ Dependencies installed')

  // 4. Create .cursor/mcp.json
  mkdirSync(cursorDir, { recursive: true })
  writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2))
  console.log('  ✓ Created .cursor/mcp.json')

  // 5. Add .mcp-cheatsheet to .gitignore
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
