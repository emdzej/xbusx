import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'
import {
  TEL_MENU_OPT_BUFFER,
  TEL_MENU_OPT_CLEAR,
  TEL_MENU_OPT_HIGHLIGHT,
  TEL_MENU_OPT_INDEX_MASK,
} from './menu-text.js'

export const CMD_TEL_BODY_TEXT = 0xa5

/**
 * `0xA5` "Body Text: Telephone" — supports the telematics / SMS displays
 * by letting the sender specify a cursor offset within a long line of
 * text.  Effectively allows breaking a single line into multiple frames.
 *
 * Source: Wilhelm `telephone/a5.md`.  Direction TEL (`0xC8`) → GT
 * (`0x3B`).  Layout is `DETAIL` (`0xF1`) in every observed Wilhelm frame.
 *
 * Wire layout:
 *
 *   payload[0]  command (`0xA5`)
 *   payload[1]  layout   — only `0xF1` is documented
 *   payload[2]  offset   — `0x01` = 0 chars, `0x02` = 1 char, ... low 5 bits
 *   payload[3]  options  — same bitfield as `0x21` (INDEX | CLEAR | BUFFER | HIGHLIGHT)
 *   payload[4..] string  — null-terminated; `0x06` LF separates fields
 */
export const TEL_BODY_LAYOUT_DETAIL = 0xf1

export interface TELBodyText {
  layout: number
  /**
   * Cursor character offset.  Per Wilhelm: `0x01` encodes offset 0,
   * `0x02` encodes offset 1, ... up to `0x1F` = offset 30.  We surface
   * both: `offsetRaw` (the byte value) and `offsetChars` (= `offsetRaw -
   * 1` clamped to ≥ 0).
   */
  offsetRaw: number
  offsetChars: number
  index: number
  clear: boolean
  buffer: boolean
  highlight: boolean
  data: Uint8Array
}

export function parseTELBodyText(message: IBusMessage): TELBodyText {
  assertCommand(message, CMD_TEL_BODY_TEXT)
  assertMinPayloadLength(message, 5)
  const offsetRaw = message.payload[2]!
  const opts = message.payload[3]!
  return {
    layout: message.payload[1]!,
    offsetRaw,
    offsetChars: offsetRaw > 0 ? offsetRaw - 1 : 0,
    index: opts & TEL_MENU_OPT_INDEX_MASK,
    clear: (opts & TEL_MENU_OPT_CLEAR) !== 0,
    buffer: (opts & TEL_MENU_OPT_BUFFER) !== 0,
    highlight: (opts & TEL_MENU_OPT_HIGHLIGHT) !== 0,
    data: message.payload.slice(4),
  }
}

export interface BuildTELBodyTextArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  layout?: number
  /** Cursor offset 0..30 characters.  Defaults to `0`. */
  offsetChars?: number
  index?: number
  clear?: boolean
  buffer?: boolean
  highlight?: boolean
  data: Uint8Array | ReadonlyArray<number>
}

export function buildTELBodyText(args: BuildTELBodyTextArgs): IBusMessage {
  const layout = args.layout ?? TEL_BODY_LAYOUT_DETAIL
  if (layout < 0 || layout > 0xff) {
    throw new CommandPayloadError(`layout 0x${layout.toString(16)} out of byte range`)
  }
  const offsetChars = args.offsetChars ?? 0
  if (offsetChars < 0 || offsetChars > 30) {
    throw new CommandPayloadError(`offsetChars ${offsetChars} out of range 0..30`)
  }
  const offsetRaw = offsetChars + 1 // Wilhelm: offset 0 chars encoded as 0x01
  const idx = args.index ?? 0
  if (idx < 0 || idx > TEL_MENU_OPT_INDEX_MASK) {
    throw new CommandPayloadError(`index ${idx} out of 5-bit range`)
  }
  let opts = idx & TEL_MENU_OPT_INDEX_MASK
  if (args.clear) opts |= TEL_MENU_OPT_CLEAR
  if (args.buffer) opts |= TEL_MENU_OPT_BUFFER
  if (args.highlight) opts |= TEL_MENU_OPT_HIGHLIGHT
  const data = Array.from(args.data)
  for (const b of data) {
    if (b < 0 || b > 0xff) {
      throw new CommandPayloadError(`Data byte 0x${b.toString(16)} out of byte range`)
    }
  }
  return makeMessage(args.source ?? DEVICE_ADDRESSES.TEL, args.destination ?? DEVICE_ADDRESSES.GT, [
    CMD_TEL_BODY_TEXT,
    layout & 0xff,
    offsetRaw & 0xff,
    opts & 0xff,
    ...data,
  ])
}
