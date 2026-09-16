import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'

describe('createApp', () => {
  it('answers GET /api/health with the service status', async () => {
    const app = createApp()

    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    const body = (await response.json()) as Record<string, unknown>
    expect(body.status).toBe('ok')
    expect(typeof body.version).toBe('string')
    expect(typeof body.uptimeSeconds).toBe('number')
  })

  it('answers unknown /api routes with a typed 404 error', async () => {
    const app = createApp()

    const response = await app.request('/api/does-not-exist')

    expect(response.status).toBe(404)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('not_found')
    expect(body.error.message).toBeTruthy()
  })
})
