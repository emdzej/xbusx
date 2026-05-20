import { DBus } from '@emdzej/dbus-devices'
import { addressName as dbusAddressName } from '@emdzej/dbus-protocol'
import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { addressName } from '@emdzej/ikbus-protocol'
import { WebSerialTransport } from '@emdzej/transport-web-serial'
import { type LogEntry, nextLogId } from './log.js'
import { type DeviceEntry, registerAll } from './registry.js'
import { type DBusDeviceEntry, registerAllDBus } from './registry-dbus.js'
import type { Protocol } from './storage.js'
import type { DisplayableDevice } from './types.js'

interface BaseConnection {
  readonly portLabel: string
  close(): Promise<void>
}

export interface IKBusConnection extends BaseConnection {
  readonly kind: 'ikbus'
  readonly bus: IKBus
  readonly entries: readonly DeviceEntry[]
  readonly devices: readonly DisplayableDevice[]
}

export interface DBusConnection extends BaseConnection {
  readonly kind: 'dbus'
  readonly bus: DBus
  readonly entries: readonly DBusDeviceEntry[]
  readonly devices: readonly DisplayableDevice[]
}

export type Connection = IKBusConnection | DBusConnection

type EmitFn = (event: string, payload?: unknown) => boolean

interface ConnectArgs {
  port: SerialPort
  baudRate: number
  protocol: Protocol
  onLog: (entry: LogEntry) => void
  /** Called whenever a device's state may have changed. */
  onDeviceEvent: () => void
  /** Called on transport close (USB unplug, manual close, etc.). */
  onClose: () => void
}

/**
 * Open the user-picked SerialPort and produce a fully-wired Connection
 * for the chosen protocol. UI callbacks (log/event/close) are invoked on
 * every interesting bus event so Svelte can render incrementally.
 */
export async function connect(args: ConnectArgs): Promise<Connection> {
  return args.protocol === 'ikbus' ? connectIKBus(args) : connectDBus(args)
}

async function connectIKBus(args: ConnectArgs): Promise<IKBusConnection> {
  const transport = new WebSerialTransport({ port: args.port, baudRate: args.baudRate })
  const bus = new IKBus(transport, new Vehicle())
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

  wrapDeviceEvents(devices, args)
  transport.events.on('close', () => args.onClose())

  await bus.start()

  return {
    kind: 'ikbus',
    bus,
    entries,
    devices: devices as readonly DisplayableDevice[],
    portLabel: portLabel(args.port),
    close: () => bus.stop(),
  }
}

async function connectDBus(args: ConnectArgs): Promise<DBusConnection> {
  const transport = new WebSerialTransport({ port: args.port, baudRate: args.baudRate })
  const bus = new DBus(transport)
  const { entries, devices } = registerAllDBus(bus)

  // D-bus has no source byte on the wire; log only destination.
  bus.events.on('frame', (msg) => {
    args.onLog({
      id: nextLogId(),
      kind: 'frame',
      ts: Date.now(),
      source: '—',
      dest: dbusAddressName(msg.destination),
      cmd: msg.payload[0] ?? 0,
      len: msg.payload.length,
    })
  })
  bus.events.on('txFrame', (msg) => {
    args.onLog({
      id: nextLogId(),
      kind: 'tx',
      ts: Date.now(),
      source: 'TESTER',
      dest: dbusAddressName(msg.destination),
      cmd: msg.payload[0] ?? 0,
      len: msg.payload.length,
    })
  })
  bus.events.on('error', (err) => {
    args.onLog({ id: nextLogId(), kind: 'error', ts: Date.now(), message: err.message })
  })

  wrapDeviceEvents(devices, args)
  transport.events.on('close', () => args.onClose())

  await bus.start()

  return {
    kind: 'dbus',
    bus,
    entries,
    devices,
    portLabel: portLabel(args.port),
    close: () => bus.stop(),
  }
}

/**
 * Monkey-patch each device's event emitter so that any emit() is mirrored
 * into the UI log and triggers the App-level state-tick. Works for both
 * Device (I/K-bus) and DME-style ECU twins (D-bus) since both expose
 * `events.emit`.
 */
function wrapDeviceEvents(
  devices: readonly DisplayableDevice[],
  args: Pick<ConnectArgs, 'onLog' | 'onDeviceEvent'>,
): void {
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
}

function portLabel(port: SerialPort): string {
  const info = port.getInfo()
  const vendor = info.usbVendorId !== undefined ? info.usbVendorId.toString(16) : '?'
  const product = info.usbProductId !== undefined ? info.usbProductId.toString(16) : '?'
  return `Serial USB ${vendor}:${product}`
}
