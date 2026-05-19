import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_TEMPERATURE = 0x19
export const CMD_TEMPERATURE_REQUEST = 0x1d

export interface Temperature {
  /** Ambient temperature in °C (signed byte; range −128..127). */
  ambientC: number
  /** Coolant temperature in °C (unsigned byte; range 0..255). */
  coolantC: number
}

/** Decode a one-byte two's-complement temperature reading. */
function decodeSignedByte(byte: number): number {
  return byte >= 0x80 ? byte - 0x100 : byte
}

/** Encode a signed temperature back to a one-byte two's-complement value. */
function encodeSignedByte(value: number): number {
  const clamped = Math.max(-128, Math.min(127, Math.round(value)))
  return clamped < 0 ? clamped + 0x100 : clamped
}

/** Parse a `0x19` temperature broadcast.  Ambient is signed, coolant unsigned. */
export function parseTemperature(message: IBusMessage): Temperature {
  assertCommand(message, CMD_TEMPERATURE)
  // Frame is `19 <ambient> <coolant> 00` — 4 bytes including the command.
  // We accept any payload of ≥3 bytes and ignore trailing.
  assertMinPayloadLength(message, 3)
  return {
    ambientC: decodeSignedByte(message.payload[1]!),
    coolantC: message.payload[2]!,
  }
}

export interface BuildTemperatureArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  ambientC: number
  coolantC: number
}

/** Build a `0x19` temperature broadcast. */
export function buildTemperature(args: BuildTemperatureArgs): IBusMessage {
  const ambient = encodeSignedByte(args.ambientC)
  const coolant = Math.max(0, Math.min(0xff, Math.round(args.coolantC)))
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_TEMPERATURE, ambient, coolant, 0x00],
  )
}

export interface BuildTemperatureRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x1D` request asking the IKE to broadcast temperature. */
export function buildTemperatureRequest(args: BuildTemperatureRequestArgs): IBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.IKE, [
    CMD_TEMPERATURE_REQUEST,
  ])
}
