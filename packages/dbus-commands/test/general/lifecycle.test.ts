import { DBUS_ADDRESSES, decode } from '@emdzej/dbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildResetControlUnitRequest,
  buildTerminateDiagnosticRequest,
  CMD_RESET_CONTROL_UNIT,
  CMD_TERMINATE_DIAGNOSTIC,
} from '../../src/general/lifecycle.js'

describe('buildResetControlUnitRequest', () => {
  it('produces the DME soft-reset frame', () => {
    const frame = buildResetControlUnitRequest({ destination: DBUS_ADDRESSES.DME })
    // 0x12 XOR 0x04 XOR 0x12 = 0x04
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x12, 0x04])
  })

  it('round-trips through decode for any ECU', () => {
    const frame = buildResetControlUnitRequest({ destination: DBUS_ADDRESSES.IKE })
    const msg = decode(frame)
    expect(msg.destination).toBe(DBUS_ADDRESSES.IKE)
    expect(msg.payload[0]).toBe(CMD_RESET_CONTROL_UNIT)
  })
})

describe('buildTerminateDiagnosticRequest', () => {
  it('produces the DME terminate frame', () => {
    const frame = buildTerminateDiagnosticRequest({ destination: DBUS_ADDRESSES.DME })
    // 0x12 XOR 0x04 XOR 0x9F = 0x89
    expect(Array.from(frame)).toEqual([0x12, 0x04, 0x9f, 0x89])
  })

  it('round-trips through decode', () => {
    const frame = buildTerminateDiagnosticRequest({ destination: DBUS_ADDRESSES.EGS })
    const msg = decode(frame)
    expect(msg.payload[0]).toBe(CMD_TERMINATE_DIAGNOSTIC)
  })
})
