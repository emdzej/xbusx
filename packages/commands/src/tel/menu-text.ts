import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEL_MENU_TEXT = 0x21

/**
 * `0x21` "Menu Text: Telephone" — paints a layout's worth of menu text
 * onto the GT (or MID).
 *
 * Source: Wilhelm `telephone/21.md`.  Direction TEL (`0xC8`) → GT
 * (`0x3B`) (the canonical case Wilhelm describes); the same command also
 * goes TEL → MID (`0xC0`) on E46/E83/E85 chassis.
 *
 * Wire layout:
 *
 *   payload[0]   command (`0x21`)
 *   payload[1]   layout — `TELMenuLayout` (DIAL / DIRECTORY / TOP_8 /
 *                LIST / DETAIL)
 *   payload[2]   function — context discriminator (NULL / CONTACT /
 *                DIGIT / SOS / NAVIGATION / INFO)
 *   payload[3]   options — bitfield: INDEX (low 5 bits) | CLEAR | BUFFER
 *                | HIGHLIGHT
 *   payload[4..] string  — null-terminated; `0x06` is a line-feed control
 *                code that advances the cursor to the next field index
 */
export const TEL_MENU_LAYOUT = {
  DIAL: 0x42,
  DIRECTORY: 0x43,
  TOP_8: 0x80,
  /** SMS index, "Bluetooth Pairing" */
  LIST: 0xf0,
  /** SMS message, SOS/Emergency */
  DETAIL: 0xf1,
} as const

export type TELMenuLayout = (typeof TEL_MENU_LAYOUT)[keyof typeof TEL_MENU_LAYOUT]

export const TEL_MENU_FUNCTION = {
  NULL: 0x00,
  CONTACT: 0x01,
  DIGIT: 0x02,
  SOS: 0x05,
  NAVIGATION: 0x07,
  INFO: 0x08,
} as const

export type TELMenuFunction = (typeof TEL_MENU_FUNCTION)[keyof typeof TEL_MENU_FUNCTION]

/** Options bitfield bits. */
export const TEL_MENU_OPT_INDEX_MASK = 0x1f
export const TEL_MENU_OPT_CLEAR = 0x20
export const TEL_MENU_OPT_BUFFER = 0x40
export const TEL_MENU_OPT_HIGHLIGHT = 0x80

export interface TELMenuText {
  layout: number
  function: number
  /** Field index this write starts at (0..31). */
  index: number
  /** Whether the `CLEAR` bit is set (first message of a redraw). */
  clear: boolean
  /** Whether the `BUFFER` bit is set (intermediate message). */
  buffer: boolean
  /** Whether the `HIGHLIGHT` bit is set. */
  highlight: boolean
  /**
   * Raw payload bytes after the options byte.  Wilhelm leaves the string
   * uninterpreted apart from `0x00` NUL and `0x06` LF — we do the same
   * (caller can `parseTELMenuTextSegments` to split on `0x06`).
   */
  data: Uint8Array
}

export function parseTELMenuText(message: IBusMessage): TELMenuText {
  assertCommand(message, CMD_TEL_MENU_TEXT)
  // Need at least cmd + layout + function + options = 4 bytes.  Some
  // frames (e.g. Wilhelm's DIAL "C8 06 3B 21 42 02 20 B4") have no
  // string body.
  assertMinPayloadLength(message, 4)
  const layout = message.payload[1]!
  const fn = message.payload[2]!
  const opts = message.payload[3]!
  return {
    layout,
    function: fn,
    index: opts & TEL_MENU_OPT_INDEX_MASK,
    clear: (opts & TEL_MENU_OPT_CLEAR) !== 0,
    buffer: (opts & TEL_MENU_OPT_BUFFER) !== 0,
    highlight: (opts & TEL_MENU_OPT_HIGHLIGHT) !== 0,
    data: message.payload.slice(4),
  }
}

/**
 * Split the raw string bytes of a `0x21` frame into individual field
 * segments using the `0x06` LF control character as separator.  The
 * trailing `0x00` (NUL terminator), if present, is dropped.  Returned
 * strings are ASCII-decoded (Wilhelm specifies ASCII).
 */
export function parseTELMenuTextSegments(data: Uint8Array): string[] {
  const segments: string[] = []
  let current = ''
  for (const byte of data) {
    if (byte === 0x00) break
    if (byte === 0x06) {
      segments.push(current)
      current = ''
      continue
    }
    current += String.fromCharCode(byte)
  }
  segments.push(current)
  return segments
}

export interface BuildTELMenuTextArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  layout: number
  function: number
  index?: number
  clear?: boolean
  buffer?: boolean
  highlight?: boolean
  data: Uint8Array | ReadonlyArray<number>
}

export function buildTELMenuText(args: BuildTELMenuTextArgs): IBusMessage {
  if (args.layout < 0 || args.layout > 0xff) {
    throw new CommandPayloadError(`layout 0x${args.layout.toString(16)} out of byte range`)
  }
  if (args.function < 0 || args.function > 0xff) {
    throw new CommandPayloadError(`function 0x${args.function.toString(16)} out of byte range`)
  }
  const idx = args.index ?? 0
  if (idx < 0 || idx > TEL_MENU_OPT_INDEX_MASK) {
    throw new CommandPayloadError(`index ${idx} out of 5-bit range`)
  }
  let opts = idx & TEL_MENU_OPT_INDEX_MASK
  if (args.clear) opts |= TEL_MENU_OPT_CLEAR
  if (args.buffer) opts |= TEL_MENU_OPT_BUFFER
  if (args.highlight) opts |= TEL_MENU_OPT_HIGHLIGHT
  const data = args.data instanceof Uint8Array ? Array.from(args.data) : Array.from(args.data)
  for (const b of data) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Data byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.TEL, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_TEL_MENU_TEXT,
    args.layout & 0xff,
    args.function & 0xff,
    opts & 0xff,
    ...data,
  ])
}

/**
 * Convenience: build a menu-text frame using a high-level field list,
 * encoding the strings to ASCII and inserting `0x06` separators between
 * fields plus a trailing `0x00` terminator.
 */
export function buildTELMenuTextFromFields(args: {
  source?: DeviceAddress
  destination?: DeviceAddress
  layout: number
  function: number
  index?: number
  clear?: boolean
  buffer?: boolean
  highlight?: boolean
  fields: ReadonlyArray<string>
}): IBusMessage {
  const bytes: number[] = []
  args.fields.forEach((s, i) => {
    if (i > 0) bytes.push(0x06)
    for (let j = 0; j < s.length; j++) {
      const cp = s.charCodeAt(j)
      if (cp > 0xff) {
        throw new CommandPayloadError(
          `Menu text contains non-Latin-1 character U+${cp.toString(16).padStart(4, '0')}`,
        )
      }
      bytes.push(cp)
    }
  })
  bytes.push(0x00)
  return buildTELMenuText({
    ...(args.source !== undefined ? { source: args.source } : {}),
    ...(args.destination !== undefined ? { destination: args.destination } : {}),
    layout: args.layout,
    function: args.function,
    ...(args.index !== undefined ? { index: args.index } : {}),
    ...(args.clear !== undefined ? { clear: args.clear } : {}),
    ...(args.buffer !== undefined ? { buffer: args.buffer } : {}),
    ...(args.highlight !== undefined ? { highlight: args.highlight } : {}),
    data: bytes,
  })
}
