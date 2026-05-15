import type { Device, IBus } from '@emdzej/ibusx-core'
import { addressName } from '@emdzej/ibusx-protocol'
import { LOG_CAPACITY, type LogEntry, nextLogId } from './log.js'

type EmitFn = (event: string, payload?: unknown) => boolean

/**
 * Wire up listeners that mirror bus + device activity into a single rolling
 * log.  Returns an `unsubscribe` callback that restores the original emitters
 * — useful for tests / hot reload.
 */
export function attachBusListeners(
  bus: IBus,
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous device generics
  devices: readonly Device<any, any>[],
  onLog: (entry: LogEntry) => void,
): () => void {
  const onFrame = (msg: { source: number; destination: number; payload: Uint8Array }): void => {
    onLog({
      id: nextLogId(),
      kind: 'frame',
      ts: Date.now(),
      source: addressName(msg.source),
      dest: addressName(msg.destination),
      cmd: msg.payload[0] ?? 0,
      len: msg.payload.length,
    })
  }
  const onError = (err: Error): void => {
    onLog({ id: nextLogId(), kind: 'error', ts: Date.now(), message: err.message })
  }
  bus.events.on('frame', onFrame)
  bus.events.on('error', onError)

  const restores: Array<() => void> = []
  for (const device of devices) {
    const emitter = device.events as unknown as { emit: EmitFn }
    const original = emitter.emit.bind(emitter)
    emitter.emit = (event, payload) => {
      onLog({ id: nextLogId(), kind: 'event', ts: Date.now(), device: device.name, event, payload })
      return original(event, payload)
    }
    restores.push(() => {
      emitter.emit = original
    })
  }

  return () => {
    bus.events.off('frame', onFrame)
    bus.events.off('error', onError)
    for (const restore of restores) restore()
  }
}

/** Trim the log to LOG_CAPACITY most-recent entries. */
export function appendLog(log: readonly LogEntry[], entry: LogEntry): LogEntry[] {
  const next = log.length >= LOG_CAPACITY ? log.slice(-LOG_CAPACITY + 1) : [...log]
  next.push(entry)
  return next
}
