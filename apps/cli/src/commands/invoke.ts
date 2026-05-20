import { DBus } from '@emdzej/dbus-devices'
import type { ControlDescriptor, ControlParam, Device } from '@emdzej/ibusx-core'
import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport } from '@emdzej/transport-serial'
import type { Command } from 'commander'
import pc from 'picocolors'
import { ArgValidationError, coerceArg } from '../coerce.js'
import { DEVICE_REGISTRY, findDeviceEntry } from '../registry.js'
import { DBUS_DEVICE_REGISTRY, findDBusDeviceEntry } from '../registry-dbus.js'
import type { DisplayableDevice } from '../types.js'

interface InvokeRootOptions {
  port: string
  baud: string
  active?: boolean
}

export function registerInvokeCommand(program: Command): void {
  const invoke = program
    .command('invoke')
    .description(
      'Invoke a control on a device via its ControlsManifest. The device name determines which bus is used (I/K-bus or D-bus); names are unique across both registries.',
    )
    .requiredOption('-p, --port <path>', 'Serial port path (e.g. /dev/ttyUSB0, COM3)')
    .option('-b, --baud <rate>', 'Baud rate', '9600')
    .option('--active', 'Arm active-mode controls (refused by default for safety)')

  // I/K-bus devices.
  for (const entry of DEVICE_REGISTRY.filter((e) => e.implemented)) {
    const deviceCmd = invoke
      .command(entry.name)
      .description(`I/K-bus · controls on ${entry.name}`)
      .addHelpText('after', renderIKBusControlsHelp(entry.name))

    for (const [controlName, descriptor] of Object.entries(entry.controls)) {
      addIKBusControlSubcommand(
        deviceCmd,
        entry.name,
        controlName,
        descriptor as ControlDescriptor<Device>,
      )
    }
  }

  // D-bus ECUs.
  for (const entry of DBUS_DEVICE_REGISTRY.filter((e) => e.implemented)) {
    const deviceCmd = invoke
      .command(entry.name)
      .description(`D-bus · DS2 controls on ${entry.name}`)
      .addHelpText('after', renderDBusControlsHelp(entry.name))

    for (const [controlName, descriptor] of Object.entries(entry.controls)) {
      addDBusControlSubcommand(
        deviceCmd,
        entry.name,
        controlName,
        descriptor as ControlDescriptor<DisplayableDevice>,
      )
    }
  }
}

function addIKBusControlSubcommand(
  parent: Command,
  deviceName: string,
  controlName: string,
  descriptor: ControlDescriptor<Device>,
): void {
  const cmd = parent.command(controlName).description(descriptor.label)
  if (descriptor.description !== undefined) {
    cmd.addHelpText('after', `\n${descriptor.description}\n`)
  }
  for (const [paramName, param] of Object.entries(descriptor.params)) {
    cmd.option(...optionFlagsFor(paramName, param as ControlParam))
  }
  cmd.action(async (rawOptions: Record<string, string | boolean>, thisCmd: Command) => {
    const rootOpts = thisCmd.parent?.parent?.opts<InvokeRootOptions>()
    if (rootOpts === undefined) throw new Error('internal: missing root options')

    if (descriptor.requires === 'active' && rootOpts.active !== true) {
      throw new Error(
        `control ${deviceName}.${controlName} requires active mode — pass --active at the top level to arm it`,
      )
    }

    const args = collectArgs(descriptor, rawOptions)
    const baud = Number.parseInt(rootOpts.baud, 10)
    const transport = new SerialTransport({ path: rootOpts.port, baudRate: baud })
    const bus = new IKBus(transport, new Vehicle())
    const entry = findDeviceEntry(deviceName)
    if (entry === undefined) throw new Error(`internal: unknown ikbus device ${deviceName}`)
    const device = bus.registerDevice(entry.create())
    if (descriptor.requires === 'active') {
      device.mode = 'active'
    }

    try {
      await bus.start()
      // biome-ignore lint/suspicious/noExplicitAny: per-control param types are erased at this generic call site
      await descriptor.invoke(device, args as any)
      process.stdout.write(`${pc.green('ok')} ikbus ${deviceName}.${controlName}\n`)
    } catch (err) {
      if (err instanceof ArgValidationError) throw err
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`invoke failed: ${message}`)
    } finally {
      await bus.stop()
    }
  })
}

