/**
 * Shared contract between the server and the web app.
 *
 * Slice 1 fills this package with the Zod schemas and types of every `/api`
 * route (see the spec, section 7). For now it only carries the health payload,
 * which is the one route the foundation milestone ships.
 */

export const API_PREFIX = '/api'

export type HealthStatus = 'ok'

export interface HealthResponse {
  status: HealthStatus
  /** Application version, taken from the server package.json. */
  version: string
  /** Seconds the server process has been running. */
  uptimeSeconds: number
}
