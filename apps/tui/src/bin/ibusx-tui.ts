#!/usr/bin/env node
import { IBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport } from '@emdzej/ibusx-transport-serial'
import { Command } from 'commander'
import { render } from 'ink'
import { createElement } from 'react'
import { App } from '../App.js'
import { registerAll } from '../registry.js'

interface Options {
  port: string
  baud: string
}

const program = new Command()
program
  .name('ibusx-tui')
  .description('Interactive TUI for inspecting I/K-bus devices.')
  .requiredOption('-p, --port <path>', 'Serial port path (e.g. /dev/ttyUSB0, COM3)')
  .option('-b, --baud <rate>', 'Baud rate', '9600')
  .action(async (options: Options) => {
    const baud = Number.parseInt(options.baud, 10)
    if (!Number.isFinite(baud) || baud <= 0) {
      throw new Error(`Invalid baud rate: ${options.baud}`)
    }
    const transport = new SerialTransport({ path: options.port, baudRate: baud })
    const bus = new IBus(transport, new Vehicle())
    const { entries, devices } = registerAll(bus)

    await bus.start()

    const instance = render(createElement(App, { bus, port: options.port, entries, devices }), {
      exitOnCtrlC: true,
      patchConsole: true,
    })

    try {
      await instance.waitUntilExit()
    } finally {
      await bus.stop()
    }
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`error: ${message}\n`)
  process.exit(1)
})
