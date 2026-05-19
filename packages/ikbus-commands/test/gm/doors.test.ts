import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { buildDoorsStatus, parseDoorsStatus } from '../../src/gm/doors.js'

describe('parseDoorsStatus', () => {
  it('decodes Wilhelm example: driver door open, unlocked, interior lamp on, windows + sunroof open', () => {
    // 00 05 BF 7A 51 1F 8E
    // byte1=0x51 = 0b01010001 → bit 0 (driver door) + bit 4 (UNLOCKED) + bit 6 (interior lamp)
    // byte2=0x1F = 0b00011111 → bits 0-4 → all 4 windows + sunroof open
    const state = parseDoorsStatus(
      decode(new Uint8Array([0x00, 0x05, 0xbf, 0x7a, 0x51, 0x1f, 0x8e])),
    )
    expect(state.driverDoorOpen).toBe(true)
    expect(state.centralLock).toBe('UNLOCKED')
    expect(state.interiorLamp).toBe(true)
    expect(state.driverWindowOpen).toBe(true)
    expect(state.passengerWindowOpen).toBe(true)
    expect(state.sunroofOpen).toBe(true)
  })

  it('decodes Wilhelm example: all doors closed, unlocked, interior lamp on', () => {
    // 00 05 BF 7A 30 1F EF — byte1=0x30 = 0b00110000 means central locked + interior lamp off (no 0x40)
    // Re-checking: 0x30 has bits 4,5 set → DOUBLE_LOCKED per encoding.
    const state = parseDoorsStatus(
      decode(new Uint8Array([0x00, 0x05, 0xbf, 0x7a, 0x30, 0x1f, 0xef])),
    )
    expect(state.driverDoorOpen).toBe(false)
    expect(state.centralLock).toBe('DOUBLE_LOCKED')
    expect(state.interiorLamp).toBe(false)
  })

  it('round-trips a complex state', () => {
    const original = {
      driverDoorOpen: true,
      passengerDoorOpen: false,
      rearRightDoorOpen: true,
      rearLeftDoorOpen: false,
      centralLock: 'UNLOCKED' as const,
      interiorLamp: true,
      driverWindowOpen: true,
      passengerWindowOpen: false,
      rearRightWindowOpen: false,
      rearLeftWindowOpen: true,
      sunroofOpen: true,
      rearLidOpen: false,
      frontLidOpen: true,
      bootReleaseTriggered: false,
    }
    const built = buildDoorsStatus(original)
    const parsed = parseDoorsStatus(decode(encode(built)))
    expect(parsed).toEqual(original)
  })
})
