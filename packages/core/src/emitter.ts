/**
 * Map shape for an event emitter: keys are event names, values are payload
 * types.  Use `void` for events with no payload.
 *
 * @example
 *   type MyEvents = {
 *     data: Uint8Array     // emit('data', bytes)
 *     open: void           // emit('open')   — no payload
 *     error: Error
 *   }
 */
// biome-ignore lint/suspicious/noExplicitAny: event payloads can be anything
export type EventMap = Record<string, any>

type EventArgs<T> = T extends void ? [] : [payload: T]
type EventListener<T> = T extends void ? () => void : (payload: T) => void

/**
 * Small typed event emitter.  Supports `void` payloads cleanly:
 *
 *   const e = new TypedEmitter<{ open: void; data: Uint8Array }>()
 *   e.on('open', () => { ... })
 *   e.emit('open')
 *   e.on('data', (bytes) => { ... })
 *   e.emit('data', new Uint8Array([1, 2, 3]))
 *
 * Listener exceptions are caught and silently swallowed so one bad listener
 * does not break the dispatch loop.  For application-level error reporting
 * use a dedicated `error` event on the relevant emitter (e.g. `IKBus.events`).
 */
export class TypedEmitter<E extends EventMap> {
  // biome-ignore lint/suspicious/noExplicitAny: internal storage type
  private listeners: { [K in keyof E]?: Set<(...args: any[]) => void> } = {}

  on<K extends keyof E>(event: K, listener: EventListener<E[K]>): this {
    let set = this.listeners[event]
    if (!set) {
      set = new Set()
      this.listeners[event] = set
    }
    set.add(listener as (...args: unknown[]) => void)
    return this
  }

  off<K extends keyof E>(event: K, listener: EventListener<E[K]>): this {
    this.listeners[event]?.delete(listener as (...args: unknown[]) => void)
    return this
  }

  once<K extends keyof E>(event: K, listener: EventListener<E[K]>): this {
    // biome-ignore lint/suspicious/noExplicitAny: wrapper needs to match any signature
    const wrapper = ((...args: any[]) => {
      this.off(event, wrapper as EventListener<E[K]>)
      ;(listener as (...args: unknown[]) => void)(...args)
    }) as EventListener<E[K]>
    return this.on(event, wrapper)
  }

  emit<K extends keyof E>(event: K, ...args: EventArgs<E[K]>): void {
    const set = this.listeners[event]
    if (!set) return
    // Snapshot so listeners can remove themselves during dispatch.
    for (const listener of [...set]) {
      try {
        listener(...args)
      } catch {
        // Swallow; bad listeners must not break dispatch.
      }
    }
  }

  removeAllListeners<K extends keyof E>(event?: K): this {
    if (event === undefined) {
      this.listeners = {}
    } else {
      delete this.listeners[event]
    }
    return this
  }

  listenerCount<K extends keyof E>(event: K): number {
    return this.listeners[event]?.size ?? 0
  }
}
