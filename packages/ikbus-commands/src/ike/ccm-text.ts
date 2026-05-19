import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_CCM_WRITE_TEXT = 0x1a

/**
 * Sub-command in the second payload byte.
 *
 *   0x30 — clear the Check Control Module text display
 *   0x36 — write text and keep it persistent on screen
 *
 * Other sub-command values exist in BMW firmware variants (e.g. 0x34
 * for transient text); only the two BlueBus uses are recognised here.
 */
export const IKE_CCM_TEXT_CLEAR = 0x30
export const IKE_CCM_TEXT_WRITE_PERSIST = 0x36

export type IKECCMSubCommand = typeof IKE_CCM_TEXT_CLEAR | typeof IKE_CCM_TEXT_WRITE_PERSIST

/** The cluster's CCM display fits exactly 20 characters. */
export const IKE_CCM_TEXT_LENGTH = 20

export interface IKECCMTextWrite {
  /** Whether this frame clears or writes the CCM area. */
  kind: 'clear' | 'persist'
  /** The 20-byte (trimmed of trailing spaces) ASCII text payload. Empty on a clear frame. */
  text: string
}

/**
 * Parse a `0x1A` IKE Check Control Module write-text frame.  The frame
 * layout is `0x1A | subcmd | 0x00 | 20 chars`.
 */
export function parseIKECCMText(message: IKBusMessage): IKECCMTextWrite {
  assertCommand(message, CMD_IKE_CCM_WRITE_TEXT)
  assertMinPayloadLength(message, 3)
  const sub = message.payload[1]!
  if (sub === IKE_CCM_TEXT_CLEAR) {
    return { kind: 'clear', text: '' }
  }
  if (sub !== IKE_CCM_TEXT_WRITE_PERSIST) {
    throw new CommandPayloadError(`Unknown 0x1A sub-command 0x${sub.toString(16)}`)
  }
  // payload[2] is documented as 0x00.  payload[3..] is the 20-char text.
  const textBytes = message.payload.slice(3)
  // Trim trailing spaces (frame is right-padded to 20 chars with 0x20).
  let end = textBytes.length
  while (end > 0 && textBytes[end - 1] === 0x20) end -= 1
  let text = ''
  for (let i = 0; i < end; i++) text += String.fromCharCode(textBytes[i]!)
  return { kind: 'persist', text }
}

export interface BuildIKECCMTextArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  /** Either `'clear'` or `'persist'`.  Defaults to `'persist'`. */
  kind?: 'clear' | 'persist'
  /** Text to display (clear ignores it).  Truncated or right-padded to 20 chars. */
  text?: string
}

/**
 * Build a `0x1A` Check Control Module write-text frame.
 *
 * Direction (BlueBus convention): PDC `0x60` → IKE `0x80`.  Other senders
 * also work in practice; the IKE doesn't filter on source.
 */
export function buildIKECCMText(args: BuildIKECCMTextArgs): IKBusMessage {
  const kind = args.kind ?? 'persist'
  if (kind === 'clear') {
    return makeMessage(
      args.source ?? DEVICE_ADDRESSES.PDC,
      args.destination ?? DEVICE_ADDRESSES.IKE,
      [CMD_IKE_CCM_WRITE_TEXT, IKE_CCM_TEXT_CLEAR, 0x00],
    )
  }
  const raw = args.text ?? ''
  const text = raw.length > IKE_CCM_TEXT_LENGTH ? raw.slice(0, IKE_CCM_TEXT_LENGTH) : raw
  const padded = text.padEnd(IKE_CCM_TEXT_LENGTH, ' ')
  const encoded: number[] = []
  for (let i = 0; i < padded.length; i++) {
    const cp = padded.charCodeAt(i)
    if (cp > 0xff) {
      throw new CommandPayloadError(
        `IKE CCM text contains non-Latin-1 character (U+${cp.toString(16).padStart(4, '0')})`,
      )
    }
    encoded.push(cp)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.PDC,
    args.destination ?? DEVICE_ADDRESSES.IKE,
    [CMD_IKE_CCM_WRITE_TEXT, IKE_CCM_TEXT_WRITE_PERSIST, 0x00, ...encoded],
  )
}
