import type { DBus } from '@emdzej/dbus-devices'
import { addressName as dbusAddressName } from '@emdzej/dbus-protocol'
import type { IKBus } from '@emdzej/ibusx-core'
import { addressName } from '@emdzej/ikbus-protocol'
import type { BusKind, DisplayableDevice } from '../types.js'
import { LOG_CAPACITY, type LogEntry, nextLogId } from './log.js'

type EmitFn = (event: string, payload?: unknown) => boolean

/**
 * Wire up listeners that mirror bus + device activity into a single
 * rolling log. Returns an `unsubscribe` callback that restores the
 * original emitters — useful for tests / hot reload. Works for both
 * `IKBus` and `DBus` orchestrators since both expose `events.frame`
 * and `events.error`.
 */
export function attachBusListeners(
  bus: IKBus | DBus,
  busKind: BusKind,
  devices: readonly DisplayableDevice[],
  onLog: (entry: LogEntry) => void,
): () => void {
  const onFrame = (msg: { source?: number; destination: number; payload: Uint8Array }): void => {
    if (busKind === 'ikbus') {
      onLog({
        id: nextLogId(),
        kind: 'frame',
        ts: Date.now(),
        source: addressName(msg.source ?? 0),
        dest: addressName(msg.destination),
        cmd: msg.payload[0] ?? 0,
        len: msg.payload.length,
      })
    } else {
      // D-bus inbound frames are always ECU → tester; no source byte on
      // the wire. The destination on inbound is the tester address.
      onLog({
        id: nextLogId(),
        kind: 'frame',
        ts: Date.now(),
        source: '—',
        dest: dbusAddressName(msg.destination),
        cmd: msg.payload[0] ?? 0,
        len: msg.payload.length,
      })
    }
  }
  const onError = (err: Error): void => {
    onLog({ id: nextLogId(), kind: 'error', ts: Date.now(), message: err.message })
  }
  bus.events.on('frame', onFrame)
  bus.events.on('error', onError)

  // D-bus also emits txFrame; mirror it too so users see their outbound queries.
  let offTx: (() => void) | undefined
  if (busKind === 'dbus') {
    const onTx = (msg: { destination: number; payload: Uint8Array }): void => {
      onLog({
        id: nextLogId(),
        kind: 'frame',
        ts: Date.now(),
        source: 'TESTER',
        dest: dbusAddressName(msg.destination),
        cmd: msg.payload[0] ?? 0,
        len: msg.payload.length,
      })
    }
    ;(bus as DBus).events.on('txFrame', onTx)
    offTx = () => (bus as DBus).events.off('txFrame', onTx)
  }

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
    if (offTx !== undefined) offTx()
    for (const restore of restores) restore()
  }
}

/** Trim the log to LOG_CAPACITY most-recent entries. */
export function appendLog(log: readonly LogEntry[], entry: LogEntry): LogEntry[] {
  const next = log.length >= LOG_CAPACITY ? log.slice(-LOG_CAPACITY + 1) : [...log]
  next.push(entry)
  return next
}
