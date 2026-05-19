import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_TITLE_TEXT = 0x23

/**
 * Parsed `0x23` title-text frame.  The layout and options bytes have
 * device-specific meanings (per Wilhelm `radio/23.md` and `telephone/23.md`);
 * this codec exposes them as raw bytes — semantic decoding is the caller's
 * responsibility.
 */
export interface TitleText {
  /** Layout byte — encodes source / region within the title area. */
  layoutByte: number
  /** Options byte — typically `0x20` UPDATE or `0x30` SET. */
  optionsByte: number
  /** Decoded ASCII string.  Non-ASCII / special-glyph bytes survive as-is. */
  text: string
  /** Raw string bytes, for callers that need to inspect special glyphs (e.g. `0x9D`). */
  rawTextBytes: Uint8Array
}

/** Parse a `0x23` title-text frame (radio / telephone → display). */
export function parseTitleText(message: IBusMessage): TitleText {
  assertCommand(message, CMD_RAD_TITLE_TEXT)
  assertMinPayloadLength(message, 3)
  const layoutByte = message.payload[1]!
  const optionsByte = message.payload[2]!
  const rawTextBytes = message.payload.slice(3)
  let text = ''
  for (const b of rawTextBytes) {
    text += String.fromCharCode(b)
  }
  return { layoutByte, optionsByte, text, rawTextBytes }
}

export interface BuildTitleTextArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  layoutByte: number
  optionsByte: number
  text: string
  /** Optional raw bytes — used when the title contains non-ASCII glyphs. */
  rawTextBytes?: ReadonlyArray<number> | Uint8Array
}

/** Build a `0x23` title-text frame.  Defaults source to RAD, destination to GT. */
export function buildTitleText(args: BuildTitleTextArgs): IBusMessage {
  let textBytes: ReadonlyArray<number> | Uint8Array
  if (args.rawTextBytes !== undefined) {
    textBytes = args.rawTextBytes
  } else {
    const arr = new Uint8Array(args.text.length)
    for (let i = 0; i < args.text.length; i++) arr[i] = args.text.charCodeAt(i) & 0xff
    textBytes = arr
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.RAD, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_RAD_TITLE_TEXT,
    args.layoutByte,
    args.optionsByte,
    ...Array.from(textBytes),
  ])
}
