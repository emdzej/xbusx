import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'
import { describe, expect, it, vi } from 'vitest'
import { Device } from '../src/device.js'
import type { FrameSender } from '../src/sender.js'
import { Vehicle } from '../src/vehicle.js'

class TestDevice extends Device<{ frames: number }, { hit: number }> {
  readonly address = DEVICE_ADDRESSES.IKE
  readonly name = 'TEST'
  private _state = { frames: 0 }
  get state(): Readonly<{ frames: number }> {
    return this._state
  }
  handle(_message: IBusMessage): void {
    this._state.frames += 1
    this.events.emit('hit', this._state.frames)
  }
  exposeVehicle(): Vehicle {
    return this.vehicle
  }
  exposeSender(): FrameSender {
    return this.sender
  }
}

const stubSender: FrameSender = { send: async () => {} }

function makeMessage(source: number, destination: number): IBusMessage {
  return { source, destination, payload: new Uint8Array([0x11]), checksum: 0 }
}

describe('Device base', () => {
  it('starts in passive mode', () => {
    const d = new TestDevice()
    expect(d.mode).toBe('passive')
  })

  it('attach() wires vehicle and sender', () => {
    const v = new Vehicle()
    const d = new TestDevice()
    d.attach(v, stubSender)
    expect(d.exposeVehicle()).toBe(v)
    expect(d.exposeSender()).toBe(stubSender)
  })

  describe('interestedIn (default)', () => {
    it('returns true when this device is SRC', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.IKE, DEVICE_ADDRESSES.RAD))).toBe(true)
    })

    it('returns true when this device is DST', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.RAD, DEVICE_ADDRESSES.IKE))).toBe(true)
    })

    it('returns true for GLO broadcast', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.GM, DEVICE_ADDRESSES.GLO))).toBe(true)
    })

    it('returns true for LOC broadcast', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.RAD, DEVICE_ADDRESSES.LOC))).toBe(true)
    })

    it('returns true for ANZV multicast', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.IKE, DEVICE_ADDRESSES.ANZV))).toBe(true)
    })

    it('returns false for unrelated traffic', () => {
      const d = new TestDevice()
      expect(d.interestedIn(makeMessage(DEVICE_ADDRESSES.RAD, DEVICE_ADDRESSES.GT))).toBe(false)
    })
  })

  it('handle() updates state and fires typed events', () => {
    const d = new TestDevice()
    d.attach(new Vehicle(), stubSender)
    const fn = vi.fn()
    d.events.on('hit', fn)
    d.handle(makeMessage(DEVICE_ADDRESSES.RAD, DEVICE_ADDRESSES.IKE))
    expect(d.state.frames).toBe(1)
    expect(fn).toHaveBeenCalledWith(1)
  })
})
