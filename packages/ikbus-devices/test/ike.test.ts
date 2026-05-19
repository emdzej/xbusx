import {
  buildGPSTime,
  buildIgnitionStatus,
  buildIKECCMText,
  buildIKENumeric,
  buildIKEOBCText,
  buildIKEReplicateData,
  buildSensors,
  buildSpeedRpm,
  IKE_NUMERIC_X1,
  IKE_OBC_PROPERTY,
} from '@emdzej/ibusx-commands'
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

  it('captures inbound CCM text writes addressed to the IKE', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('ccmTextUpdate', fn)

    transport.inject(encode(buildIKECCMText({ text: 'OIL LEVEL OK' })))
    expect(fn).toHaveBeenCalledWith({ kind: 'persist', text: 'OIL LEVEL OK' })
    expect(ike.state.ccmText?.text).toBe('OIL LEVEL OK')

    transport.inject(encode(buildIKECCMText({ kind: 'clear' })))
    expect(ike.state.ccmText?.kind).toBe('clear')

    await bus.stop()
  })

  it('captures inbound numeric writes', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('numericUpdate', fn)

    transport.inject(encode(buildIKENumeric({ mode: IKE_NUMERIC_X1, value: 25 })))
    expect(fn).toHaveBeenCalledWith({ mode: IKE_NUMERIC_X1, value: 25 })
    expect(ike.state.numeric?.value).toBe(25)

    await bus.stop()
  })

  it('captures outbound OBC text broadcasts and accumulates by property ID', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('obcTextUpdate', fn)

    transport.inject(
      encode(buildIKEOBCText({ propertyId: IKE_OBC_PROPERTY.TIME, text: ' 3:43PM' })),
    )
    transport.inject(
      encode(buildIKEOBCText({ propertyId: IKE_OBC_PROPERTY.DATE, text: '05/25/2020' })),
    )

    expect(fn).toHaveBeenCalledTimes(2)
    expect(ike.state.obcText[IKE_OBC_PROPERTY.TIME]).toBe(' 3:43PM')
    expect(ike.state.obcText[IKE_OBC_PROPERTY.DATE]).toBe('05/25/2020')

    await bus.stop()
  })

  it('captures outbound 0x55 Replicate Data broadcasts', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('replicateUpdate', fn)

    transport.inject(
      encode(
        buildIKEReplicateData({
          mileageKm: 243500,
          tbcRaw: 0x40,
          fuelLitres: 640,
          oilRaw: 0,
          timeDays: 628,
        }),
      ),
    )

    expect(fn).toHaveBeenCalledWith({
      mileageKm: 243500,
      tbcRaw: 0x40,
      fuelLitres: 640,
      oilRaw: 0,
      timeDays: 628,
    })
    expect(ike.state.replicate?.mileageKm).toBe(243500)

    await bus.stop()
  })

  it('captures inbound 0x1F GPS time pushes from the nav computer', async () => {
    const { transport, ike, bus } = await setup()
    const fn = vi.fn()
    ike.events.on('gpsTimeUpdate', fn)

    transport.inject(encode(buildGPSTime({ hour: 10, minute: 18, day: 27, month: 1, year: 2019 })))

    expect(fn).toHaveBeenCalledTimes(1)
    expect(ike.state.gpsTime).toEqual({
      hour: 10,
      minute: 18,
      day: 27,
      month: 1,
      year: 2019,
      flagsRaw: 0x40,
      unknownRaw: 0x00,
    })

    await bus.stop()
  })

  it('writeCCMText control emits the right frame', async () => {
    const { ike, bus } = await setup()
    ike.mode = 'active'
    const txFrames = vi.fn()
    bus.events.on('txFrame', txFrames)
    await IKEControls.writeCCMText.invoke(ike, { text: 'HELLO' })
    expect(txFrames).toHaveBeenCalledTimes(1)
    const sent = txFrames.mock.calls[0]![0]
    expect(sent.destination).toBe(DEVICE_ADDRESSES.IKE)
    expect(sent.payload[0]).toBe(0x1a)
    expect(sent.payload[1]).toBe(0x36) // persist
    await bus.stop()
  })
})
