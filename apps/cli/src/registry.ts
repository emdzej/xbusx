import type { ControlsManifest, Device, IBus } from '@emdzej/ibusx-core'
import {
  ALC,
  ALWR,
  BMBT,
  BMBTControls,
  CCM,
  CDC,
  CDCControls,
  CDCD,
  CID,
  CVM,
  DIA,
  DSP,
  DSPC,
  DWA,
  EDC,
  EHC,
  EKM,
  ETS,
  EWS,
  EWSControls,
  FBZV,
  FHK,
  FID,
  FMBT,
  GM,
  GMControls,
  GT,
  GTControls,
  GTF,
  HKM,
  IHKA,
  IKE,
  IKEControls,
  IRIS,
  JBIT,
  LCM,
  LCMControls,
  MFL,
  MFLControls,
  MID,
  MID_E31,
  MIDControls,
  MRS,
  NAJ,
  NAV,
  NAVControls,
  PDC,
  PDCControls,
  RAD,
  RADControls,
  RCC,
  RDC,
  RFIR,
  RLS,
  RLSControls,
  SDRS,
  SES,
  SHD,
  SM,
  SMB,
  SMF_E31,
  SPMBT,
  STH,
  TCU,
  TEL,
  TELControls,
  VID,
} from '@emdzej/ibusx-devices'

/**
 * A device entry — its constructor, the controls manifest it exposes, a
 * short display label, and whether it's a full twin (decoded state + events)
 * or a stub placeholder.  CLI, TUI, and web walk this list to register
 * devices and to render UI.
 */
export interface DeviceEntry {
  readonly name: string
  /** True for devices with full codec coverage; false for stub-only placeholders. */
  readonly implemented: boolean
  // biome-ignore lint/suspicious/noExplicitAny: per-device control param widens
  readonly create: () => Device<any, any>
  // biome-ignore lint/suspicious/noExplicitAny: same
  readonly controls: ControlsManifest<any>
}

const EMPTY_CONTROLS = {} as ControlsManifest<Device>

/**
 * Every known I/K-bus device.  Full twins come first; stubs follow.  Stubs
 * appear in the bus registry so frames addressed to them are accepted, but
 * they have no decoded state or controls.
 */
