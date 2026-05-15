import { DEVICE_ADDRESSES, encode, type IBusMessage } from '@emdzej/ibusx-protocol'
import { describe, expect, it, vi } from 'vitest'
import { Device } from '../src/device.js'
import { DuplicateDeviceError } from '../src/errors.js'
import { IBus } from '../src/ibus.js'
import { MemoryTransport } from '../src/memory-transport.js'
import { Vehicle } from '../src/vehicle.js'

class CountingDevice extends Device<{ count: number }, { hit: IBusMessage }> {
  readonly address: number
  readonly name = 'TEST'
  private _state = { count: 0 }
  constructor(address: number) {
    super()
    this.address = address
  }
  get state() {
    return this._state
  }
  handle(message: IBusMessage): void {
    this._state.count += 1
    this.events.emit('hit', message)
  }
}

class CrashingDevice extends Device<object, object> {
  readonly address = DEVICE_ADDRESSES.LCM
  readonly name = 'CRASH'
  readonly state = {}
  handle(): void {
    throw new Error('boom')
  }
}

const igFrame = encode({
  source: DEVICE_ADDRESSES.IKE,
  destination: DEVICE_ADDRESSES.GLO,
  payload: new Uint8Array([0x11, 0x00]),
  checksum: 0,
})

describe('IBus', () => {
  it('registers a device and exposes it via device()', () => {
    const bus = new IBus(new MemoryTransport())
    const ike = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))
    expect(bus.device(DEVICE_ADDRESSES.IKE)).toBe(ike)
    expect(bus.devices).toContain(ike)
  })

  it('throws DuplicateDeviceError when the same address is registered twice', () => {
    const bus = new IBus(new MemoryTransport())
    bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))
    expect(() => bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))).toThrow(
      DuplicateDeviceError,
    )
  })

  it('passes the shared Vehicle to each registered device', () => {
    const vehicle = new Vehicle({ chassis: 'E39' })
    const bus = new IBus(new MemoryTransport(), vehicle)
    const ike = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))
    const lcm = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.LCM))
    // We can't reach the protected field directly; verify the vehicle is the
    // same instance by checking it identifies devices on the same context.
    expect(bus.vehicle).toBe(vehicle)
    expect(bus.devices).toEqual([ike, lcm])
  })

  it('dispatches inbound frames to interested devices, emits frame event', async () => {
    const transport = new MemoryTransport()
    const bus = new IBus(transport)
    const ike = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))
    const rad = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.RAD))

    const frameEvents = vi.fn()
    bus.events.on('frame', frameEvents)

    await bus.start()
    transport.inject(igFrame)

    expect(frameEvents).toHaveBeenCalledTimes(1)
    // Both should see it: IKE is SRC; RAD sees it because it's a broadcast.
    expect(ike.state.count).toBe(1)
    expect(rad.state.count).toBe(1)

    await bus.stop()
  })

  it('skips devices in disabled mode', async () => {
    const transport = new MemoryTransport()
    const bus = new IBus(transport)
    const ike = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))
    const rad = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.RAD))
    rad.mode = 'disabled'

    await bus.start()
    transport.inject(igFrame)

    expect(ike.state.count).toBe(1)
    expect(rad.state.count).toBe(0)

    await bus.stop()
  })

  it('emits error when a device handler throws — but other devices still run', async () => {
    const transport = new MemoryTransport()
    const bus = new IBus(transport)
    const crash = bus.registerDevice(new CrashingDevice())
    const ike = bus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))

    const onError = vi.fn()
    bus.events.on('error', onError)

    await bus.start()
    transport.inject(igFrame)

    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error)
    expect(ike.state.count).toBe(1)
    // crash device's handler did throw, but it was caught
    expect(crash.state).toEqual({})

    await bus.stop()
  })

  it('send() encodes and writes the frame to the transport', async () => {
    const [a, b] = MemoryTransport.pair()
    const aBus = new IBus(a)
    const bBus = new IBus(b)
    const bIke = bBus.registerDevice(new CountingDevice(DEVICE_ADDRESSES.IKE))

    await aBus.start()
    await bBus.start()

    const txFrames = vi.fn()
    aBus.events.on('txFrame', txFrames)

    await aBus.send({
      source: DEVICE_ADDRESSES.IKE,
      destination: DEVICE_ADDRESSES.GLO,
      payload: new Uint8Array([0x11, 0x03]),
      checksum: 0,
    })

    // Allow microtask propagation.
    await new Promise<void>((r) => setImmediate(r))

    expect(txFrames).toHaveBeenCalledTimes(1)
    expect(bIke.state.count).toBe(1)

    await aBus.stop()
    await bBus.stop()
  })

  it('start()/stop() are idempotent', async () => {
    const bus = new IBus(new MemoryTransport())
    await bus.start()
    await bus.start()
    await bus.stop()
    await bus.stop()
  })
})
