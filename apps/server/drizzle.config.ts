import { defineConfig } from 'drizzle-kit'

/** Only used by `pnpm --filter @feedly/server db:generate` to emit migrations. */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  strict: true,
  verbose: true,
})
