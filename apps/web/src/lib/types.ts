import type { ControlsManifest } from '@emdzej/ibusx-core'

/**
 * Minimum shape the UI components need to render a device's state pane and
 * event-driven updates. Both the I/K-bus `Device` base and D-bus ECU twins
 * (e.g. `DME`) satisfy this structurally, so `StatePane`/`DeviceList` work
 * uniformly across buses without knowing which orchestrator owns them.
 */
export interface DisplayableDevice {
  readonly address: number
  readonly name: string
  readonly state: Readonly<Record<string, unknown>>
  readonly events: {
    /**
     * Loose signature that accepts both `Device`'s TypedEmitter (returns
     * void, payload only for non-void events) and the ECU-twin TypedEmitter
     * pattern. The web app monkey-patches this to inject log entries.
     */
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous event payloads + return shapes
    emit: (event: any, ...args: any[]) => any
  }
}

/**
 * Registry entry exposed to the UI. The `create` signature differs per bus
 * (IKBus's devices have no constructor args; DBus ECU twins take the bus
 * reference), so registration is handled inside each registry module — the
 * UI only sees the resulting entries + devices.
 */
export interface DisplayableEntry {
  readonly name: string
  readonly implemented: boolean
  // biome-ignore lint/suspicious/noExplicitAny: per-device control params widen
  readonly controls: ControlsManifest<any>
}
