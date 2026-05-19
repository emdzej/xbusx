import { DEVICE_ADDRESSES, type DeviceAddress, type IKBusMessage } from '@emdzej/ikbus-protocol'
import { makeMessage } from '../internal.js'

export const CMD_DIA_JOB_REQUEST = 0x0c

/**
 * ZKE3 (E38 / E39 / E52 / E53) lock-job codes.
 *
 * Used with `buildZKE3LockRequest`.  Different sub-variants (GM1 / GM4 vs
 * GM5 / GM6) accept different codes — the suffix in each name indicates
 * which sub-variants apply.
 */
export const ZKE3_JOBS = {
  /** Press centre-lock button (GM1, GM4). */
  CENTRAL_LOCK_GM1: 0x0b,
  /** Press centre-lock button (GM5, GM6). */
  CENTRAL_LOCK_GM5: 0x14,
  /** Lock front doors only (GM5, GM6). */
  LOCK_HIGH_GM5: 0x40,
  /** Lock rear doors only (GM5, GM6). */
  LOCK_LOW_GM5: 0x41,
  /** Unlock front doors (GM5, GM6). */
  UNLOCK_HIGH_GM5: 0x42,
  /** Unlock rear doors (GM5, GM6). */
  UNLOCK_LOW_GM5: 0x43,
  /** Lock all doors + trunk (GM1, GM4). */
  LOCK_ALL_GM1: 0x88,
  /** Lock all doors + trunk (GM5, GM6). */
  LOCK_ALL_GM5: 0x90,
} as const

/**
 * ZKE5 (E46 / E8X) lock-job codes.
 *
 * Note: BlueBus defines `LOCK_ALL` as `0x4F`; bimmerz has `0x34`.  We follow
 * BlueBus.  See `docs/devices/gm.md` for the conflict resolution.
 */
export const ZKE5_JOBS = {
  /** Press centre-lock button. */
  CENTRAL_LOCK: 0x03,
  /** Unlock trunk only. */
  UNLOCK_TRUNK: 0x06,
  /** Unlock rear doors. */
  UNLOCK_LOW: 0x37,
  /** Unlock all doors + trunk. */
  UNLOCK_ALL: 0x45,
  /** Lock all doors + trunk. */
  LOCK_ALL: 0x4f,
} as const

/** Identifier for which GM variant is on the bus.  Drives 3-byte vs 4-byte job payload. */
export type GMVariant = 'ZKE3_GM1' | 'ZKE3_GM4' | 'ZKE3_GM5' | 'ZKE3_GM6' | 'ZKE5' | 'ZKE5_S12'

export interface BuildZKE3LockRequestArgs {
  source: DeviceAddress
  /** Job code from `ZKE3_JOBS`. */
  job: number
}

/** Build a 4-byte ZKE3 lock-job request: `0C 00 <job> 01`. */
export function buildZKE3LockRequest(args: BuildZKE3LockRequestArgs): IKBusMessage {
  return makeMessage(args.source, DEVICE_ADDRESSES.GM, [CMD_DIA_JOB_REQUEST, 0x00, args.job, 0x01])
}

export interface BuildZKE5LockRequestArgs {
  source: DeviceAddress
  /** Job code from `ZKE5_JOBS`. */
  job: number
}

/** Build a 3-byte ZKE5 lock-job request: `0C <job> 01`. */
export function buildZKE5LockRequest(args: BuildZKE5LockRequestArgs): IKBusMessage {
  return makeMessage(args.source, DEVICE_ADDRESSES.GM, [CMD_DIA_JOB_REQUEST, args.job, 0x01])
}
