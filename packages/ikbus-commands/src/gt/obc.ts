import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { assertCommand, assertMinPayloadLength, makeMessage } from '../internal.js'

export const CMD_GT_OBC_INPUT = 0x40
export const CMD_GT_OBC_CONTROL = 0x41

/**
 * OBC property IDs.  Per Wilhelm `ike/properties.md`.  Subset of the full
 * table — these are the most-used ones.  Unknown property IDs pass through as
 * `'UNKNOWN'` with `rawId` preserved.
 */
export type OBCProperty =
  | 'TIME'
  | 'DATE'
  | 'TEMPERATURE'
  | 'CONSUMPTION_1'
  | 'CONSUMPTION_2'
  | 'RANGE'
  | 'DISTANCE'
  | 'ARRIVAL'
  | 'LIMIT'
  | 'AVG_SPEED'
  | 'MEMO'
  | 'CODE'
  | 'TIMER'
  | 'AUX_TIMER_1'
  | 'AUX_TIMER_2'
  | 'AUX_HEAT_OFF'
  | 'AUX_HEAT_ON'
  | 'AUX_VENT_OFF'
  | 'AUX_VENT_ON'
  | 'EMERGENCY_DISARM'
  | 'TIMER_LAP'
  | 'AUX_STATUS'
  | 'UNKNOWN'

export const OBC_PROPERTY_IDS = {
  TIME: 0x01,
  DATE: 0x02,
  TEMPERATURE: 0x03,
  CONSUMPTION_1: 0x04,
  CONSUMPTION_2: 0x05,
  RANGE: 0x06,
  DISTANCE: 0x07,
  ARRIVAL: 0x08,
  LIMIT: 0x09,
  AVG_SPEED: 0x0a,
  MEMO: 0x0c,
  CODE: 0x0d,
  TIMER: 0x0e,
  AUX_TIMER_1: 0x0f,
  AUX_TIMER_2: 0x10,
  AUX_HEAT_OFF: 0x11,
  AUX_HEAT_ON: 0x12,
  AUX_VENT_OFF: 0x13,
  AUX_VENT_ON: 0x14,
  EMERGENCY_DISARM: 0x16,
  TIMER_LAP: 0x1a,
  AUX_STATUS: 0x1b,
} as const satisfies Record<Exclude<OBCProperty, 'UNKNOWN'>, number>

const PROPERTY_BY_ID = new Map<number, OBCProperty>(
  Object.entries(OBC_PROPERTY_IDS).map(([name, id]) => [id, name as OBCProperty]),
)

/** GT → IKE OBC input.  Writes a property value as ASCII string data. */
export interface OBCInput {
  property: OBCProperty
  rawId: number
  /** Raw data bytes that follow the property byte. */
  data: Uint8Array
}

/** Parse a `0x40` OBC-input frame. */
export function parseOBCInput(message: IKBusMessage): OBCInput {
  assertCommand(message, CMD_GT_OBC_INPUT)
  assertMinPayloadLength(message, 2)
  const rawId = message.payload[1]!
  return {
    property: PROPERTY_BY_ID.get(rawId) ?? 'UNKNOWN',
    rawId,
    data: message.payload.slice(2),
  }
}

export interface BuildOBCInputArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  property: OBCProperty | number
  data: ReadonlyArray<number> | Uint8Array
}

/** Build a `0x40` OBC-input frame.  Defaults source to GT, dest to IKE. */
export function buildOBCInput(args: BuildOBCInputArgs): IKBusMessage {
  const id =
    typeof args.property === 'number'
      ? args.property & 0xff
      : args.property === 'UNKNOWN'
        ? 0xff
        : OBC_PROPERTY_IDS[args.property]
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.IKE, [
    CMD_GT_OBC_INPUT,
    id,
    ...Array.from(args.data),
  ])
}

/**
 * `0x41` OBC-control action bits.  Per Wilhelm `ike/properties.md:110-169`.
 */
export const OBC_CONTROL_BITS = {
  REQUEST_STRING: 0x01,
  REQUEST_BOOLEAN: 0x02,
  ON_START: 0x04,
  OFF_STOP: 0x08,
  RECALCULATE: 0x10,
  SET_AS_CURRENT_SPEED: 0x20,
} as const

export type OBCControlAction = keyof typeof OBC_CONTROL_BITS

export interface OBCControl {
  property: OBCProperty
  rawId: number
  actions: ReadonlyArray<OBCControlAction>
  rawActionByte: number
}

/** Parse a `0x41` OBC-control frame. */
export function parseOBCControl(message: IKBusMessage): OBCControl {
  assertCommand(message, CMD_GT_OBC_CONTROL)
  assertMinPayloadLength(message, 3)
  const rawId = message.payload[1]!
  const rawActionByte = message.payload[2]!
  const actions: OBCControlAction[] = []
  for (const [name, bits] of Object.entries(OBC_CONTROL_BITS)) {
    if ((rawActionByte & bits) !== 0) actions.push(name as OBCControlAction)
  }
  return {
    property: PROPERTY_BY_ID.get(rawId) ?? 'UNKNOWN',
    rawId,
    actions,
    rawActionByte,
  }
}

export interface BuildOBCControlArgs {
  source?: DeviceAddress
  destination?: DeviceAddress
  property: OBCProperty | number
  actions: ReadonlyArray<OBCControlAction>
}

/** Build a `0x41` OBC-control frame.  Defaults source to GT, dest to IKE. */
export function buildOBCControl(args: BuildOBCControlArgs): IKBusMessage {
  const id =
    typeof args.property === 'number'
      ? args.property & 0xff
      : args.property === 'UNKNOWN'
        ? 0xff
        : OBC_PROPERTY_IDS[args.property]
  const actionByte = args.actions.reduce((acc, a) => acc | OBC_CONTROL_BITS[a], 0)
  return makeMessage(args.source ?? DEVICE_ADDRESSES.GT, args.destination ?? DEVICE_ADDRESSES.IKE, [
    CMD_GT_OBC_CONTROL,
    id,
    actionByte,
  ])
}