export const DEVICE_REGISTRY: readonly DeviceEntry[] = [
  { name: 'IKE', implemented: true, create: () => new IKE(), controls: IKEControls },
  { name: 'MFL', implemented: true, create: () => new MFL(), controls: MFLControls },
  { name: 'GM', implemented: true, create: () => new GM(), controls: GMControls },
  { name: 'CDC', implemented: true, create: () => new CDC(), controls: CDCControls },
  { name: 'RAD', implemented: true, create: () => new RAD(), controls: RADControls },
  { name: 'BMBT', implemented: true, create: () => new BMBT(), controls: BMBTControls },
  { name: 'LCM', implemented: true, create: () => new LCM(), controls: LCMControls },
  { name: 'GT', implemented: true, create: () => new GT(), controls: GTControls },
  { name: 'TEL', implemented: true, create: () => new TEL(), controls: TELControls },
  { name: 'MID', implemented: true, create: () => new MID(), controls: MIDControls },
  { name: 'PDC', implemented: true, create: () => new PDC(), controls: PDCControls },
  { name: 'RLS', implemented: true, create: () => new RLS(), controls: RLSControls },
  { name: 'EWS', implemented: true, create: () => new EWS(), controls: EWSControls },
  { name: 'NAV', implemented: true, create: () => new NAV(), controls: NAVControls },

  { name: 'SHD', implemented: false, create: () => new SHD(), controls: EMPTY_CONTROLS },
  { name: 'HKM', implemented: false, create: () => new HKM(), controls: EMPTY_CONTROLS },
  { name: 'RCC', implemented: false, create: () => new RCC(), controls: EMPTY_CONTROLS },
  { name: 'EDC', implemented: false, create: () => new EDC(), controls: EMPTY_CONTROLS },
  { name: 'CCM', implemented: false, create: () => new CCM(), controls: EMPTY_CONTROLS },
  { name: 'DIA', implemented: false, create: () => new DIA(), controls: EMPTY_CONTROLS },
  { name: 'FBZV', implemented: false, create: () => new FBZV(), controls: EMPTY_CONTROLS },
  { name: 'GTF', implemented: false, create: () => new GTF(), controls: EMPTY_CONTROLS },
  { name: 'DWA', implemented: false, create: () => new DWA(), controls: EMPTY_CONTROLS },
  { name: 'CID', implemented: false, create: () => new CID(), controls: EMPTY_CONTROLS },
  { name: 'FMBT', implemented: false, create: () => new FMBT(), controls: EMPTY_CONTROLS },
  { name: 'JBIT', implemented: false, create: () => new JBIT(), controls: EMPTY_CONTROLS },
  { name: 'SPMBT', implemented: false, create: () => new SPMBT(), controls: EMPTY_CONTROLS },
  { name: 'IHKA', implemented: false, create: () => new IHKA(), controls: EMPTY_CONTROLS },
  { name: 'ALC', implemented: false, create: () => new ALC(), controls: EMPTY_CONTROLS },
  { name: 'EKM', implemented: false, create: () => new EKM(), controls: EMPTY_CONTROLS },
  { name: 'DSP', implemented: false, create: () => new DSP(), controls: EMPTY_CONTROLS },
  { name: 'STH', implemented: false, create: () => new STH(), controls: EMPTY_CONTROLS },
  { name: 'RDC', implemented: false, create: () => new RDC(), controls: EMPTY_CONTROLS },
  { name: 'SMF_E31', implemented: false, create: () => new SMF_E31(), controls: EMPTY_CONTROLS },
  { name: 'SM', implemented: false, create: () => new SM(), controls: EMPTY_CONTROLS },
  { name: 'SDRS', implemented: false, create: () => new SDRS(), controls: EMPTY_CONTROLS },
  { name: 'CDCD', implemented: false, create: () => new CDCD(), controls: EMPTY_CONTROLS },
  { name: 'ALWR', implemented: false, create: () => new ALWR(), controls: EMPTY_CONTROLS },
  { name: 'CVM', implemented: false, create: () => new CVM(), controls: EMPTY_CONTROLS },
  { name: 'ETS', implemented: false, create: () => new ETS(), controls: EMPTY_CONTROLS },
  { name: 'FID', implemented: false, create: () => new FID(), controls: EMPTY_CONTROLS },
  { name: 'MRS', implemented: false, create: () => new MRS(), controls: EMPTY_CONTROLS },
  { name: 'FHK', implemented: false, create: () => new FHK(), controls: EMPTY_CONTROLS },
  { name: 'EHC', implemented: false, create: () => new EHC(), controls: EMPTY_CONTROLS },
  { name: 'SES', implemented: false, create: () => new SES(), controls: EMPTY_CONTROLS },
  { name: 'RFIR', implemented: false, create: () => new RFIR(), controls: EMPTY_CONTROLS },
  { name: 'NAJ', implemented: false, create: () => new NAJ(), controls: EMPTY_CONTROLS },
  { name: 'TCU', implemented: false, create: () => new TCU(), controls: EMPTY_CONTROLS },
  { name: 'MID_E31', implemented: false, create: () => new MID_E31(), controls: EMPTY_CONTROLS },
  { name: 'SMB', implemented: false, create: () => new SMB(), controls: EMPTY_CONTROLS },
  { name: 'IRIS', implemented: false, create: () => new IRIS(), controls: EMPTY_CONTROLS },
  { name: 'DSPC', implemented: false, create: () => new DSPC(), controls: EMPTY_CONTROLS },
  { name: 'VID', implemented: false, create: () => new VID(), controls: EMPTY_CONTROLS },
]

/**
 * Register every device in the registry against the bus.  Returns parallel
 * arrays of entries and the freshly-registered instances so callers can read
 * state from them later.
 */
export function registerAll(bus: IBus): {
  entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  devices: readonly Device<any, any>[]
} {
  // biome-ignore lint/suspicious/noExplicitAny: same
  const devices: Device<any, any>[] = []
  for (const entry of DEVICE_REGISTRY) {
    devices.push(bus.registerDevice(entry.create()))
  }
  return { entries: DEVICE_REGISTRY, devices }
}

export function findDeviceEntry(name: string): DeviceEntry | undefined {
  const upper = name.toUpperCase()
  return DEVICE_REGISTRY.find((entry) => entry.name === upper)
}
