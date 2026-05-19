import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_NG_STATION_LIST = 0xd4

/**
 * `0xD4` NG-Radio Station List — used exclusively by the BM54 in FMD
 * (FM directory) split-screen mode to push the radio's station list to
 * the GT, plus the responses on selection.
 *
 * Source: Wilhelm `radio/d4.md`.  Direction varies by message type:
 *
 *   ACK_RESPONSE  (0x01): GT (`0x3B`) → Radio (`0x68`) — short ack
 *   SET_STATION   (0x02): GT (`0x3B`) → Radio (`0x68`) — pick station N
 *   STATION_LIST  (0x03): Radio (`0x68`) → GT (`0x3B`) — push 0..3
 *                          station strings with selection markers
 *
 * Frame: `[0xD4, msgType, stationCount, msgIndex, ...station strings]`.
 *
 * Station strings: each up to 8 ASCII chars, null-terminated.  The
 * terminator byte's bit 4 (`0x10`) marks the currently-selected
 * station.  A complete frame can carry up to 3 stations; lists longer
 * than 3 are split across `msgIndex` 0, 1, …
 */
/**
 * **Note on the codes:** Wilhelm `radio/d4.md` has internally
 * inconsistent docs.  Its "Message Type" table reads `ACK_RESPONSE=0x01,
 * SET_STATION=0x02` but its worked examples have the codes swapped:
 *
 *     # "Set station" — GT → Radio
 *     3B 05 68 D4 01 01 82   # Index 1 — byte after 0xD4 is 0x01
 *
 *     # "Acknowledge response" — GT → Radio
 *     3B 04 68 D4 02 81      # byte after 0xD4 is 0x02
 *
 * We follow the **example byte values** since those are concrete frame
 * dumps; the table values appear to be a doc typo.  This is the
 * authoritative-by-evidence interpretation per `AGENTS.md` §4.6.
 */
export const RAD_NG_STATION_MSG = {
  SET_STATION: 0x01,
  ACK_RESPONSE: 0x02,
  STATION_LIST: 0x03,
} as const

export type RADNGStationMsgType = (typeof RAD_NG_STATION_MSG)[keyof typeof RAD_NG_STATION_MSG]

export interface RADNGStationListEntry {
  name: string
  selected: boolean
}

export interface RADNGStationList {
  /** One of `RAD_NG_STATION_MSG.*`. */
  msgType: number
  /** Total station count across all chunks (for `STATION_LIST`). */
  stationCount: number
  /** Chunk index for multi-message lists (for `STATION_LIST`). */
  msgIndex: number
  /** Station entries in this chunk.  Empty for ACK / SET frames. */
  entries: RADNGStationListEntry[]
}

export function parseRADNGStationList(message: IKBusMessage): RADNGStationList {
  assertCommand(message, CMD_RAD_NG_STATION_LIST)
  const msgType = message.payload[1] ?? 0

  if (msgType === RAD_NG_STATION_MSG.ACK_RESPONSE) {
    // ACK_RESPONSE: `3B 04 68 D4 02 81` — 2 data bytes [type, station]
    // Wilhelm's example shows `3B 04 68 D4 02 81` but that's actually
    // a SET_STATION echo; ACK is `3B 04 68 D4 02 81` too.  Just surface
    // whatever's there.
    assertMinPayloadLength(message, 2)
    return {
      msgType,
      stationCount: message.payload[2] ?? 0,
      msgIndex: 0,
      entries: [],
    }
  }
  if (msgType === RAD_NG_STATION_MSG.SET_STATION) {
    // SET_STATION: `3B 05 68 D4 01 NN` — index NN
    assertMinPayloadLength(message, 3)
    return {
      msgType,
      stationCount: message.payload[2] ?? 0,
      msgIndex: 0,
      entries: [],
    }
  }
  // STATION_LIST
  assertMinPayloadLength(message, 4)
  const stationCount = message.payload[2]!
  const msgIndex = message.payload[3]!
  const entries: RADNGStationListEntry[] = []
  let i = 4
  while (i < message.payload.length) {
    let name = ''
    let term = 0
    while (i < message.payload.length) {
      const b = message.payload[i]!
      i += 1
      // Null terminator OR any byte ≤ 0x1F marks end of string.  The
      // terminator byte itself (often 0x00 or 0x10) signals "selected"
      // via bit 4.
      if (b < 0x20) {
        term = b
        break
      }
      name += String.fromCharCode(b)
    }
    entries.push({ name, selected: (term & 0x10) !== 0 })
  }
  return { msgType, stationCount, msgIndex, entries }
}

// Build helpers — separate functions per message type since the layouts
// differ enough to make a single all-encompassing builder awkward.

export function buildRADNGStationAck(args: {
  source?: DeviceAddress
  destination?: DeviceAddress
}): IKBusMessage {
  // Wilhelm: 3B 04 68 D4 02 — 2-byte payload, just the msgType.
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.RAD, [
    CMD_RAD_NG_STATION_LIST,
    RAD_NG_STATION_MSG.ACK_RESPONSE,
  ])
}

export function buildRADNGStationSet(args: {
  source?: DeviceAddress
  destination?: DeviceAddress
  station: number
}): IKBusMessage {
  if (args.station < 0 || args.station > 0xff) {
    throw new CommandPayloadError(`station ${args.station} out of byte range`)
  }
  // Wilhelm: 3B 05 68 D4 01 NN — 3-byte payload, msgType + station-index.
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.RAD, [
    CMD_RAD_NG_STATION_LIST,
    RAD_NG_STATION_MSG.SET_STATION,
    args.station & 0xff,
  ])
}

export function buildRADNGStationListChunk(args: {
  source?: DeviceAddress
  destination?: DeviceAddress
  totalStationCount: number
  msgIndex: number
  entries: ReadonlyArray<RADNGStationListEntry>
}): IKBusMessage {
  if (args.entries.length > 3) {
    throw new CommandPayloadError(`Max 3 stations per chunk (got ${args.entries.length})`)
  }
  const bytes: number[] = [
    CMD_RAD_NG_STATION_LIST,
    RAD_NG_STATION_MSG.STATION_LIST,
    args.totalStationCount & 0xff,
    args.msgIndex & 0xff,
  ]
  for (const entry of args.entries) {
    if (entry.name.length > 8) {
      throw new CommandPayloadError(`Station name "${entry.name}" exceeds 8 ASCII chars`)
    }
    for (let i = 0; i < entry.name.length; i++) {
      const cp = entry.name.charCodeAt(i)
      if (cp > 0x7f) {
        throw new CommandPayloadError(
          `Station name "${entry.name}" contains non-ASCII (U+${cp.toString(16)})`,
        )
      }
      bytes.push(cp)
    }
    bytes.push(entry.selected ? 0x10 : 0x00)
  }
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.RAD,
    args.destination ?? DEVICE_ADDRESSES.GT,
    bytes,
  )
}
