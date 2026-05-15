import type { ControlDescriptor, ControlParam, Device } from '@emdzej/ibusx-core'
import { IBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport } from '@emdzej/ibusx-transport-serial'
import type { Command } from 'commander'
import pc from 'picocolors'
import { ArgValidationError, coerceArg } from '../coerce.js'
import { DEVICE_REGISTRY, findDeviceEntry } from '../registry.js'

interface InvokeRootOptions {
  port: string
  baud: string
  active?: boolean
}

export function registerInvokeCommand(program: Command): void {
  const invoke = program
    .command('invoke')
    .description('Invoke a control on a device via its ControlsManifest.')
    .requiredOption('-p, --port <path>', 'Serial port path (e.g. /dev/ttyUSB0, COM3)')
    .option('-b, --baud <rate>', 'Baud rate', '9600')
    .option('--active', 'Arm active-mode controls (refused by default for safety)')

  for (const entry of DEVICE_REGISTRY) {
    const deviceCmd = invoke
      .command(entry.name)
      .description(`Controls on ${entry.name}`)
      .addHelpText('after', renderControlsHelp(entry.name))

    for (const [controlName, descriptor] of Object.entries(entry.controls)) {
      addControlSubcommand(
        deviceCmd,
        entry.name,
        controlName,
        descriptor as ControlDescriptor<Device>,
      )
    }
  }
}

function addControlSubcommand(
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

    const args: Record<string, unknown> = {}
    for (const [paramName, param] of Object.entries(descriptor.params)) {
      const raw = rawOptions[paramName]
      args[paramName] = coerceArg(
        paramName,
        typeof raw === 'string' ? raw : undefined,
        param as ControlParam,
      )
    }

    const baud = Number.parseInt(rootOpts.baud, 10)
    const transport = new SerialTransport({ path: rootOpts.port, baudRate: baud })
    const bus = new IBus(transport, new Vehicle())
    const entry = findDeviceEntry(deviceName)
    if (entry === undefined) throw new Error(`internal: unknown device ${deviceName}`)
    const device = bus.registerDevice(entry.create())
    if (descriptor.requires === 'active') {
      device.mode = 'active'
    }

    try {
      await bus.start()
      // biome-ignore lint/suspicious/noExplicitAny: per-control param types are erased at this generic call site
      await descriptor.invoke(device, args as any)
      process.stdout.write(`${pc.green('ok')} ${deviceName}.${controlName}\n`)
    } catch (err) {
      if (err instanceof ArgValidationError) {
        throw err
      }
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`invoke failed: ${message}`)
    } finally {
      await bus.stop()
    }
  })
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

function renderControlsHelp(deviceName: string): string {
  const entry = findDeviceEntry(deviceName)
  if (entry === undefined) return ''
  const lines: string[] = ['', 'Controls:']
  for (const [controlName, descriptor] of Object.entries(entry.controls)) {
    const d = descriptor as ControlDescriptor<Device>
    const requires = d.requires === 'active' ? pc.yellow(' [requires --active]') : ''
    lines.push(`  ${controlName.padEnd(18)} ${d.label}${requires}`)
  }
  return `${lines.join('\n')}\n`
}
