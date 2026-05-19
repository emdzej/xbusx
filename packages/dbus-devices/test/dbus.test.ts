import { DBUS_ADDRESSES, DBUS_TESTER_ADDRESS, encode } from '@emdzej/dbus-protocol'
import { MemoryTransport } from '@emdzej/ibusx-core'
import { afterEach, describe, expect, it } from 'vitest'
import { DBus } from '../src/dbus.js'
import type { DBusRequestTimeoutError } from '../src/errors.js'

/**
 * Simulate an ECU that, when its peer transport receives a request frame
 * addressed to `ecuAddress`, immediately injects `responsePayload` (preceded
 * by `0xA0` positive ACK) back onto the wire as if from the ECU.
 *
 * The simulated ECU does not parse the request beyond looking at the first
 * byte (the destination) — good enough for round-trip tests.
 */
function attachSimulatedECU(
  ecuTransport: MemoryTransport,
  ecuAddress: number,
  responsePayload: Uint8Array,
): void {
  ecuTransport.events.on('data', (chunk) => {
    if (chunk.length < 4) return
    if (chunk[0] !== ecuAddress) return
    const response = encode({
      destination: DBUS_TESTER_ADDRESS,
      payload: new Uint8Array([0xa0, ...responsePayload]),
      checksum: 0,
    })
    queueMicrotask(() => {
      void ecuTransport.write(response)
    })
  })
}

let activeBus: DBus | undefined

afterEach(async () => {
  if (activeBus !== undefined) {
    await activeBus.stop()
    activeBus = undefined
  }
})

describe('DBus request/response', () => {
  it('resolves with the ECU response frame', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachSimulatedECU(ecuSide, DBUS_ADDRESSES.DME, new Uint8Array([0x4d, 0x4d, 0x33]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()

    const frame = encode({
      destination: DBUS_ADDRESSES.DME,
      payload: new Uint8Array([0x00]),
      checksum: 0,
    })
    const response = await bus.request(DBUS_ADDRESSES.DME, frame)
    expect(response.destination).toBe(DBUS_TESTER_ADDRESS)
    expect(Array.from(response.payload)).toEqual([0xa0, 0x4d, 0x4d, 0x33])

    await ecuSide.close()
  })

  it('serialises back-to-back requests', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachSimulatedECU(ecuSide, DBUS_ADDRESSES.DME, new Uint8Array([0x01]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()

    const frame = encode({
      destination: DBUS_ADDRESSES.DME,
      payload: new Uint8Array([0x00]),
      checksum: 0,
    })
    const [r1, r2, r3] = await Promise.all([
      bus.request(DBUS_ADDRESSES.DME, frame),
      bus.request(DBUS_ADDRESSES.DME, frame),
      bus.request(DBUS_ADDRESSES.DME, frame),
    ])
    expect(Array.from(r1.payload)).toEqual([0xa0, 0x01])
    expect(Array.from(r2.payload)).toEqual([0xa0, 0x01])
    expect(Array.from(r3.payload)).toEqual([0xa0, 0x01])

    await ecuSide.close()
  })

  it('rejects with DBusRequestTimeoutError when no response arrives', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()

    const frame = encode({
      destination: DBUS_ADDRESSES.DME,
      payload: new Uint8Array([0x00]),
      checksum: 0,
    })
    let caught: DBusRequestTimeoutError | undefined
    try {
      await bus.request(DBUS_ADDRESSES.DME, frame, { timeoutMs: 30 })
    } catch (err) {
      caught = err as DBusRequestTimeoutError
    }
    expect(caught?.code).toBe('DBUS_REQUEST_TIMEOUT')
    expect(caught?.destination).toBe(DBUS_ADDRESSES.DME)
    expect(caught?.timeoutMs).toBe(30)

    await ecuSide.close()
  })

  it('emits a txFrame event for each request', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachSimulatedECU(ecuSide, DBUS_ADDRESSES.DME, new Uint8Array([0x01]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()

    const txFrames: number[][] = []
    bus.events.on('txFrame', (msg) => {
      txFrames.push([msg.destination, ...msg.payload])
    })

    const frame = encode({
      destination: DBUS_ADDRESSES.DME,
      payload: new Uint8Array([0x00]),
      checksum: 0,
    })
    await bus.request(DBUS_ADDRESSES.DME, frame)
    expect(txFrames).toEqual([[DBUS_ADDRESSES.DME, 0x00]])

    await ecuSide.close()
  })
})
