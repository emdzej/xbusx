import { DBUS_ADDRESSES, DBUS_TESTER_ADDRESS, encode } from '@emdzej/dbus-protocol'
import { MemoryTransport } from '@emdzej/ibusx-core'
import { afterEach, describe, expect, it } from 'vitest'
import { DBus } from '../src/dbus.js'
import { DME } from '../src/dme.js'
import { EGS } from '../src/egs.js'
import type { DBusNegativeResponseError } from '../src/errors.js'

let activeBus: DBus | undefined

afterEach(async () => {
  if (activeBus !== undefined) {
    await activeBus.stop()
    activeBus = undefined
  }
})

/**
 * Wire a simulated ECU peer that echoes back a positive ACK with the
 * supplied payload for every request frame it receives. Useful for
 * exercising the request/response round-trip without per-command
 * branching.
 */
function attachACKResponder(peer: MemoryTransport, payload: Uint8Array): void {
  peer.events.on('data', (chunk) => {
    if (chunk.length < 4) return
    const response = encode({
      destination: DBUS_TESTER_ADDRESS,
      payload: new Uint8Array([0xa0, ...payload]),
      checksum: 0,
    })
    queueMicrotask(() => {
      void peer.write(response)
    })
  })
}

function attachNegativeResponder(peer: MemoryTransport, code: number): void {
  peer.events.on('data', (chunk) => {
    if (chunk.length < 4) return
    const response = encode({
      destination: DBUS_TESTER_ADDRESS,
      payload: new Uint8Array([code]),
      checksum: 0,
    })
    queueMicrotask(() => {
      void peer.write(response)
    })
  })
}

describe('ECU base — DS2 general commands', () => {
  it('readFaultMemory() captures the raw DTC bytes into state', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachACKResponder(ecuSide, new Uint8Array([0x02, 0x12, 0x34, 0x60, 0x56, 0x78, 0x60]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    const result = await dme.readFaultMemory()
    expect(Array.from(result.data)).toEqual([0x02, 0x12, 0x34, 0x60, 0x56, 0x78, 0x60])
    expect(dme.state.faultMemory).toBe(result)

    await ecuSide.close()
  })

  it('clearFaultMemory() wipes the cached fault memory in state', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachACKResponder(ecuSide, new Uint8Array(0))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    // Pretend we already cached a faults read.
    ;(dme as unknown as { _state: { faultMemory: unknown } })._state.faultMemory = {
      data: new Uint8Array([0xaa, 0xbb]),
    }
    expect(dme.state.faultMemory).toBeDefined()

    await dme.clearFaultMemory()
    expect(dme.state.faultMemory).toBeUndefined()

    await ecuSide.close()
  })

  it('readCoding() captures the coding string bytes', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachACKResponder(ecuSide, new Uint8Array([0xde, 0xad, 0xbe, 0xef]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    const result = await dme.readCoding()
    expect(Array.from(result.data)).toEqual([0xde, 0xad, 0xbe, 0xef])
    expect(dme.state.coding).toBe(result)

    await ecuSide.close()
  })

  it('resetControlUnit() stamps lastResetAt', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachACKResponder(ecuSide, new Uint8Array(0))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    const before = Date.now()
    await dme.resetControlUnit()
    const after = Date.now()

    expect(dme.state.lastResetAt).toBeDefined()
    if (dme.state.lastResetAt !== undefined) {
      expect(dme.state.lastResetAt).toBeGreaterThanOrEqual(before)
      expect(dme.state.lastResetAt).toBeLessThanOrEqual(after)
    }

    await ecuSide.close()
  })

  it('terminateDiagnostic() flips diagnosticTerminated', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachACKResponder(ecuSide, new Uint8Array(0))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    expect(dme.state.diagnosticTerminated).toBe(false)
    await dme.terminateDiagnostic()
    expect(dme.state.diagnosticTerminated).toBe(true)

    await ecuSide.close()
  })

  it('propagates negative ACKs as DBusNegativeResponseError', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    attachNegativeResponder(ecuSide, 0xb1) // FUNCTION_ERROR
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    let caught: DBusNegativeResponseError | undefined
    try {
      await dme.readCoding()
    } catch (err) {
      caught = err as DBusNegativeResponseError
    }
    expect(caught?.responseCode).toBe(0xb1)
    expect(dme.state.coding).toBeUndefined()

    await ecuSide.close()
  })
})

describe('EGS twin', () => {
  it('reports address 0x14 and name "EGS"', () => {
    const [testerSide] = MemoryTransport.pair()
    const bus = new DBus(testerSide)
    activeBus = bus
    const egs = new EGS(bus)
    expect(egs.address).toBe(DBUS_ADDRESSES.EGS)
    expect(egs.name).toBe('EGS')
  })

  it('issues requests to its own address (0x14), not 0x12', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    const observedDestinations: number[] = []
    ecuSide.events.on('data', (chunk) => {
      observedDestinations.push(chunk[0] ?? -1)
      // Reply positively so the request resolves.
      const response = encode({
        destination: DBUS_TESTER_ADDRESS,
        payload: new Uint8Array([0xa0, 0x99]),
        checksum: 0,
      })
      queueMicrotask(() => {
        void ecuSide.write(response)
      })
    })
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const egs = new EGS(bus)

    await egs.readIdentification()
    expect(observedDestinations).toEqual([DBUS_ADDRESSES.EGS])

    await ecuSide.close()
  })
})
