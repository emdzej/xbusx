import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildSensors, parseSensors } from '../../src/ike/sensors.js'

describe('parseSensors — IKE 3-byte payload', () => {
  it('decodes "handbrake + oil-pressure fault, no gear" (Wilhelm example)', () => {
    // 80 06 BF 13 03 00 00 29
    const msg = decode(new Uint8Array([0x80, 0x06, 0xbf, 0x13, 0x03, 0x00, 0x00, 0x29]))
    const state = parseSensors(msg)
    expect(state.handbrake).toBe(true)
    expect(state.oilPressureFault).toBe(true)
    expect(state.brakePadsWorn).toBe(false)
    expect(state.transmissionFailsafe).toBe(false)
    expect(state.engineRunning).toBe(false)
    expect(state.driverDoorOpen).toBe(false)
    expect(state.gear).toBe('NONE')
    expect(state.auxHeat).toBe(false)
    expect(state.auxVent).toBe(false)
    expect(state.isIki).toBe(false)
    expect(state.fuelLevel).toBeUndefined()
  })

  it('decodes PARK gear via the upper nibble', () => {
    // 80 06 BF 13 03 B0 00 99
    const msg = decode(new Uint8Array([0x80, 0x06, 0xbf, 0x13, 0x03, 0xb0, 0x00, 0x99]))
    const state = parseSensors(msg)
    expect(state.gear).toBe('P')
  })

  it('decodes NEUTRAL + engine running + handbrake', () => {
    // 80 06 BF 13 01 71 00 5A
    const msg = decode(new Uint8Array([0x80, 0x06, 0xbf, 0x13, 0x01, 0x71, 0x00, 0x5a]))
    const state = parseSensors(msg)
    expect(state.handbrake).toBe(true)
    expect(state.engineRunning).toBe(true)
    expect(state.gear).toBe('NEUTRAL')
  })
})

describe('parseSensors — IKI 7-byte payload', () => {
  it('decodes the Wilhelm IKI example with engine-failsafe and fuel level', () => {
    // 80 0A BF 13 03 B0 00 02 00 00 47 D0 — handbrake + oil fault, PARK,
    // engine_failsafe, fuel = 0x47
    const state = parseSensors({
      source: 0x80,
      destination: 0xbf,
      payload: new Uint8Array([0x13, 0x03, 0xb0, 0x00, 0x02, 0x00, 0x00, 0x47]),
      checksum: 0,
    })
    expect(state.handbrake).toBe(true)
    expect(state.oilPressureFault).toBe(true)
    expect(state.gear).toBe('P')
    expect(state.isIki).toBe(true)
    expect(state.engineFailsafe).toBe(true)
    expect(state.fuelLevel).toBe(0x47)
  })

  it('decodes ACC distance bits when set', () => {
    // Byte 5 = 0b00011000 → distance = 3
    const state = parseSensors({
      source: 0x80,
      destination: 0xbf,
      payload: new Uint8Array([0x13, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00]),
      checksum: 0,
    })
    expect(state.accDistance).toBe(3)
  })
})

describe('parseSensors — errors', () => {
  it('rejects payload lengths other than 3 (IKE) or 7 (IKI) bytes after the command', () => {
    // 2 bytes after the command byte → invalid
    expect(() =>
      parseSensors({
        source: 0x80,
        destination: 0xbf,
        payload: new Uint8Array([0x13, 0x00, 0x00]),
        checksum: 0,
      }),
    ).toThrow(CommandPayloadError)
  })
})

describe('buildSensors', () => {
  it('round-trips through encode/decode for a basic state', () => {
    const built = buildSensors({ handbrake: true, engineRunning: true, gear: 'D', auxVent: true })
    const parsed = parseSensors(decode(encode(built)))
    expect(parsed.handbrake).toBe(true)
    expect(parsed.engineRunning).toBe(true)
    expect(parsed.gear).toBe('D')
    expect(parsed.auxVent).toBe(true)
    expect(parsed.brakePadsWorn).toBe(false)
  })

  it('omitting fields produces an all-zero frame', () => {
    const built = buildSensors({})
    expect(Array.from(built.payload)).toEqual([0x13, 0x00, 0x00, 0x00])
  })
})
