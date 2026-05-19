import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertPayloadLength, makeMessage } from '../internal.js'

export const CMD_IKE_OBC_STATUS = 0x2a

/**
 * OBC status indicators that the IKE broadcasts to the displays.
 *
 * Source: Wilhelm `ike/2a.md`.  Two-byte bitfield; each bit controls
 * one indicator/icon shown by the nav/MID UI.  Direction IKE (`0x80`)
 * → ANZV display multicast (`0xE7`).
 *
 * Frame: `[0x2A, byte1, byte2]`.
 */
export interface IKEOBCStatus {
  /** Byte 1 bits */
  memo: boolean
  timer: boolean
  limit: boolean
  /** Byte 2 bits */
  code: boolean
  auxHeating: boolean
  auxTimer2: boolean
  auxVentilation: boolean
  auxTimer1: boolean
  /** Raw bytes preserved so callers can see unmodelled bits (Wilhelm lists
   *  only the eight named bits; other positions are documented as unset
   *  in observed frames but pass through unchanged). */
  rawByte1: number
  rawByte2: number
}

const BYTE1_MEMO = 0x20
const BYTE1_TIMER = 0x08
const BYTE1_LIMIT = 0x02

const BYTE2_CODE = 0x40
const BYTE2_AUX_HEATING = 0x20
const BYTE2_AUX_TIMER_2 = 0x10
const BYTE2_AUX_VENTILATION = 0x08
const BYTE2_AUX_TIMER_1 = 0x04

export function parseIKEOBCStatus(message: IKBusMessage): IKEOBCStatus {
  assertCommand(message, CMD_IKE_OBC_STATUS)
  assertPayloadLength(message, 3)
  const b1 = message.payload[1]!
  const b2 = message.payload[2]!
  return {
    memo: (b1 & BYTE1_MEMO) !== 0,
    timer: (b1 & BYTE1_TIMER) !== 0,
    limit: (b1 & BYTE1_LIMIT) !== 0,
    code: (b2 & BYTE2_CODE) !== 0,
    auxHeating: (b2 & BYTE2_AUX_HEATING) !== 0,
    auxTimer2: (b2 & BYTE2_AUX_TIMER_2) !== 0,
    auxVentilation: (b2 & BYTE2_AUX_VENTILATION) !== 0,
    auxTimer1: (b2 & BYTE2_AUX_TIMER_1) !== 0,
    rawByte1: b1,
    rawByte2: b2,
  }
}

export interface BuildIKEOBCStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  memo?: boolean
  timer?: boolean
  limit?: boolean
  code?: boolean
  auxHeating?: boolean
  auxTimer2?: boolean
  auxVentilation?: boolean
  auxTimer1?: boolean
}

export function buildIKEOBCStatus(args: BuildIKEOBCStatusArgs): IKBusMessage {
  let b1 = 0
  if (args.memo) b1 |= BYTE1_MEMO
  if (args.timer) b1 |= BYTE1_TIMER
  if (args.limit) b1 |= BYTE1_LIMIT
  let b2 = 0
  if (args.code) b2 |= BYTE2_CODE
  if (args.auxHeating) b2 |= BYTE2_AUX_HEATING
  if (args.auxTimer2) b2 |= BYTE2_AUX_TIMER_2
  if (args.auxVentilation) b2 |= BYTE2_AUX_VENTILATION
  if (args.auxTimer1) b2 |= BYTE2_AUX_TIMER_1
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.IKE,
    args.destination ?? DEVICE_ADDRESSES.ANZV,
    [CMD_IKE_OBC_STATUS, b1, b2],
  )
}
