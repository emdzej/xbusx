import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_MID_BUTTON_PRESS = 0x31

/**
 * MID button press.  The payload is variable-length and device-dependent
 * (radio menu vs telephone vs OBC), so we expose the raw bytes.  See
 * BlueBus `ibus.h:395-401` for known release codes.
 */
export interface MIDButtonEvent {
  /** First byte after the command — usually a layout / mode indicator. */
  layoutByte: number
  /** Remaining bytes — interpretation depends on the layout. */
  data: Uint8Array
}

/** Parse a `0x31` MID button-press frame. */
export function parseMIDButton(message: IKBusMessage): MIDButtonEvent {
  assertCommand(message, CMD_MID_BUTTON_PRESS)
  assertMinPayloadLength(message, 2)
  return {
    layoutByte: message.payload[1]!,
    data: message.payload.slice(2),
  }
}

export interface BuildMIDButtonArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  layoutByte: number
  data?: ReadonlyArray<number> | Uint8Array
}

/** Build a `0x31` MID button-press frame.  Defaults source to MID, dest to RAD. */
export function buildMIDButton(args: BuildMIDButtonArgs): IKBusMessage {
  const data = args.data ?? []
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.MID,
    args.destination ?? DEVICE_ADDRESSES.RAD,
    [CMD_MID_BUTTON_PRESS, args.layoutByte, ...Array.from(data)],
  )
}
