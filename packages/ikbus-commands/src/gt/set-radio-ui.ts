import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_GT_SET_RADIO_UI = 0x45

/**
 * `0x45` set-radio-UI byte (GT side of the radio↔GT arbitration handshake).
 * Per Wilhelm `gt/45.md`:
 *   bit 0 (0x01) — priority GT (radio go to background)
 *   bit 1 (0x02) — audio + OBC mode
 *   bit 4 (0x10) — new UI mode (MK3 v40+, MK4)
 *   bit 7 (0x80) — new UI hide (combined with bit 4)
 */
export const SET_RADIO_UI_BITS = {
  PRIORITY_GT: 0x01,
  AUDIO_OBC: 0x02,
  NEW_UI: 0x10,
  NEW_UI_HIDE: 0x80,
} as const

export interface SetRadioUI {
  priorityGt: boolean
  audioObc: boolean
  newUi: boolean
  newUiHide: boolean
  rawByte: number
}

/** Parse a `0x45` set-radio-UI frame. */
export function parseSetRadioUI(message: IBusMessage): SetRadioUI {
  assertCommand(message, CMD_GT_SET_RADIO_UI)
  assertPayloadLength(message, 2)
  const byte = message.payload[1]!
  return {
    priorityGt: (byte & SET_RADIO_UI_BITS.PRIORITY_GT) !== 0,
    audioObc: (byte & SET_RADIO_UI_BITS.AUDIO_OBC) !== 0,
    newUi: (byte & SET_RADIO_UI_BITS.NEW_UI) !== 0,
    newUiHide: (byte & SET_RADIO_UI_BITS.NEW_UI_HIDE) !== 0,
    rawByte: byte,
  }
}

export interface BuildSetRadioUIArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** When provided, takes precedence over the individual flags. */
  rawByte?: number
  priorityGt?: boolean
  audioObc?: boolean
  newUi?: boolean
  newUiHide?: boolean
}

/** Build a `0x45` set-radio-UI frame.  Defaults source to GT, dest to RAD. */
export function buildSetRadioUI(args: BuildSetRadioUIArgs): IBusMessage {
  const byte =
    args.rawByte !== undefined
      ? args.rawByte & 0xff
      : (args.priorityGt ? SET_RADIO_UI_BITS.PRIORITY_GT : 0) |
        (args.audioObc ? SET_RADIO_UI_BITS.AUDIO_OBC : 0) |
        (args.newUi ? SET_RADIO_UI_BITS.NEW_UI : 0) |
        (args.newUiHide ? SET_RADIO_UI_BITS.NEW_UI_HIDE : 0)
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.RAD, [
    CMD_GT_SET_RADIO_UI,
    byte,
  ])
}
