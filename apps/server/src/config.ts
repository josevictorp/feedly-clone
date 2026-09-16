import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Runtime configuration, resolved once at boot.
 *
 * Paths are absolute so the server behaves the same whether it runs from source
 * (`node src/index.ts`) or from the build output (`node dist/index.js`) — both
 * live one level below `apps/server`.
 */
export interface ServerConfig {
  port: number
  /** Where `feedly.db` and `favicons/` live. Overridable with FEEDLY_DATA_DIR. */
  dataDir: string
  /** Built SPA served at `/`. */
  webDistDir: string
  /** Open the browser once the server is listening (`--open`). */
  openBrowser: boolean
}

const DEFAULT_PORT = 3000

function resolvePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${value}"`)
  }
  return port
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: readonly string[] = process.argv.slice(2),
): ServerConfig {
  const repoDataDir = fileURLToPath(new URL('../../../data/', import.meta.url))

  return {
    port: resolvePort(env.PORT),
    dataDir: env.FEEDLY_DATA_DIR ? resolve(process.cwd(), env.FEEDLY_DATA_DIR) : repoDataDir,
    webDistDir: fileURLToPath(new URL('../../web/dist/', import.meta.url)),
    openBrowser: argv.includes('--open'),
  }
}

/** Creates the data directory tree if it is not there yet. */
export function ensureDataDir(config: ServerConfig): void {
  mkdirSync(join(config.dataDir, 'favicons'), { recursive: true })
}
