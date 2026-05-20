import { DBus } from '@emdzej/dbus-devices'
import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport } from '@emdzej/transport-serial'
import { render } from 'ink'
import { createElement } from 'react'
import { registerAll } from '../registry.js'
import { registerAllDBus } from '../registry-dbus.js'
import type { BusKind, DisplayableDevice, DisplayableEntry } from '../types.js'
import { TuiRoot } from './TuiRoot.js'

export interface LaunchOptions {
  /** When omitted the TUI shows a port picker first. */
  port?: string
  baudRate: number
  bus: BusKind
}

export interface AttachedSession {
  readonly bus: IKBus | DBus
  readonly busKind: BusKind
  readonly entries: readonly DisplayableEntry[]
  readonly devices: readonly DisplayableDevice[]
  /** I/K-bus only — D-bus devices have no `mode` field. */
  readonly setActive: (active: boolean) => void
  stop(): Promise<void>
}

/**
 * Render the TUI and block until the user exits. Used by both the `tui`
 * subcommand and the bare `ibusx` default action — same code path, only
 * the initial-port hint and bus selection differ.
 */
export async function launchTui(options: LaunchOptions): Promise<void> {
  let openedSession: AttachedSession | undefined

  async function attach(port: string): Promise<AttachedSession> {
    if (options.bus === 'ikbus') {
      const transport = new SerialTransport({ path: port, baudRate: options.baudRate })
      const bus = new IKBus(transport, new Vehicle())
      const { entries, devices } = registerAll(bus)
      await bus.start()
      const session: AttachedSession = {
        bus,
        busKind: 'ikbus',
        entries,
        devices: devices as readonly DisplayableDevice[],
        setActive: (active) => {
          for (const d of bus.devices) d.mode = active ? 'active' : 'passive'
        },
        stop: () => bus.stop(),
      }
      openedSession = session
      return session
    }

    const transport = new SerialTransport({ path: port, baudRate: options.baudRate })
    const bus = new DBus(transport)
    const { entries, devices } = registerAllDBus(bus)
    await bus.start()
    const session: AttachedSession = {
      bus,
      busKind: 'dbus',
      entries,
      devices,
      // D-bus has no device.mode — every request sends a frame. The
      // safety toggle still gates `requires: 'active'` controls in the
      // App's invoke path.
      setActive: () => {},
      stop: () => bus.stop(),
    }
    openedSession = session
    return session
  }

  const instance = render(
    createElement(TuiRoot, {
      ...(options.port !== undefined ? { initialPort: options.port } : {}),
      baudRate: options.baudRate,
      bus: options.bus,
      attach,
    }),
    { exitOnCtrlC: true, patchConsole: true },
  )

  try {
    await instance.waitUntilExit()
  } finally {
    if (openedSession !== undefined) await openedSession.stop()
  }
}
