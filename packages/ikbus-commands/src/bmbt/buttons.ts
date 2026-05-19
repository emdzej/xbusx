import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_BMBT_SOFT_BUTTONS = 0x47
export const CMD_BMBT_HARD_BUTTONS = 0x48

export type BMBTButtonState = 'PRESS' | 'HOLD' | 'RELEASE'

/** State bits: upper two bits of the button byte (`0xC0` mask). */
export const BMBT_STATE_BITS = {
  PRESS: 0x00,
  HOLD: 0x40,
  RELEASE: 0x80,
} as const

const STATE_MASK = 0xc0
const ID_MASK = 0x3f

const STATE_BY_BITS = new Map<number, BMBTButtonState>(
  Object.entries(BMBT_STATE_BITS).map(([name, bits]) => [bits, name as BMBTButtonState]),
)

/**
 * Hard-button identifiers per Wilhelm `bmbt/48.md` / BlueBus `ibus.h:122-141`.
 * Lower 6 bits of the button byte (`0x3F` mask).  Numeric IDs preserved for
 * unknown values.
 */
export type BMBTHardButton =
  | 'NEXT_TRACK'
  | 'PREV_TRACK'
  | 'PRESET_1'
  | 'PRESET_2'
  | 'PRESET_3'
  | 'PRESET_4'
  | 'PRESET_5'
  | 'PRESET_6'
  | 'AM'
  | 'FM'
  | 'MODE_PREV'
  | 'MODE_NEXT'
  | 'OVERLAY'
  | 'TONE'
  | 'SELECT'
  | 'CONFIRM'
  | 'POWER'
  | 'AUX_CLOCK'
  | 'TEL'
  | 'TAPE_SIDE'
  | 'TAPE_EJECT'
  | 'RDS_DOLBY_B'
  | 'DOLBY_C_TP'
  | 'MENU'

export const BMBT_HARD_BUTTON_IDS = {
  NEXT_TRACK: 0x00,
  PRESET_2: 0x01,
  PRESET_4: 0x02,
  PRESET_6: 0x03,
  TONE: 0x04,
  CONFIRM: 0x05,
  POWER: 0x06,
  AUX_CLOCK: 0x07,
  TEL: 0x08,
  PREV_TRACK: 0x10,
  PRESET_1: 0x11,
  PRESET_3: 0x12,
  PRESET_5: 0x13,
  TAPE_SIDE: 0x14,
  SELECT: 0x20,
  AM: 0x21,
  RDS_DOLBY_B: 0x22,
  MODE_PREV: 0x23,
  TAPE_EJECT: 0x24,
  OVERLAY: 0x30,
  FM: 0x31,
  DOLBY_C_TP: 0x32,
  MODE_NEXT: 0x33,
  MENU: 0x34,
} as const satisfies Record<BMBTHardButton, number>

const HARD_BUTTON_BY_ID = new Map<number, BMBTHardButton>(
  Object.entries(BMBT_HARD_BUTTON_IDS).map(([name, id]) => [id, name as BMBTHardButton]),
)

export interface BMBTHardButtonEvent {
  button: BMBTHardButton | 'UNKNOWN'
  buttonId: number
  state: BMBTButtonState
}

/** Parse a `0x48` BMBT hard-button event. */
export function parseBMBTHardButton(message: IKBusMessage): BMBTHardButtonEvent {
  assertCommand(message, CMD_BMBT_HARD_BUTTONS)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const state = STATE_BY_BITS.get(byte & STATE_MASK)
  if (state === undefined) {
    throw new CommandPayloadError(
      `Unknown BMBT button state in byte 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    )
  }
  const buttonId = byte & ID_MASK
  return {
    button: HARD_BUTTON_BY_ID.get(buttonId) ?? 'UNKNOWN',
    buttonId,
    state,
  }
}

export interface BuildBMBTHardButtonArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  button: BMBTHardButton | number
  state?: BMBTButtonState
}

/** Build a `0x48` BMBT hard-button frame.  Defaults source to BMBT, dest to GT. */
export function buildBMBTHardButton(args: BuildBMBTHardButtonArgs): IKBusMessage {
  const buttonId =
    typeof args.button === 'number' ? args.button & ID_MASK : BMBT_HARD_BUTTON_IDS[args.button]
  const state = BMBT_STATE_BITS[args.state ?? 'PRESS']
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.BMBT,
    args.destination ?? DEVICE_ADDRESSES.GT,
    [CMD_BMBT_HARD_BUTTONS, buttonId | state],
  )
}

/**
 * Soft buttons (`0x47` widescreen only).  Per Wilhelm `bmbt/47.md`:
 *   SELECT = `0b0000_1111` (0x0F)
 *   INFO   = `0b0011_1000` (0x38)
 */
export type BMBTSoftButton = 'INFO' | 'SELECT'

export const BMBT_SOFT_BUTTON_MASKS = {
  SELECT: 0x0f,
  INFO: 0x38,
} as const satisfies Record<BMBTSoftButton, number>

export interface BMBTSoftButtonEvent {
  button: BMBTSoftButton | 'UNKNOWN'
  state: BMBTButtonState
  rawByte: number
}

/** Parse a `0x47` BMBT soft-button event.  Soft buttons are widescreen-only. */
export function parseBMBTSoftButton(message: IKBusMessage): BMBTSoftButtonEvent {
  assertCommand(message, CMD_BMBT_SOFT_BUTTONS)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  const state = STATE_BY_BITS.get(byte & STATE_MASK)
  if (state === undefined) {
    throw new CommandPayloadError(
      `Unknown BMBT soft-button state in byte 0x${byte.toString(16).padStart(2, '0').toUpperCase()}`,
    )
  }
  const idBits = byte & ID_MASK
  let button: BMBTSoftButton | 'UNKNOWN' = 'UNKNOWN'
  if (idBits === BMBT_SOFT_BUTTON_MASKS.SELECT) button = 'SELECT'
  else if (idBits === BMBT_SOFT_BUTTON_MASKS.INFO) button = 'INFO'
  return { button, state, rawByte: byte }
}

export interface BuildBMBTSoftButtonArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  button: BMBTSoftButton
  state?: BMBTButtonState
}

/** Build a `0x47` BMBT soft-button frame.  Defaults dest to LOC broadcast. */
export function buildBMBTSoftButton(args: BuildBMBTSoftButtonArgs): IKBusMessage {
  const id = BMBT_SOFT_BUTTON_MASKS[args.button]
  const state = BMBT_STATE_BITS[args.state ?? 'PRESS']
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.BMBT,
    args.destination ?? DEVICE_ADDRESSES.LOC,
    [CMD_BMBT_SOFT_BUTTONS, id | state],
  )
}
