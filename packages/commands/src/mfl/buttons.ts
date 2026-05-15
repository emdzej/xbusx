import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_MFL_BUTTON = 0x3b

/** Steering-wheel button identifiers. */
export type MFLButton = 'FORWARD' | 'BACK' | 'RT' | 'VOICE'

/** Press / hold / release state encoded in the upper nibble of the byte. */
export type ButtonState = 'PRESS' | 'HOLD' | 'RELEASE'

/**
 * Button-id bits within the payload byte.  The selected button's bit is the
 * only one set in the `BUTTON_MASK` region (`0xC9`).
 */
export const BUTTON_BITS = {
  FORWARD: 0x01,
  BACK: 0x08,
  RT: 0x40,
  VOICE: 0x80,
} as const satisfies Record<MFLButton, number>

const BUTTON_MASK = 0xc9

/** State bits within the payload byte (mask `0x30`). */
export const STATE_BITS = {
  PRESS: 0x00,
  HOLD: 0x10,
  RELEASE: 0x20,
} as const satisfies Record<ButtonState, number>

const STATE_MASK = 0x30

const BUTTON_BY_BITS = new Map<number, MFLButton>(
  Object.entries(BUTTON_BITS).map(([name, bits]) => [bits, name as MFLButton]),
)

const STATE_BY_BITS = new Map<number, ButtonState>(
  Object.entries(STATE_BITS).map(([name, bits]) => [bits, name as ButtonState]),
)

export interface MFLButtonEvent {
  button: MFLButton
  state: ButtonState
}

/** Parse a `0x3B` MFL button frame. */
export function parseMFLButton(message: IBusMessage): MFLButtonEvent {
  assertCommand(message, CMD_MFL_BUTTON)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const button = BUTTON_BY_BITS.get(byte & BUTTON_MASK)
  if (button === undefined) {
    throw new CommandPayloadError(
      `Unknown MFL button bits in byte 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    )
  }
  const state = STATE_BY_BITS.get(byte & STATE_MASK)
  if (state === undefined) {
    throw new CommandPayloadError(
      `Unknown MFL button state in byte 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    )
  }
  return { button, state }
}

export interface BuildMFLButtonArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  button: MFLButton
  state?: ButtonState
}

/** Build a `0x3B` MFL button frame.  Defaults source to MFL, destination to RAD. */
export function buildMFLButton(args: BuildMFLButtonArgs): IBusMessage {
  const byte = BUTTON_BITS[args.button] | STATE_BITS[args.state ?? 'PRESS']
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.MFL,
    args.destination ?? DEVICE_ADDRESSES.RAD,
    [CMD_MFL_BUTTON, byte],
  )
}
