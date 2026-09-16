import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { relative } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app.ts'
import { ensureDataDir, loadConfig, type ServerConfig } from './config.ts'
import { logger } from './logger.ts'

/** Opens the given URL in the default browser. macOS is the supported target. */
function openBrowser(url: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  const child = spawn(command, [url], { stdio: 'ignore', detached: true, shell: false })
  child.on('error', (error) => logger.warn({ err: error, url }, 'could not open the browser'))
  child.unref()
}

function main(): void {
  const config: ServerConfig = loadConfig()
  ensureDataDir(config)

  const app = createApp()

  // The SPA is only present after `pnpm build`; in `pnpm dev` Vite serves it.
  if (existsSync(config.webDistDir)) {
    const root = relative(process.cwd(), config.webDistDir)
    app.use('/*', serveStatic({ root }))
    app.get('/*', serveStatic({ root, path: 'index.html' }))
  } else {
    logger.warn({ webDistDir: config.webDistDir }, 'web build not found, serving API only')
  }

  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    const url = `http://localhost:${info.port}`
    logger.info({ url, dataDir: config.dataDir }, 'feedly clone server listening')
    if (config.openBrowser) openBrowser(url)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        { port: config.port },
        `port ${config.port} is already in use — stop the other process or run with PORT=<other>`,
      )
      process.exit(1)
    }
    throw error
  })
}

main()
