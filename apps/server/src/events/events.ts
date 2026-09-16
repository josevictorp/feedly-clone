import type { AppEvent } from '@feedly/shared'

/**
 * In-process event bus (spec, section 7).
 *
 * The scheduler and the mutating routes publish here; `/api/events` turns each
 * event into an SSE frame so the front end updates counters and lists without
 * polling. A single local user means a plain fan-out is enough.
 */

export type EventListener = (event: AppEvent) => void

export interface EventBus {
  emit: (event: AppEvent) => void
  /** Returns the function that unsubscribes. */
  subscribe: (listener: EventListener) => () => void
  /** Number of live subscribers; used by tests and by the health log. */
  subscriberCount: () => number
}

export function createEventBus(
  onListenerError?: (error: unknown, event: AppEvent) => void,
): EventBus {
  const listeners = new Set<EventListener>()

  return {
    emit(event) {
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          // A dead SSE connection must not break the scheduler that emitted.
          onListenerError?.(error, event)
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    subscriberCount: () => listeners.size,
  }
}
