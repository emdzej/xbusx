import { DBUS_ADDRESSES, decode } from '@emdzej/dbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildClearFaultMemoryRequest,
  buildReadFaultMemoryRequest,
  buildReadFaultShadowMemoryRequest,
  CMD_CLEAR_FAULT_MEMORY,
  CMD_READ_FAULT_MEMORY,
  CMD_READ_FAULT_SHADOW_MEMORY,
  parseFaultMemoryResponse,
} from '../../src/general/fault-memory.js'

describe('buildReadFaultMemoryRequest', () => {
  it('produces the DME read-DTC frame', () => {
    const frame = buildReadFaultMemoryRequest({ destination: DBUS_ADDRESSES.DME })
    // 12 04 04 = 0x12 XOR 0x04 XOR 0x04 = 0x12
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x04, 0x12])
  })

  it('round-trips: decode reveals the original destination + command', () => {
    const frame = buildReadFaultMemoryRequest({ destination: DBUS_ADDRESSES.EGS })
    const msg = decode(frame)
    expect(msg.destination).toBe(DBUS_ADDRESSES.EGS)
    expect(msg.payload[0]).toBe(CMD_READ_FAULT_MEMORY)
  })
})

describe('buildClearFaultMemoryRequest', () => {
  it('produces the DME clear-DTC frame', () => {
    const frame = buildClearFaultMemoryRequest({ destination: DBUS_ADDRESSES.DME })
    // 0x12 XOR 0x04 XOR 0x05 = 0x13
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x05, 0x13])
  })

  it('round-trips through decode', () => {
    const frame = buildClearFaultMemoryRequest({ destination: DBUS_ADDRESSES.EGS })
    const msg = decode(frame)
    expect(msg.payload[0]).toBe(CMD_CLEAR_FAULT_MEMORY)
  })
})

describe('buildReadFaultShadowMemoryRequest', () => {
  it('uses 0x14 (read fault shadow memory)', () => {
    const frame = buildReadFaultShadowMemoryRequest({ destination: DBUS_ADDRESSES.DME })
    const msg = decode(frame)
    expect(msg.payload[0]).toBe(CMD_READ_FAULT_SHADOW_MEMORY)
  })
})

describe('parseFaultMemoryResponse', () => {
  it('returns the bytes following the 0xA0 marker', () => {
    const result = parseFaultMemoryResponse({
      destination: 0xf1,
      payload: new Uint8Array([0xa0, 0x02, 0x12, 0x34, 0x60, 0x56, 0x78, 0x60]),
      checksum: 0,
    })
    expect(Array.from(result.data)).toEqual([0x02, 0x12, 0x34, 0x60, 0x56, 0x78, 0x60])
  })

  it('throws on a negative response', () => {
    expect(() =>
      parseFaultMemoryResponse({
        destination: 0xf1,
        payload: new Uint8Array([0xff]),
        checksum: 0,
      }),
    ).toThrow(/Expected positive ACK/)
  })
})
