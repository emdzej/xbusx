import { computeChecksum } from './checksum.js'
import { IBUS_MAX_MSG_LENGTH, MIN_FRAME_LENGTH } from './constants.js'
import {
  ChecksumError,
  FrameLengthMismatchError,
  FrameTooLargeError,
  FrameTooSmallError,
} from './errors.js'
import type { IBusMessage } from './types.js'

/**
 * Serialise an IBusMessage to wire bytes:
 *
 *   SRC | LEN | DST | payload... | XOR
 *
 * where LEN = payload.length + 2.  The `checksum` field of the input is
 * ignored — a fresh XOR is computed.
 */
export function encode(message: IBusMessage): Uint8Array {
  const payloadLength = message.payload.length
  const totalLength = payloadLength + 4
  if (totalLength > IBUS_MAX_MSG_LENGTH) {
    throw new FrameTooLargeError(totalLength, IBUS_MAX_MSG_LENGTH)
  }
  if (totalLength < MIN_FRAME_LENGTH) {
    throw new FrameTooSmallError(totalLength)
  }
  const frame = new Uint8Array(totalLength)
  frame[0] = message.source & 0xff
  frame[1] = payloadLength + 2
  frame[2] = message.destination & 0xff
  frame.set(message.payload, 3)
  frame[totalLength - 1] = computeChecksum(frame, totalLength - 1)
  return frame
}

/**
 * Parse a single complete frame.  Throws on malformed input — for streaming
 * use prefer `FrameStream`, which tolerates resynchronisation.
 */
export function decode(bytes: Uint8Array): IBusMessage {
  if (bytes.length < MIN_FRAME_LENGTH) {
    throw new FrameTooSmallError(bytes.length)
  }
  const lengthField = bytes[1]!
  const expectedTotal = lengthField + 2
  if (lengthField < 3 || expectedTotal > IBUS_MAX_MSG_LENGTH) {
    throw new FrameTooLargeError(expectedTotal, IBUS_MAX_MSG_LENGTH)
  }
  if (bytes.length !== expectedTotal) {
    throw new FrameLengthMismatchError(bytes.length, expectedTotal)
  }
  const checksumIndex = expectedTotal - 1
  const received = bytes[checksumIndex]!
  const computed = computeChecksum(bytes, checksumIndex)
  if (computed !== received) {
    throw new ChecksumError(computed, received)
  }
  return {
    source: bytes[0]!,
    destination: bytes[2]!,
    payload: bytes.slice(3, checksumIndex),
    checksum: received,
  }
}
