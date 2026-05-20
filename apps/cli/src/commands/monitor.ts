import { DBus } from '@emdzej/dbus-devices'
import { type DBusMessage, addressName as dbusAddressName } from '@emdzej/dbus-protocol'
import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { addressName, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { SerialTransport } from '@emdzej/transport-serial'
import type { Command } from 'commander'
import pc from 'picocolors'
import { registerAll } from '../registry.js'
import { registerAllDBus } from '../registry-dbus.js'
import type { BusKind } from '../types.js'

interface MonitorOptions {
  port: string
  baud: string
  bus: BusKind
  noEvents?: boolean
  hex?: boolean
}

export function registerMonitorCommand(program: Command): void {
  program
    .command('monitor')
    .description('Open a serial port, register all device twins, and print frames + state changes.')
    .requiredOption('-p, --port <path>', 'Serial port path (e.g. /dev/ttyUSB0, COM3)')
    .option('-b, --baud <rate>', 'Baud rate', '9600')
    .option('--bus <kind>', 'Which bus to monitor (ikbus | dbus)', 'ikbus')
    .option('--no-events', 'Suppress device state-change events (frames only)')
    .option('--hex', 'Show raw payload bytes alongside the parsed frame line')
    .action(async (options: MonitorOptions) => {
      const baud = Number.parseInt(options.baud, 10)
      if (!Number.isFinite(baud) || baud <= 0) {
        throw new Error(`Invalid baud rate: ${options.baud}`)
      }
      if (options.bus !== 'ikbus' && options.bus !== 'dbus') {
        throw new Error(`Invalid --bus value: ${options.bus} (expected ikbus or dbus)`)
      }

      if (options.bus === 'ikbus') {
        await runIKBusMonitor(options, baud)
      } else {
        await runDBusMonitor(options, baud)
      }
    })
}

async function runIKBusMonitor(options: MonitorOptions, baud: number): Promise<void> {
  const transport = new SerialTransport({ path: options.port, baudRate: baud })
  const bus = new IKBus(transport, new Vehicle())
  registerAll(bus)

  bus.events.on('frame', (msg) => onIKBusFrame(msg, options.hex === true))
  bus.events.on('error', (err) => {
    process.stderr.write(`${pc.red('bus error:')} ${err.message}\n`)
  })

  if (options.noEvents !== true) {
    for (const device of bus.devices) {
      interceptEmit(device.name, device.events as unknown as { emit: EmitFn })
    }
  }

  attachShutdownHandlers(() => bus.stop())

  process.stdout.write(
    `${pc.bold('ibusx monitor')} ${pc.dim(`port=${options.port} baud=${baud} bus=ikbus`)}\n`,
  )
  await bus.start()
  await new Promise<never>(() => {})
}

async function runDBusMonitor(options: MonitorOptions, baud: number): Promise<void> {
  const transport = new SerialTransport({ path: options.port, baudRate: baud })
  const bus = new DBus(transport)
  const { devices } = registerAllDBus(bus)

  bus.events.on('frame', (msg) => onDBusFrame('rx', msg, options.hex === true))
  bus.events.on('txFrame', (msg) => onDBusFrame('tx', msg, options.hex === true))
  bus.events.on('error', (err) => {
    process.stderr.write(`${pc.red('bus error:')} ${err.message}\n`)
  })

  if (options.noEvents !== true) {
    for (const device of devices) {
      interceptEmit(device.name, device.events as unknown as { emit: EmitFn })
    }
  }

  attachShutdownHandlers(() => bus.stop())

  process.stdout.write(
    `${pc.bold('ibusx monitor')} ${pc.dim(`port=${options.port} baud=${baud} bus=dbus`)}\n`,
  )
  process.stdout.write(
    `${pc.dim('D-bus is request/response — listening only shows tester ↔ ECU exchanges (no ambient traffic).')}\n`,
  )
  await bus.start()
  await new Promise<never>(() => {})
}

function attachShutdownHandlers(stop: () => Promise<void>): void {
  const handleSignal = async (sig: NodeJS.Signals): Promise<void> => {
    process.stderr.write(`\n${pc.dim(`received ${sig}, closing port…`)}\n`)
    try {
      await stop()
    } finally {
      process.exit(0)
    }
  }
  process.on('SIGINT', () => void handleSignal('SIGINT'))
  process.on('SIGTERM', () => void handleSignal('SIGTERM'))
}

function onIKBusFrame(msg: IKBusMessage, showHex: boolean): void {
  const ts = formatTimestamp()
  const src = addressName(msg.source).padEnd(6)
  const dest = addressName(msg.destination).padEnd(6)
  const cmd = `0x${msg.payload[0]?.toString(16).padStart(2, '0').toUpperCase() ?? '??'}`
  const summary = `${pc.dim(ts)}  ${pc.cyan(src)} → ${pc.cyan(dest)}  ${pc.yellow(cmd)}  ${pc.dim(`(${msg.payload.length} B)`)}`
  process.stdout.write(`${summary}\n`)
  if (showHex) {
    const hex = Array.from(msg.payload, (b) => b.toString(16).padStart(2, '0')).join(' ')
    process.stdout.write(`  ${pc.dim(hex)}\n`)
  }
}

function onDBusFrame(direction: 'rx' | 'tx', msg: DBusMessage, showHex: boolean): void {
  const ts = formatTimestamp()
  const fromTester = direction === 'tx'
  // D-bus wire format has no source byte; we know direction from which
  // event the orchestrator emitted (txFrame vs frame).
  const src = (fromTester ? 'TESTER' : dbusAddressName(msg.destination)).padEnd(6)
  const dest = (fromTester ? dbusAddressName(msg.destination) : 'TESTER').padEnd(6)
  const cmd = `0x${msg.payload[0]?.toString(16).padStart(2, '0').toUpperCase() ?? '??'}`
  const tag = direction === 'tx' ? pc.green('tx') : pc.cyan('rx')
  const summary = `${pc.dim(ts)}  ${tag} ${pc.cyan(src)} → ${pc.cyan(dest)}  ${pc.yellow(cmd)}  ${pc.dim(`(${msg.payload.length} B)`)}`
  process.stdout.write(`${summary}\n`)
  if (showHex) {
    const hex = Array.from(msg.payload, (b) => b.toString(16).padStart(2, '0')).join(' ')
    process.stdout.write(`  ${pc.dim(hex)}\n`)
  }
}

type EmitFn = (event: string, payload?: unknown) => boolean

function interceptEmit(deviceName: string, emitter: { emit: EmitFn }): void {
  const original = emitter.emit.bind(emitter)
  emitter.emit = (event, payload) => {
    const ts = formatTimestamp()
    const value = payload === undefined ? '' : ` ${formatPayload(payload)}`
    process.stdout.write(
      `${pc.dim(ts)}  ${pc.magenta(deviceName.padEnd(6))} ${pc.green(event)}${value}\n`,
    )
    return original(event, payload)
  }
}

function formatPayload(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    try {
      return pc.dim(JSON.stringify(value))
    } catch {
      return pc.dim('[object]')
    }
  }
  return pc.dim(String(value))
}

function formatTimestamp(): string {
  const d = new Date()
  const pad = (n: number, w = 2): string => n.toString().padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}
