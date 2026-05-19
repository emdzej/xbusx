import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { CommandPayloadError } from '../errors.js'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_RAD_INPUT_SOURCE = 0x4e

/**
 * `0x4E` Radio Input Source — GT instructs the radio to switch input
 * source (radio vs. TV).
 *
 * Source: Wilhelm `radio/4e.md`.  Direction GT (`0x3B`) → Radio
 * (`0x68`).  Two-byte payload; the second byte's purpose is unknown
 * but Wilhelm observes it as `0x00` in all examples.
 */
export const RAD_INPUT_SOURCE = {
  RADIO: 0x00,
  TV: 0x01,
} as const

export interface RADInputSource {
  source: number
  /** Wilhelm marks the second byte as "function unknown, probably unused".
   *  Always `0x00` in observed frames; surfaced raw. */
  reserved: number
}

export function parseRADInputSource(message: IBusMessage): RADInputSource {
  assertCommand(message, CMD_RAD_INPUT_SOURCE)
  assertPayloadLength(message, 3)
  return {
    source: message.payload[1]! & 0x01,
    reserved: message.payload[2]!,
  }
}

export interface BuildRADInputSourceArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  inputSource: number
  reserved?: number
}

export function buildRADInputSource(args: BuildRADInputSourceArgs): IBusMessage {
  if (args.inputSource < 0 || args.inputSource > 0x01) {
    throw new CommandPayloadError(`inputSource ${args.inputSource} out of documented range 0..1`)
  }
  const reserved = args.reserved ?? 0x00
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.RAD, [
    CMD_RAD_INPUT_SOURCE,
    args.inputSource & 0xff,
    reserved & 0xff,
  ])
}
