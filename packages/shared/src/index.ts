/**
 * Shared contract between the server and the web app.
 *
 * Both sides import the Zod schemas and the types derived from them, so a
 * change to a payload is a compile error rather than a runtime surprise.
 */

export * from './api.ts'
