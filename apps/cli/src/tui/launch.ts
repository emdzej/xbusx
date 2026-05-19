import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport } from '@emdzej/transport-serial'
import { render } from 'ink'
import { createElement } from 'react'
import { registerAll } from '../registry.js'
import { TuiRoot } from './TuiRoot.js'

export interface LaunchOptions {
  /** When omitted the TUI shows a port picker first. */
  port?: string
  baudRate: number
}

/**
 * Render the TUI and block until the user exits.  Used by both the `tui`
 * subcommand and the bare `ibusx` default action — same code path, only the
 * initial-port hint differs.
 */
export async function launchTui(options: LaunchOptions): Promise<void> {
  let openedBus: IKBus | undefined

  async function attach(port: string): Promise<{
    bus: IKBus
    entries: ReturnType<typeof registerAll>['entries']
    devices: ReturnType<typeof registerAll>['devices']
  }> {
    const transport = new SerialTransport({ path: port, baudRate: options.baudRate })
    const bus = new IKBus(transport, new Vehicle())
    const { entries, devices } = registerAll(bus)
    await bus.start()
    openedBus = bus
    return { bus, entries, devices }
  }

  const instance = render(
    createElement(TuiRoot, {
      ...(options.port !== undefined ? { initialPort: options.port } : {}),
      baudRate: options.baudRate,
      attach,
    }),
    { exitOnCtrlC: true, patchConsole: true },
  )

  try {
    await instance.waitUntilExit()
  } finally {
    if (openedBus !== undefined) await openedBus.stop()
  }
}
