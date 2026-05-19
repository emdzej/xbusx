import type { DeviceAddress, IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_PING = 0x01

/** A `0x01` Ping frame carries no payload data beyond the command byte. */
export function parsePing(message: IKBusMessage): void {
  assertCommand(message, CMD_PING)
  assertPayloadLength(message, 1)
}

export interface BuildPingArgs {
  source: DeviceAddress
  destination: DeviceAddress
}

/** Build a `0x01` liveness ping frame.  Both `source` and `destination` are required. */
export function buildPing(args: BuildPingArgs): IKBusMessage {
  return makeMessage(args.source, args.destination, [CMD_PING])
}
