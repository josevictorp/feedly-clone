import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * `tsc` only emits JavaScript, so the generated `.sql` files and drizzle's
 * journal have to be carried into `dist/` by hand for `pnpm start` to migrate.
 */
const from = fileURLToPath(new URL('../src/db/migrations/', import.meta.url))
const to = fileURLToPath(new URL('../dist/db/migrations/', import.meta.url))

cpSync(from, to, { recursive: true })
