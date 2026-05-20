import { DBUS_ADDRESSES, type DeviceAddress } from '@emdzej/dbus-protocol'
import { DS2_CONTROLS, ECU } from './ecu.js'

/**
 * Electronic Transmission Control twin (EGS — address `0x14`).
 *
 * Automatic-transmission controller, present on chassis fitted with an
 * automatic gearbox. Inherits the general DS2 commands from `ECU`;
 * transmission-specific reads (gear status, slip, ATF temperature) land
 * here as codecs become available.
 */
export class EGS extends ECU {
  readonly address: DeviceAddress = DBUS_ADDRESSES.EGS
  readonly name = 'EGS'
}

export const EGSControls = DS2_CONTROLS
