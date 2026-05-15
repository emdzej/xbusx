import { buildIgnitionStatus, buildSensors, buildSpeedRpm } from '@emdzej/ibusx-commands'
import { IBus, MemoryTransport, Vehicle } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it, vi } from 'vitest'
import { IKE, IKEControls } from '../src/ike.js'

async function setup() {
  const transport = new MemoryTransport()
  const vehicle = new Vehicle({ chassis: 'E39' })
  const bus = new IBus(transport, vehicle)
  const ike = bus.registerDevice(new IKE())
  await bus.start()
  return { transport, vehicle, bus, ike }
}

describe('IKE twin', () => {
  it('parses an ignition broadcast and emits the typed event', async () => {
    const { transport, vehicle, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('ignitionChanged', fn)

    transport.inject(encode(buildIgnitionStatus({ state: 'KL_15' })))

    expect(fn).toHaveBeenCalledWith('KL_15')
    expect(ike.state.ignition).toBe('KL_15')
    // Vehicle context picked it up too
    expect(vehicle.ignition).toBe('KL_15')

    await bus.stop()
  })

  it('updates the speedRpm slot from a 0x18 broadcast', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('speedRpmUpdate', fn)
    transport.inject(encode(buildSpeedRpm({ kmh: 60, rpm: 2100 })))
    expect(fn).toHaveBeenCalledWith({ kmh: 60, rpm: 2100 })
    expect(ike.state.speedRpm).toEqual({ kmh: 60, rpm: 2100 })
    await bus.stop()
  })

  it('flags the IKI variant on the Vehicle when a 7-byte sensor frame arrives', async () => {
    const { transport, vehicle, ike, bus } = await setup()
    const fn = vi.fn()
    vehicle.events.on('variantsDetected', fn)

    // Build an IKE 3-byte frame first — should NOT flag IKI
    transport.inject(encode(buildSensors({ handbrake: true })))
    expect(fn).not.toHaveBeenCalled()

    // Now inject the Wilhelm IKI-doc frame
    transport.inject(
      new Uint8Array([0x80, 0x0a, 0xbf, 0x13, 0x03, 0xb0, 0x00, 0x02, 0x00, 0x00, 0x47, 0xd0]),
    )
    expect(fn).toHaveBeenCalledWith({ ike: 'IKI' })
    expect(ike.state.sensors?.isIki).toBe(true)

    await bus.stop()
  })

  it('ignores frames whose source is not the IKE', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('ignitionChanged', fn)
    // RAD sending 0x11 (nonsense) — twin should not parse it.
    transport.inject(encode(buildIgnitionStatus({ source: DEVICE_ADDRESSES.RAD, state: 'KL_15' })))
    expect(fn).not.toHaveBeenCalled()
    expect(ike.state.ignition).toBeUndefined()
    await bus.stop()
  })

  it('exposes typed controls — requestIgnition emits a 0x10 frame', async () => {
    const { ike, bus } = await setup()
    const txFrames = vi.fn()
    bus.events.on('txFrame', txFrames)
    await IKEControls.requestIgnition.invoke(ike, {})
    expect(txFrames).toHaveBeenCalledTimes(1)
    const sent = txFrames.mock.calls[0]![0]
    expect(sent.destination).toBe(DEVICE_ADDRESSES.IKE)
    expect(Array.from(sent.payload)).toEqual([0x10])
    await bus.stop()
  })
})
