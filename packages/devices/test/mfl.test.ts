import { parseMFLButton, parseVolume } from '@emdzej/ibusx-commands'
import { IBus, MemoryTransport, Vehicle } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, decode } from '@emdzej/ibusx-protocol'
import { describe, expect, it, vi } from 'vitest'
import { MFL, MFLControls } from '../src/mfl.js'

async function setup() {
  const [tx, rx] = MemoryTransport.pair()
  const vehicle = new Vehicle({ chassis: 'E39' })
  const txBus = new IBus(tx, vehicle)
  const rxBus = new IBus(rx, vehicle)
  const mfl = txBus.registerDevice(new MFL())
  mfl.mode = 'active'
  await txBus.start()
  await rxBus.start()
  return { mfl, tx, rx, txBus, rxBus }
}

async function nextTick(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('MFL twin', () => {
  it('pressButton emits a 0x3B frame to RAD by default', async () => {
    const { mfl, rxBus, txBus, rx } = await setup()
    const rxFrames = vi.fn()
    rxBus.events.on('frame', rxFrames)

    await mfl.pressButton('FORWARD')
    await nextTick()

    expect(rxFrames).toHaveBeenCalledTimes(1)
    const msg = rxFrames.mock.calls[0]![0]
    expect(msg.source).toBe(DEVICE_ADDRESSES.MFL)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.RAD)
    expect(parseMFLButton(msg)).toEqual({ button: 'FORWARD', state: 'PRESS' })

    void rx
    await txBus.stop()
    await rxBus.stop()
  })

  it('RT press flips routing so the next button goes to TEL', async () => {
    const { mfl, rxBus, txBus } = await setup()
    const rxFrames = vi.fn()
    rxBus.events.on('frame', rxFrames)

    await mfl.pressButton('RT')
    await nextTick()
    await mfl.pressButton('FORWARD')
    await nextTick()

    expect(rxFrames).toHaveBeenCalledTimes(2)
    const second = rxFrames.mock.calls[1]![0]
    expect(second.destination).toBe(DEVICE_ADDRESSES.TEL)
    expect(mfl.state.routing).toBe('TEL')

    await txBus.stop()
    await rxBus.stop()
  })

  it('changeVolume emits a 0x32 frame with correct direction and steps', async () => {
    const { mfl, rxBus, txBus } = await setup()
    const rxFrames = vi.fn()
    rxBus.events.on('frame', rxFrames)

    await mfl.changeVolume('UP', 3)
    await nextTick()

    const msg = rxFrames.mock.calls[0]![0]
    expect(parseVolume(msg)).toEqual({ direction: 'UP', steps: 3 })

    await txBus.stop()
    await rxBus.stop()
  })

  it('exposes typed controls — MFLControls.volumeUp invokes changeVolume', async () => {
    const { mfl, rxBus, txBus } = await setup()
    const rxFrames = vi.fn()
    rxBus.events.on('frame', rxFrames)

    await MFLControls.volumeUp.invoke(mfl, {})
    await nextTick()

    const msg = rxFrames.mock.calls[0]![0]
    expect(parseVolume(msg)).toEqual({ direction: 'UP', steps: 1 })

    await txBus.stop()
    await rxBus.stop()
  })

  it('exposes pressButton with typed params via MFLControls', async () => {
    const { mfl, txBus, rxBus, rx } = await setup()
    const rxFrames = vi.fn()
    rxBus.events.on('frame', rxFrames)

    await MFLControls.pressButton.invoke(mfl, { button: 'VOICE', state: 'HOLD' })
    await nextTick()

    const msg = rxFrames.mock.calls[0]![0]
    expect(parseMFLButton(msg)).toEqual({ button: 'VOICE', state: 'HOLD' })

    void rx
    await txBus.stop()
    await rxBus.stop()
  })

  it('routingChanged event fires when routing flips', async () => {
    const { mfl, txBus, rxBus } = await setup()
    const fn = vi.fn()
    mfl.events.on('routingChanged', fn)
    mfl.toggleRouting()
    expect(fn).toHaveBeenCalledWith('TEL')
    expect(mfl.state.routing).toBe('TEL')
    await txBus.stop()
    await rxBus.stop()
  })
})
