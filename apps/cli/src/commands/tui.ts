import type { Command } from 'commander'
import { launchTui } from '../tui/launch.js'

interface Options {
  port?: string
  baud: string
}

export function registerTuiCommand(program: Command): void {
  program
    .command('tui')
    .description('Launch the interactive TUI. With no --port, shows a serial-port picker first.')
    .option('-p, --port <path>', 'Serial port path (skips the picker)')
    .option('-b, --baud <rate>', 'Baud rate', '9600')
    .action(async (options: Options) => {
      const baud = Number.parseInt(options.baud, 10)
      if (!Number.isFinite(baud) || baud <= 0) {
        throw new Error(`Invalid baud rate: ${options.baud}`)
      }
      await launchTui({
        ...(options.port !== undefined ? { port: options.port } : {}),
        baudRate: baud,
      })
    })
}
