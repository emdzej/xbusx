#!/usr/bin/env node
import { Command } from 'commander'
import { registerInvokeCommand } from '../commands/invoke.js'
import { registerListDevicesCommand } from '../commands/list-devices.js'
import { registerListPortsCommand } from '../commands/list-ports.js'
import { registerMonitorCommand } from '../commands/monitor.js'
import { registerTuiCommand } from '../commands/tui.js'
import { launchTui } from '../tui/launch.js'

const program = new Command()

program
  .name('ibusx')
  .description(
    'BMW I/K-bus and D-bus (DS2) toolkit. Run with no arguments to launch the interactive TUI on the I/K-bus (use `ibusx tui --bus dbus` for D-bus).',
  )
  .version('0.0.0')

registerListPortsCommand(program)
registerListDevicesCommand(program)
registerMonitorCommand(program)
registerInvokeCommand(program)
registerTuiCommand(program)

// Default action: bare `ibusx` (no subcommand, no flags) launches the TUI
// with the serial-port picker.  Anything else flows through Commander's
// normal subcommand routing.
const noArgs = process.argv.length <= 2
if (noArgs) {
  launchTui({ baudRate: 9600, bus: 'ikbus' }).catch(handleFatal)
} else {
  program.parseAsync(process.argv).catch(handleFatal)
}

function handleFatal(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`error: ${message}\n`)
  process.exit(1)
}
