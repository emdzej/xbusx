import type { Command } from 'commander'
import { launchTui } from '../tui/launch.js'
import type { BusKind } from '../types.js'

interface Options {
  port?: string
  baud: string
  bus: BusKind
}

export function registerTuiCommand(program: Command): void {
  program
    .command('tui')
    .description('Launch the interactive TUI. With no --port, shows a serial-port picker first.')
    .option('-p, --port <path>', 'Serial port path (skips the picker)')
    .option('-b, --baud <rate>', 'Baud rate', '9600')
    .option('--bus <kind>', 'Which bus to attach (ikbus | dbus)', 'ikbus')
    .action(async (options: Options) => {
      const baud = Number.parseInt(options.baud, 10)
      if (!Number.isFinite(baud) || baud <= 0) {
        throw new Error(`Invalid baud rate: ${options.baud}`)
      }
      if (options.bus !== 'ikbus' && options.bus !== 'dbus') {
        throw new Error(`Invalid --bus value: ${options.bus} (expected ikbus or dbus)`)
      }
      await launchTui({
        ...(options.port !== undefined ? { port: options.port } : {}),
        baudRate: baud,
        bus: options.bus,
      })
    })
}
