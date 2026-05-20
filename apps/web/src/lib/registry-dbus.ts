import { type DBus, DME, DMEControls } from '@emdzej/dbus-devices'
import type { DisplayableDevice, DisplayableEntry } from './types.js'

/**
 * Per-ECU registry entry on the D-bus side. D-bus ECU twins take their
 * `DBus` orchestrator in the constructor, so `create` here is a closure
 * over the bus instance rather than the no-arg create used on I/K-bus.
 */
export interface DBusDeviceEntry extends DisplayableEntry {
  readonly create: (bus: DBus) => DisplayableDevice
}

/**
 * D-bus ECU registry. Only the engine controller (DME) is wired so far —
 * the rest follow as twins land in `@emdzej/dbus-devices`.
 *
 * Each entry's `create` builds the twin but does **not** register it on
 * the bus — D-bus is request/response, so there's no central dispatch to
 * register against. The DBus orchestrator just routes the reply of the
 * one in-flight request back to whoever called `bus.request()`.
 */
export const DBUS_DEVICE_REGISTRY: readonly DBusDeviceEntry[] = [
  { name: 'DME', implemented: true, controls: DMEControls, create: (bus) => new DME(bus) },
]

/**
 * Instantiate every D-bus ECU twin for this bus. Returns parallel arrays
 * so the UI can iterate either by entry metadata or by live device.
 */
export function registerAllDBus(bus: DBus): {
  entries: readonly DBusDeviceEntry[]
  devices: readonly DisplayableDevice[]
} {
  const devices = DBUS_DEVICE_REGISTRY.map((entry) => entry.create(bus))
  return { entries: DBUS_DEVICE_REGISTRY, devices }
}
