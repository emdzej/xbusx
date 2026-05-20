import type { ControlsManifest } from '@emdzej/ibusx-core'

/**
 * Minimum shape the CLI/TUI need to render a device's state pane and
 * react to its events. Both the I/K-bus `Device` base and D-bus ECU
 * twins (DME, EGS, …) satisfy this structurally, so the TUI components
 * work uniformly across buses.
 */
export interface DisplayableDevice {
  readonly address: number
  readonly name: string
  readonly state: Readonly<Record<string, unknown>>
  readonly events: {
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous event payloads + return shapes
    emit: (event: any, ...args: any[]) => any
  }
}

/**
 * Registry entry exposed to the CLI/TUI. The `create` signature differs
 * per bus (I/K-bus devices have no constructor args; D-bus ECU twins
 * take the `DBus` reference), so each registry module handles its own
 * construction and exposes a `register()` helper. The CLI consumes only
 * the resulting entries + devices.
 */
export interface DisplayableEntry {
  readonly name: string
  readonly implemented: boolean
  // biome-ignore lint/suspicious/noExplicitAny: per-device control params widen
  readonly controls: ControlsManifest<any>
}

export type BusKind = 'ikbus' | 'dbus'
