import { IKBus, MemoryTransport, Vehicle } from '@emdzej/ibusx-core'
import {
  buildDoorsStatus,
  parseCDCRequest,
  parseDoorsStatus,
  ZKE3_JOBS,
  ZKE5_JOBS,
} from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it, vi } from 'vitest'
import { GM, GMControls } from '../src/gm.js'

async function setupGM(chassis?: 'E39' | 'E46') {
  const [tx, rx] = MemoryTransport.pair()
  const vehicle = new Vehicle(chassis !== undefined ? { chassis } : {})
  const txBus = new IKBus(tx, vehicle)
  const rxBus = new IKBus(rx, vehicle)
  const gm = txBus.registerDevice(new GM())
  gm.mode = 'active'
  await txBus.start()
  await rxBus.start()
  return { gm, vehicle, txBus, rxBus, tx, rx }
}

async function flush(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 0))
}

describe('GM twin — passive parsing', () => {
  it('parses a 0x7A doors broadcast into the typed state slot', async () => {
    const { txBus, rxBus, gm, tx } = await setupGM()
    const onDoors = vi.fn()
    gm.events.on('doorsUpdate', onDoors)
    // Inject a 0x7A frame from GM with driver door open + LOCKED
    tx.inject(
      encode(buildDoorsStatus({ driverDoorOpen: true, centralLock: 'LOCKED', interiorLamp: true })),
    )
    expect(onDoors).toHaveBeenCalledTimes(1)
    expect(gm.state.doors?.driverDoorOpen).toBe(true)
    expect(gm.state.doors?.centralLock).toBe('LOCKED')
    await txBus.stop()
    await rxBus.stop()
  })
})

describe('GM twin — variant detection', () => {
  it('detects ZKE5 from E46 chassis when variant is not declared', async () => {
    const { gm, txBus, rxBus } = await setupGM('E46')
    expect(gm.detectVariant()).toBe('ZKE5')
    await txBus.stop()
    await rxBus.stop()
  })

  it('detects ZKE3_GM1 by default on E39', async () => {
    const { gm, txBus, rxBus } = await setupGM('E39')
    expect(gm.detectVariant()).toBe('ZKE3_GM1')
    await txBus.stop()
    await rxBus.stop()
  })

  it('honours explicit vehicle.variants.gm over the chassis heuristic', async () => {
    const { gm, vehicle, txBus, rxBus } = await setupGM('E39')
    vehicle.setVariants({ gm: 'ZKE3_GM5' })
    expect(gm.detectVariant()).toBe('ZKE3_GM5')
    await txBus.stop()
    await rxBus.stop()
  })
})

describe('GM twin — lock commands', () => {
  it('lockAll on ZKE5 chassis emits the 3-byte 0x4F frame', async () => {
    const { gm, txBus, rxBus, rxBus: rx, rx: rxTransport } = await setupGM('E46')
    void rx
    void rxTransport
    const onSent = vi.fn()
    gm.events.on('lockCommandSent', onSent)
    const txFrames = vi.fn()
    txBus.events.on('txFrame', txFrames)

    await gm.lockAll()
    await flush()

    expect(txFrames).toHaveBeenCalledTimes(1)
    const msg = txFrames.mock.calls[0]![0]
    expect(msg.destination).toBe(DEVICE_ADDRESSES.GM)
    expect(Array.from(msg.payload)).toEqual([0x0c, ZKE5_JOBS.LOCK_ALL, 0x01])
    expect(onSent).toHaveBeenCalledWith({ variant: 'ZKE5', job: ZKE5_JOBS.LOCK_ALL })
    await txBus.stop()
    await rxBus.stop()
  })

  it('lockAll on ZKE3 chassis emits the 4-byte 0x88 frame for GM1', async () => {
    const { gm, txBus, rxBus } = await setupGM('E39')
    const txFrames = vi.fn()
    txBus.events.on('txFrame', txFrames)
    await gm.lockAll()
    await flush()
    const msg = txFrames.mock.calls[0]![0]
    expect(Array.from(msg.payload)).toEqual([0x0c, 0x00, ZKE3_JOBS.LOCK_ALL_GM1, 0x01])
    await txBus.stop()
    await rxBus.stop()
  })

  it('unlockTrunk is a no-op on ZKE3', async () => {
    const { gm, txBus, rxBus } = await setupGM('E39')
    const txFrames = vi.fn()
    txBus.events.on('txFrame', txFrames)
    await gm.unlockTrunk()
    await flush()
    expect(txFrames).not.toHaveBeenCalled()
    await txBus.stop()
    await rxBus.stop()
  })

  it('GMControls.lockAll dispatches via the manifest', async () => {
    const { gm, txBus, rxBus } = await setupGM('E46')
    const txFrames = vi.fn()
    txBus.events.on('txFrame', txFrames)
    await GMControls.lockAll.invoke(gm, {})
    await flush()
    expect(txFrames).toHaveBeenCalledTimes(1)
    await txBus.stop()
    await rxBus.stop()
  })
})
// silence unused-import warning if any linter mode triggers it
void parseCDCRequest
void parseDoorsStatus
void decode
