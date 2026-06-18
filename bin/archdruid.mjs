#!/usr/bin/env node
// bin/archdruid.mjs
import { argv } from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (argv.includes('--version') || argv.includes('-v')) {
  const require = createRequire(import.meta.url)
  const pkg = require(join(__dirname, '..', 'package.json'))
  console.log(pkg.version)
  process.exit(0)
}

if (argv.includes('--mcp')) {
  const { startMcpServer } = await import('../packages/mcp/dist/index.js')
  await startMcpServer()
} else {
  // Start the Next.js web server
  const { default: next } = await import('next')
  const app = next({ dev: false, dir: join(__dirname, '..', 'apps', 'web') })
  const handle = app.getRequestHandler()
  await app.prepare()

  const { createServer } = await import('node:http')
  const server = createServer((req, res) => handle(req, res))
  const PORT = parseInt(process.env.PORT ?? '3131', 10)
  server.listen(PORT, () => {
    console.log(`Archdruid running at http://localhost:${PORT}`)
  })
}
