import type { Device, IKBus } from '@emdzej/ibusx-core'
import { IKBus as IBusImpl, Vehicle } from '@emdzej/ibusx-core'
import { addressName } from '@emdzej/ikbus-protocol'
import { WebSerialTransport } from '@emdzej/transport-web-serial'
import { type LogEntry, nextLogId } from './log.js'
import { type DeviceEntry, registerAll } from './registry.js'

export interface Connection {
  readonly bus: IKBus
  readonly entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  readonly devices: readonly Device<any, any>[]
  readonly portLabel: string
  close(): Promise<void>
}

type EmitFn = (event: string, payload?: unknown) => boolean

/**
 * Open the user-picked SerialPort and produce a fully-wired Connection: a
 * running IKBus with every device registered, with the supplied callbacks
 * invoked on every frame and device-level event so the UI can update.
 */
export async function connect(args: {
  port: SerialPort
  baudRate: number
  onLog: (entry: LogEntry) => void
  /** Called whenever a device's state may have changed. */
  onDeviceEvent: () => void
  /** Called on transport close (USB unplug, manual close, etc.). */
  onClose: () => void
}): Promise<Connection> {
  const transport = new WebSerialTransport({ port: args.port, baudRate: args.baudRate })
  const bus = new IBusImpl(transport, new Vehicle())
  const { entries, devices } = registerAll(bus)

  bus.events.on('frame', (msg) => {
    args.onLog({
      id: nextLogId(),
      kind: 'frame',
      ts: Date.now(),
      source: addressName(msg.source),
      dest: addressName(msg.destination),
      cmd: msg.payload[0] ?? 0,
      len: msg.payload.length,
    })
  })
  bus.events.on('txFrame', (msg) => {
    args.onLog({
      id: nextLogId(),
      kind: 'tx',
      ts: Date.now(),
      source: addressName(msg.source),
      dest: addressName(msg.destination),
      cmd: msg.payload[0] ?? 0,
      len: msg.payload.length,
    })
  })
  bus.events.on('error', (err) => {
    args.onLog({ id: nextLogId(), kind: 'error', ts: Date.now(), message: err.message })
  })

  for (const device of devices) {
    const emitter = device.events as unknown as { emit: EmitFn }
    const original = emitter.emit.bind(emitter)
    emitter.emit = (event, payload) => {
      args.onLog({
        id: nextLogId(),
        kind: 'event',
        ts: Date.now(),
        device: device.name,
        event,
        payload,
      })
      args.onDeviceEvent()
      return original(event, payload)
    }
  }

  transport.events.on('close', () => args.onClose())

  await bus.start()

  const info = args.port.getInfo()
  const vendor = info.usbVendorId !== undefined ? info.usbVendorId.toString(16) : '?'
  const product = info.usbProductId !== undefined ? info.usbProductId.toString(16) : '?'
  const portLabel = `Serial USB ${vendor}:${product}`

  return {
    bus,
    entries,
    devices,
    portLabel,
    close: () => bus.stop(),
  }
}
