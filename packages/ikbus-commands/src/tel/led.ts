import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEL_LED = 0x2b

/**
 * Telephone LED state bytes (per BlueBus `ibus.h:454-461`).
 */
export const TEL_LED_VALUES = {
  OFF: 0x00,
  RED_ON: 0x01,
  RED_BLINK: 0x03,
  YELLOW_ON: 0x04,
  YELLOW_BLINK: 0x0c,
  GREEN_ON: 0x10,
  GREEN_BLINK: 0x30,
} as const

export type TelLEDState =
  | 'OFF'
  | 'RED_ON'
  | 'RED_BLINK'
  | 'YELLOW_ON'
  | 'YELLOW_BLINK'
  | 'GREEN_ON'
  | 'GREEN_BLINK'
  | 'UNKNOWN'

const LED_BY_BYTE = new Map<number, TelLEDState>(
  Object.entries(TEL_LED_VALUES).map(([name, value]) => [value, name as TelLEDState]),
)

export interface TelLEDFrame {
  state: TelLEDState
  rawByte: number
}

/** Parse a `0x2B` telephone-LED frame (TEL → displays multicast). */
export function parseTelLED(message: IBusMessage): TelLEDFrame {
  assertCommand(message, CMD_TEL_LED)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return { state: LED_BY_BYTE.get(byte) ?? 'UNKNOWN', rawByte: byte }
}

export interface BuildTelLEDArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  state: Exclude<TelLEDState, 'UNKNOWN'>
}

/** Build a `0x2B` telephone-LED frame.  Defaults source to TEL, dest to ANZV multicast. */
export function buildTelLED(args: BuildTelLEDArgs): IBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.TEL,
    args.destination ?? DEVICE_ADDRESSES.ANZV,
    [CMD_TEL_LED, TEL_LED_VALUES[args.state]],
  )
}
