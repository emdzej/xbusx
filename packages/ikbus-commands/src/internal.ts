import type { DeviceAddress, IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandMismatchError, CommandPayloadError } from './errors.js'

/** Throw if the message's command byte (payload[0]) does not match `expected`. */
export function assertCommand(message: IBusMessage, expected: number): void {
  if (message.payload.length < 1) {
    throw new CommandPayloadError('Empty payload — expected at least a command byte')
  }
  const actual = message.payload[0]!
  if (actual !== expected) {
    throw new CommandMismatchError(expected, actual)
  }
}

/** Throw if the payload is not exactly `expected` bytes long. */
export function assertPayloadLength(message: IBusMessage, expected: number): void {
  if (message.payload.length !== expected) {
    throw new CommandPayloadError(
      `Expected payload length ${expected}, got ${message.payload.length}`,
    )
  }
}

/** Throw if the payload is shorter than `min` bytes. */
export function assertMinPayloadLength(message: IBusMessage, min: number): void {
  if (message.payload.length < min) {
    throw new CommandPayloadError(
      `Expected at least ${min} payload bytes, got ${message.payload.length}`,
    )
  }
}

/**
 * Build an IBusMessage from parts.  `checksum` is set to 0 (filled in by the
 * protocol encoder before transmission).
 */
export function makeMessage(
  source: DeviceAddress,
  destination: DeviceAddress,
  payload: ReadonlyArray<number> | Uint8Array,
): IBusMessage {
  return {
    source,
    destination,
    payload: payload instanceof Uint8Array ? payload : new Uint8Array(payload),
    checksum: 0,
  }
}