function addDBusControlSubcommand(
  parent: Command,
  deviceName: string,
  controlName: string,
  descriptor: ControlDescriptor<DisplayableDevice>,
): void {
  const cmd = parent.command(controlName).description(descriptor.label)
  if (descriptor.description !== undefined) {
    cmd.addHelpText('after', `\n${descriptor.description}\n`)
  }
  for (const [paramName, param] of Object.entries(descriptor.params)) {
    cmd.option(...optionFlagsFor(paramName, param as ControlParam))
  }
  cmd.action(async (rawOptions: Record<string, string | boolean>, thisCmd: Command) => {
    const rootOpts = thisCmd.parent?.parent?.opts<InvokeRootOptions>()
    if (rootOpts === undefined) throw new Error('internal: missing root options')

    if (descriptor.requires === 'active' && rootOpts.active !== true) {
      throw new Error(
        `control ${deviceName}.${controlName} requires active mode — pass --active at the top level to arm it`,
      )
    }

    const args = collectArgs(descriptor, rawOptions)
    const baud = Number.parseInt(rootOpts.baud, 10)
    const transport = new SerialTransport({ path: rootOpts.port, baudRate: baud })
    const bus = new DBus(transport)
    const entry = findDBusDeviceEntry(deviceName)
    if (entry === undefined) throw new Error(`internal: unknown dbus device ${deviceName}`)

    try {
      await bus.start()
      const device = entry.create(bus)
      // biome-ignore lint/suspicious/noExplicitAny: per-control param types are erased at this generic call site
      await descriptor.invoke(device, args as any)
      process.stdout.write(`${pc.green('ok')} dbus  ${deviceName}.${controlName}\n`)
      // Print the resulting state so D-bus reads surface their data.
      const state = device.state as Record<string, unknown>
      const populated = Object.entries(state).filter(([, v]) => v !== undefined && v !== false)
      for (const [k, v] of populated) {
        process.stdout.write(`  ${pc.dim(k.padEnd(20))} ${formatStateValue(v)}\n`)
      }
    } catch (err) {
      if (err instanceof ArgValidationError) throw err
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`invoke failed: ${message}`)
    } finally {
      await bus.stop()
    }
  })
}

function collectArgs(
  descriptor: ControlDescriptor<unknown>,
  rawOptions: Record<string, string | boolean>,
): Record<string, unknown> {
  const args: Record<string, unknown> = {}
  for (const [paramName, param] of Object.entries(descriptor.params)) {
    const raw = rawOptions[paramName]
    args[paramName] = coerceArg(
      paramName,
      typeof raw === 'string' ? raw : undefined,
      param as ControlParam,
    )
  }
  return args
}

function optionFlagsFor(name: string, param: ControlParam): [string, string] {
  const description = param.description ?? param.label ?? ''
  switch (param.kind) {
    case 'enum':
      return [`--${name} <${param.values.join('|')}>`, description]
    case 'number':
      return [`--${name} <n>`, description]
    case 'string':
      return [`--${name} <text>`, description]
    case 'boolean':
      return [`--${name} <true|false>`, description]
  }
}

function renderIKBusControlsHelp(deviceName: string): string {
  const entry = findDeviceEntry(deviceName)
  if (entry === undefined) return ''
  return renderControlsHelp(entry.controls)
}

function renderDBusControlsHelp(deviceName: string): string {
  const entry = findDBusDeviceEntry(deviceName)
  if (entry === undefined) return ''
  return renderControlsHelp(entry.controls)
}

// biome-ignore lint/suspicious/noExplicitAny: manifests target heterogeneous device types
function renderControlsHelp(controls: Record<string, ControlDescriptor<any>>): string {
  const lines: string[] = ['', 'Controls:']
  for (const [controlName, descriptor] of Object.entries(controls)) {
    const requires = descriptor.requires === 'active' ? pc.yellow(' [requires --active]') : ''
    lines.push(`  ${controlName.padEnd(22)} ${descriptor.label}${requires}`)
  }
  return `${lines.join('\n')}\n`
}

function formatStateValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    const maybeBytes = value as { data?: Uint8Array }
    if (maybeBytes.data instanceof Uint8Array) {
      return pc.dim(
        `[${Array.from(maybeBytes.data, (b) => b.toString(16).padStart(2, '0')).join(' ')}]`,
      )
    }
    try {
      return pc.dim(JSON.stringify(value))
    } catch {
      return pc.dim('[object]')
    }
  }
  return String(value)
}
