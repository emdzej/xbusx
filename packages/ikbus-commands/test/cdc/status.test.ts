import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { buildCDCStatus, parseCDCStatus } from '../../src/cdc/status.js'

describe('parseCDCStatus', () => {
  it('decodes Wilhelm example: playing, disc 1, track 9', () => {
    // 18 0A 68 39 02 09 00 01 00 01 09 41
    const frame = parseCDCStatus(
      decode(
        new Uint8Array([0x18, 0x0a, 0x68, 0x39, 0x02, 0x09, 0x00, 0x01, 0x00, 0x01, 0x09, 0x41]),
      ),
    )
    expect(frame.status).toBe('PLAYING')
    expect(frame.function).toBe('PLAYING')
    expect(frame.errorFlags).toEqual({ highTemp: false, noDisc: false, noMagazine: false })
    expect(frame.magazineMask).toBe(0x01)
    expect(frame.disc).toBe(1)
    expect(frame.track).toBe(9)
  })

  it('decodes all-6-magazine pattern (0x3F)', () => {
    const built = buildCDCStatus({
      status: 'PLAYING',
      function: 'PLAYING',
      magazineMask: 0x3f,
      disc: 3,
      track: 12,
    })
    const parsed = parseCDCStatus(decode(encode(built)))
    expect(parsed.magazineMask).toBe(0x3f)
    expect(parsed.disc).toBe(3)
    expect(parsed.track).toBe(12)
  })

  it('decodes error flags', () => {
    const built = buildCDCStatus({
      status: 'STOP',
      function: 'NOT_PLAYING',
      errorFlags: { highTemp: true, noDisc: true },
    })
    const parsed = parseCDCStatus(decode(encode(built)))
    expect(parsed.errorFlags.highTemp).toBe(true)
    expect(parsed.errorFlags.noDisc).toBe(true)
    expect(parsed.errorFlags.noMagazine).toBe(false)
  })
})

describe('buildCDCStatus', () => {
  it('defaults source to CDC, destination to RAD, disc/track to 1', () => {
    const msg = buildCDCStatus({ status: 'STOP', function: 'NOT_PLAYING' })
    expect(msg.source).toBe(DEVICE_ADDRESSES.CDC)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.RAD)
    expect(Array.from(msg.payload)).toEqual([0x39, 0x00, 0x02, 0x00, 0x01, 0x00, 0x01, 0x01])
  })

  it('round-trips every documented status / function value', () => {
    for (const status of ['STOP', 'PAUSE', 'PLAYING', 'FAST_FWD', 'LOADING'] as const) {
      for (const fn of ['NOT_PLAYING', 'PLAYING', 'PAUSE', 'SCAN_MODE', 'RANDOM_MODE'] as const) {
        const parsed = parseCDCStatus(decode(encode(buildCDCStatus({ status, function: fn }))))
        expect(parsed.status).toBe(status)
        expect(parsed.function).toBe(fn)
      }
    }
  })
})
