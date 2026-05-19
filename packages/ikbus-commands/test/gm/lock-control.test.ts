import { DEVICE_ADDRESSES } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildZKE3LockRequest,
  buildZKE5LockRequest,
  ZKE3_JOBS,
  ZKE5_JOBS,
} from '../../src/gm/lock-control.js'

describe('ZKE3 lock requests', () => {
  it('produces a 4-byte payload: 0C 00 <job> 01', () => {
    const msg = buildZKE3LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE3_JOBS.LOCK_ALL_GM1 })
    expect(msg.destination).toBe(DEVICE_ADDRESSES.GM)
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x00, 0x88, 0x01])
  })

  it('GM5 lock-all uses 0x90', () => {
    const msg = buildZKE3LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE3_JOBS.LOCK_ALL_GM5 })
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x00, 0x90, 0x01])
  })

  it('GM5 lock-high uses 0x40', () => {
    const msg = buildZKE3LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE3_JOBS.LOCK_HIGH_GM5 })
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x00, 0x40, 0x01])
  })
})

describe('ZKE5 lock requests', () => {
  it('produces a 3-byte payload: 0C <job> 01', () => {
    const msg = buildZKE5LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE5_JOBS.LOCK_ALL })
    expect(msg.destination).toBe(DEVICE_ADDRESSES.GM)
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x4f, 0x01])
  })

  it('central-lock uses 0x03', () => {
    const msg = buildZKE5LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE5_JOBS.CENTRAL_LOCK })
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x03, 0x01])
  })

  it('unlock-all uses 0x45', () => {
    const msg = buildZKE5LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE5_JOBS.UNLOCK_ALL })
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x45, 0x01])
  })

  it('unlock-trunk uses 0x06', () => {
    const msg = buildZKE5LockRequest({ source: DEVICE_ADDRESSES.DIA, job: ZKE5_JOBS.UNLOCK_TRUNK })
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x06, 0x01])
  })
})

describe('ZKE5_JOBS LOCK_ALL', () => {
  it('uses BlueBus value 0x4F (not bimmerz 0x34)', () => {
    // Pinned in test to lock in the conflict resolution documented in
    // docs/devices/gm.md and docs/subsystems/door-locks-zke3-vs-zke5.md.
    expect(ZKE5_JOBS.LOCK_ALL).toBe(0x4f)
  })
})
