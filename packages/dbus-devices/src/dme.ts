import { DBUS_ADDRESSES, type DeviceAddress } from '@emdzej/dbus-protocol'
import { DS2_CONTROLS, ECU } from './ecu.js'

/**
 * Digital Motor Electronics twin (engine controller — address `0x12`).
 *
 * Inherits the full DS2 general-command surface from `ECU`
 * (identification, fault memory, coding, reset, terminate). Engine-
 * specific commands (live data, adaptation values, etc.) will land here
 * as the codec catalogue grows.
 */
export class DME extends ECU {
  readonly address: DeviceAddress = DBUS_ADDRESSES.DME
  readonly name = 'DME'
}

/**
 * Control manifest for the DME. Currently just the generic DS2 controls —
 * engine-specific reads will be appended once codecs land.
 */
export const DMEControls = DS2_CONTROLS
