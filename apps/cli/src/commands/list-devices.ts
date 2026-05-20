import { DBUS_ADDRESSES } from '@emdzej/dbus-protocol'
import { DEVICE_ADDRESSES } from '@emdzej/ikbus-protocol'
import type { Command } from 'commander'
import pc from 'picocolors'
import { DEVICE_REGISTRY } from '../registry.js'
import { DBUS_DEVICE_REGISTRY } from '../registry-dbus.js'
import type { BusKind } from '../types.js'

interface Options {
  bus?: BusKind | 'all'
}

export function registerListDevicesCommand(program: Command): void {
  program
    .command('list-devices')
    .description('List known I/K-bus and D-bus devices and which have a full twin implementation.')
    .option('--bus <kind>', 'Filter by bus: ikbus | dbus | all', 'all')
    .action((options: Options) => {
      const filter = options.bus ?? 'all'
      const header = `  ${'BUS'.padEnd(6)} ${'ADDR'.padEnd(6)} ${'NAME'.padEnd(10)} TWIN`
      process.stdout.write(`${pc.bold(header)}\n`)

      if (filter === 'ikbus' || filter === 'all') {
        const implemented = new Set(DEVICE_REGISTRY.filter((e) => e.implemented).map((e) => e.name))
        const entries = (Object.entries(DEVICE_ADDRESSES) as [string, number][]).sort(
          (a, b) => a[1] - b[1],
        )
        for (const [name, addr] of entries) {
          const hex = `0x${addr.toString(16).padStart(2, '0').toUpperCase()}`
          const status = implemented.has(name) ? pc.green('full') : pc.dim('stub')
          process.stdout.write(
            `  ${pc.cyan('ikbus'.padEnd(6))} ${hex.padEnd(6)} ${name.padEnd(10)} ${status}\n`,
          )
        }
      }

      if (filter === 'dbus' || filter === 'all') {
        const implemented = new Set(
          DBUS_DEVICE_REGISTRY.filter((e) => e.implemented).map((e) => e.name),
        )
        const entries = (Object.entries(DBUS_ADDRESSES) as [string, number][]).sort(
          (a, b) => a[1] - b[1],
        )
        for (const [name, addr] of entries) {
          const hex = `0x${addr.toString(16).padStart(2, '0').toUpperCase()}`
          const status = implemented.has(name) ? pc.green('full') : pc.dim('stub')
          process.stdout.write(
            `  ${pc.magenta('dbus'.padEnd(6))} ${hex.padEnd(6)} ${name.padEnd(10)} ${status}\n`,
          )
        }
      }

      process.stdout.write(
        `\n${pc.dim(
          'Variable-address D-bus ECUs (AB, ASC, EKP, LWS, AHL) are chassis-conditional and not pinned; see docs/protocol/dbus.md.',
        )}\n`,
      )
    })
}
