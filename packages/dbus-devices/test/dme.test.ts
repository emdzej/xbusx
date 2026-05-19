import { DBUS_ADDRESSES, DBUS_TESTER_ADDRESS, encode } from '@emdzej/dbus-protocol'
import { MemoryTransport } from '@emdzej/ibusx-core'
import { afterEach, describe, expect, it } from 'vitest'
import { DBus } from '../src/dbus.js'
import { DME } from '../src/dme.js'
import type { DBusNegativeResponseError } from '../src/errors.js'

let activeBus: DBus | undefined

afterEach(async () => {
  if (activeBus !== undefined) {
    await activeBus.stop()
    activeBus = undefined
  }
})

function injectResponse(ecu: MemoryTransport, payload: Uint8Array): void {
  ecu.events.on('data', () => {
    queueMicrotask(() => {
      void ecu.write(
        encode({
          destination: DBUS_TESTER_ADDRESS,
          payload,
          checksum: 0,
        }),
      )
    })
  })
}

describe('DME', () => {
  it('reports correct address and name', () => {
    const [testerSide] = MemoryTransport.pair()
    const bus = new DBus(testerSide)
    activeBus = bus
    const dme = new DME(bus)
    expect(dme.address).toBe(DBUS_ADDRESSES.DME)
    expect(dme.name).toBe('DME')
    expect(dme.state.identification).toBeUndefined()
  })

  it('readIdentification() resolves with the ECU data and updates state', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    injectResponse(ecuSide, new Uint8Array([0xa0, 0x4d, 0x4d, 0x33, 0x35, 0x37]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    const events: number[][] = []
    dme.events.on('identification', (ident) => {
      events.push([...ident.data])
    })

    const ident = await dme.readIdentification()
    expect(Array.from(ident.data)).toEqual([0x4d, 0x4d, 0x33, 0x35, 0x37])
    expect(dme.state.identification).toBe(ident)
    expect(events).toEqual([[0x4d, 0x4d, 0x33, 0x35, 0x37]])

    await ecuSide.close()
  })

  it('readIdentification() throws DBusNegativeResponseError on negative ACK', async () => {
    const [testerSide, ecuSide] = MemoryTransport.pair()
    injectResponse(ecuSide, new Uint8Array([0xff]))
    await ecuSide.open()

    const bus = new DBus(testerSide)
    activeBus = bus
    await bus.start()
    const dme = new DME(bus)

    let caught: DBusNegativeResponseError | undefined
    try {
      await dme.readIdentification()
    } catch (err) {
      caught = err as DBusNegativeResponseError
    }
    expect(caught?.responseCode).toBe(0xff)
    expect(dme.state.identification).toBeUndefined()

    await ecuSide.close()
  })
})
