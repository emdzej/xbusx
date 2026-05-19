import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_PDC_STATUS = 0x07
export const CMD_PDC_SENSOR_REQUEST = 0x1b
export const CMD_PDC_SENSOR_RESPONSE = 0xa0

/** "No obstacle" sentinel — see BlueBus `ibus.h:403`. */
export const PDC_NO_OBSTACLE = 0xff

export interface PDCDistances {
  frontLeft: number
  frontCenterLeft: number
  frontCenterRight: number
  frontRight: number
  rearLeft: number
  rearCenterLeft: number
  rearCenterRight: number
  rearRight: number
}

/** Parse a `0xA0` PDC sensor-response frame. */
export function parsePDCSensors(message: IBusMessage): PDCDistances {
  assertCommand(message, CMD_PDC_SENSOR_RESPONSE)
  assertMinPayloadLength(message, 9)
  return {
    frontLeft: message.payload[1]!,
    frontCenterLeft: message.payload[2]!,
    frontCenterRight: message.payload[3]!,
    frontRight: message.payload[4]!,
    rearLeft: message.payload[5]!,
    rearCenterLeft: message.payload[6]!,
    rearCenterRight: message.payload[7]!,
    rearRight: message.payload[8]!,
  }
}

export interface BuildPDCSensorsArgs extends Partial<PDCDistances> {
  source?: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0xA0` PDC sensor-response frame.  Missing fields default to PDC_NO_OBSTACLE. */
export function buildPDCSensors(args: BuildPDCSensorsArgs = {}): IBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.PDC,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [
      CMD_PDC_SENSOR_RESPONSE,
      args.frontLeft ?? PDC_NO_OBSTACLE,
      args.frontCenterLeft ?? PDC_NO_OBSTACLE,
      args.frontCenterRight ?? PDC_NO_OBSTACLE,
      args.frontRight ?? PDC_NO_OBSTACLE,
      args.rearLeft ?? PDC_NO_OBSTACLE,
      args.rearCenterLeft ?? PDC_NO_OBSTACLE,
      args.rearCenterRight ?? PDC_NO_OBSTACLE,
      args.rearRight ?? PDC_NO_OBSTACLE,
    ],
  )
}

export type PDCStatus = 'INACTIVE' | 'ACTIVE'

/** Parse a `0x07` PDC status frame. */
export function parsePDCStatus(message: IBusMessage): PDCStatus {
  assertCommand(message, CMD_PDC_STATUS)
  assertMinPayloadLength(message, 2)
  return message.payload[1] === 0 ? 'INACTIVE' : 'ACTIVE'
}

export interface BuildPDCStatusArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  status: PDCStatus
}

/** Build a `0x07` PDC status frame. */
export function buildPDCStatus(args: BuildPDCStatusArgs): IBusMessage {
  return makeMessage(
    args.source ?? DEVICE_ADDRESSES.PDC,
    args.destination ?? DEVICE_ADDRESSES.GLO,
    [CMD_PDC_STATUS, args.status === 'ACTIVE' ? 1 : 0],
  )
}

export interface BuildPDCSensorRequestArgs {
  source: DeviceAddress
  destination?: DeviceAddress
}

/** Build a `0x1B` request asking the PDC to re-broadcast sensor distances. */
export function buildPDCSensorRequest(args: BuildPDCSensorRequestArgs): IBusMessage {
  return makeMessage(args.source, args.destination ?? DEVICE_ADDRESSES.PDC, [
    CMD_PDC_SENSOR_REQUEST,
  ])
}
