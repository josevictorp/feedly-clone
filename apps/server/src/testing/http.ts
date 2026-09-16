import type { FetchLike } from '../feeds/fetch.ts'

/**
 * A stand-in for `fetch` built from a routing table, so feed-engine tests are
 * deterministic and never touch the network (spec, section 11).
 */

export interface StubResponse {
  status?: number
  body?: string | Uint8Array
  headers?: Record<string, string>
  /** Final URL after redirects, when the test cares. */
  url?: string
  /** Throw instead of answering, to exercise timeouts and network failures. */
  throws?: Error
}

export interface FakeHttp {
  fetch: FetchLike
  /** Every URL requested, in order. */
  requests: { url: string; headers: Record<string, string> }[]
}

/**
 * Builds a fetch stub. Keys are exact URLs; an unlisted URL answers 404.
 * A `StubResponse` may also be a function so a test can vary by attempt.
 */
export function createFakeHttp(
  routes: Record<string, StubResponse | ((attempt: number) => StubResponse)>,
): FakeHttp {
  const requests: FakeHttp['requests'] = []
  const attempts = new Map<string, number>()

  const fetchImpl: FetchLike = async (url, init) => {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[key.toLowerCase()] = value
    }
    requests.push({ url, headers })

    const attempt = (attempts.get(url) ?? 0) + 1
    attempts.set(url, attempt)

    const route = routes[url]
    const stub = typeof route === 'function' ? route(attempt) : route

    if (!stub) {
      return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } })
    }
    if (stub.throws) throw stub.throws

    const status = stub.status ?? 200
    // A 304 must carry no body, as the real thing does.
    const body = status === 304 || status === 204 ? null : (stub.body ?? '')

    const response = new Response(body, {
      status,
      headers: stub.headers ?? {},
    })

    // `Response.url` is read-only, so it is defined here for tests that assert on it.
    Object.defineProperty(response, 'url', { value: stub.url ?? url })
    return response
  }

  return { fetch: fetchImpl, requests }
}
