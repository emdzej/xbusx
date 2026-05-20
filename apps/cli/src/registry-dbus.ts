import { type DBus, DME, DMEControls, EGS, EGSControls } from '@emdzej/dbus-devices'
import type { DisplayableDevice, DisplayableEntry } from './types.js'

export interface DBusDeviceEntry extends DisplayableEntry {
  readonly create: (bus: DBus) => DisplayableDevice
}

/**
 * D-bus ECU registry. Each entry's `create` instantiates the twin against
 * the supplied `DBus` orchestrator. D-bus is request/response, so there
 * is no central dispatcher to "register" against — the bus just routes
 * the reply of the in-flight request back to whoever called
 * `bus.request()`.
 */
export const DBUS_DEVICE_REGISTRY: readonly DBusDeviceEntry[] = [
  { name: 'DME', implemented: true, controls: DMEControls, create: (bus) => new DME(bus) },
  { name: 'EGS', implemented: true, controls: EGSControls, create: (bus) => new EGS(bus) },
]

export function registerAllDBus(bus: DBus): {
  entries: readonly DBusDeviceEntry[]
  devices: readonly DisplayableDevice[]
} {
  const devices = DBUS_DEVICE_REGISTRY.map((entry) => entry.create(bus))
  return { entries: DBUS_DEVICE_REGISTRY, devices }
}

export function findDBusDeviceEntry(name: string): DBusDeviceEntry | undefined {
  const upper = name.toUpperCase()
  return DBUS_DEVICE_REGISTRY.find((entry) => entry.name === upper)
}
