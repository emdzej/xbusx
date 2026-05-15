import type { Command } from 'commander'
import pc from 'picocolors'

export function registerListPortsCommand(program: Command): void {
  program
    .command('list-ports')
    .description('Enumerate serial ports visible to the host OS.')
    .action(async () => {
      // Dynamic import so users without serialport's native bindings built can
      // still run the other subcommands (e.g. `list-devices`).
      const { SerialPort } = await import('serialport')
      const ports = await SerialPort.list()
      if (ports.length === 0) {
        process.stdout.write(`${pc.dim('No serial ports detected.')}\n`)
        return
      }
      const header = `  ${'PATH'.padEnd(28)} ${'MANUFACTURER'.padEnd(22)} ${'PRODUCT'.padEnd(22)} SERIAL`
      process.stdout.write(`${pc.bold(header)}\n`)
      for (const p of ports) {
        const manufacturer = p.manufacturer ?? ''
        const product = p.productId ?? ''
        const serial = p.serialNumber ?? ''
        process.stdout.write(
          `  ${p.path.padEnd(28)} ${manufacturer.padEnd(22)} ${product.padEnd(22)} ${serial}\n`,
        )
      }
    })
}
