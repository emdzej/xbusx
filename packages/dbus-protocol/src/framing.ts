import { computeChecksum } from './checksum.js'
import { DBUS_MAX_MSG_LENGTH, DBUS_MIN_FRAME_LENGTH } from './constants.js'
import {
  DBusChecksumError,
  DBusFrameLengthMismatchError,
  DBusFrameTooLargeError,
  DBusFrameTooSmallError,
} from './errors.js'
import type { DBusMessage } from './types.js'

/**
 * Serialise a DBusMessage to wire bytes:
 *
 *   DST | LEN | DATA... | XOR
 *
 * where `LEN = total frame length` (DST + LEN + DATA + XOR) — i.e.
 * `payload.length + 3`. Unlike I/K-bus, the wire has **no source byte**.
 * The `checksum` field of the input is ignored; a fresh XOR is computed.
 *
 * Source: navcoder D-bus builder at `ibus.bas:600–644` writes
 * `Chr(RxAdr) & Chr(Len(Data)+3) & Data` plus the XOR helper.
 */
export function encode(message: DBusMessage): Uint8Array {
  const payloadLength = message.payload.length
  const totalLength = payloadLength + 3
  if (totalLength > DBUS_MAX_MSG_LENGTH) {
    throw new DBusFrameTooLargeError(totalLength, DBUS_MAX_MSG_LENGTH)
  }
  if (totalLength < DBUS_MIN_FRAME_LENGTH) {
    throw new DBusFrameTooSmallError(totalLength)
  }
  const frame = new Uint8Array(totalLength)
  frame[0] = message.destination & 0xff
  frame[1] = totalLength
  frame.set(message.payload, 2)
  frame[totalLength - 1] = computeChecksum(frame, totalLength - 1)
  return frame
}

/**
 * Parse a single complete frame. Throws on malformed input — for streaming
 * use prefer `DBusFrameStream`, which resynchronises on bad framing.
 *
 * Source: navcoder receive path at `NavCoderMainForm.frm:55754–55864`
 * reads the byte at offset 1 directly as the total frame length and
 * verifies XOR over `Left(msg, len-1)`.
 */
export function decode(bytes: Uint8Array): DBusMessage {
  if (bytes.length < DBUS_MIN_FRAME_LENGTH) {
    throw new DBusFrameTooSmallError(bytes.length)
  }
  const lengthField = bytes[1]!
  if (lengthField < DBUS_MIN_FRAME_LENGTH || lengthField > DBUS_MAX_MSG_LENGTH) {
    throw new DBusFrameTooLargeError(lengthField, DBUS_MAX_MSG_LENGTH)
  }
  if (bytes.length !== lengthField) {
    throw new DBusFrameLengthMismatchError(bytes.length, lengthField)
  }
  const checksumIndex = lengthField - 1
  const received = bytes[checksumIndex]!
  const computed = computeChecksum(bytes, checksumIndex)
  if (computed !== received) {
    throw new DBusChecksumError(computed, received)
  }
  return {
    destination: bytes[0]!,
    payload: bytes.slice(2, checksumIndex),
    checksum: received,
  }
}
