#!/usr/bin/env node
import { Command } from 'commander'
import { registerInvokeCommand } from '../commands/invoke.js'
import { registerListDevicesCommand } from '../commands/list-devices.js'
import { registerListPortsCommand } from '../commands/list-ports.js'
import { registerMonitorCommand } from '../commands/monitor.js'

const program = new Command()

program
  .name('ibusx')
  .description('CLI for inspecting and interacting with BMW I/K-bus devices.')
  .version('0.0.0')

registerListPortsCommand(program)
registerListDevicesCommand(program)
registerMonitorCommand(program)
registerInvokeCommand(program)

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`error: ${message}\n`)
  process.exit(1)
})
