import { DEVICE_ADDRESSES } from '@emdzej/ikbus-protocol'
import type { Command } from 'commander'
import pc from 'picocolors'
import { DEVICE_REGISTRY } from '../registry.js'

export function registerListDevicesCommand(program: Command): void {
  program
    .command('list-devices')
    .description(
      'List every known I/K-bus device address and which ones have a full twin implementation.',
    )
    .action(() => {
      const implemented = new Set(DEVICE_REGISTRY.filter((e) => e.implemented).map((e) => e.name))
      const entries = Object.entries(DEVICE_ADDRESSES) as [string, number][]
      entries.sort((a, b) => a[1] - b[1])

      const header = `  ${'ADDR'.padEnd(6)} ${'NAME'.padEnd(8)} TWIN`
      process.stdout.write(`${pc.bold(header)}\n`)
      for (const [name, addr] of entries) {
        const hex = `0x${addr.toString(16).padStart(2, '0').toUpperCase()}`
        const status = implemented.has(name) ? pc.green('full') : pc.dim('stub')
        process.stdout.write(`  ${hex.padEnd(6)} ${name.padEnd(8)} ${status}\n`)
      }
      process.stdout.write(
        `\n${pc.dim(`Total: ${entries.length} addresses, ${implemented.size} with full twins.`)}\n`,
      )
    })
}
