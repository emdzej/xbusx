import type { ControlsManifest, Device, IBus } from '@emdzej/ibusx-core'
import {
  BMBT,
  BMBTControls,
  CDC,
  CDCControls,
  EWS,
  EWSControls,
  GM,
  GMControls,
  GT,
  GTControls,
  IKE,
  IKEControls,
  LCM,
  LCMControls,
  MFL,
  MFLControls,
  MID,
  MIDControls,
  PDC,
  PDCControls,
  RAD,
  RADControls,
  RLS,
  RLSControls,
  TEL,
  TELControls,
} from '@emdzej/ibusx-devices'

export interface DeviceEntry {
  readonly name: string
  // biome-ignore lint/suspicious/noExplicitAny: per-device generics widen
  readonly create: () => Device<any, any>
  // biome-ignore lint/suspicious/noExplicitAny: same
  readonly controls: ControlsManifest<any>
}

export const DEVICE_REGISTRY: readonly DeviceEntry[] = [
  { name: 'IKE', create: () => new IKE(), controls: IKEControls },
  { name: 'MFL', create: () => new MFL(), controls: MFLControls },
  { name: 'GM', create: () => new GM(), controls: GMControls },
  { name: 'CDC', create: () => new CDC(), controls: CDCControls },
  { name: 'RAD', create: () => new RAD(), controls: RADControls },
  { name: 'BMBT', create: () => new BMBT(), controls: BMBTControls },
  { name: 'LCM', create: () => new LCM(), controls: LCMControls },
  { name: 'GT', create: () => new GT(), controls: GTControls },
  { name: 'TEL', create: () => new TEL(), controls: TELControls },
  { name: 'MID', create: () => new MID(), controls: MIDControls },
  { name: 'PDC', create: () => new PDC(), controls: PDCControls },
  { name: 'RLS', create: () => new RLS(), controls: RLSControls },
  { name: 'EWS', create: () => new EWS(), controls: EWSControls },
]

/**
 * Register all devices on the bus and return parallel arrays of entries and
 * the registered instances so callers can read state from them later.
 */
export function registerAll(bus: IBus): {
  entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: per-device generics widen
  devices: readonly Device<any, any>[]
} {
  // biome-ignore lint/suspicious/noExplicitAny: same
  const devices: Device<any, any>[] = []
  for (const entry of DEVICE_REGISTRY) {
    devices.push(bus.registerDevice(entry.create()))
  }
  return { entries: DEVICE_REGISTRY, devices }
}
