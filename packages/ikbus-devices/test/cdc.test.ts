import { buildCDCRequest, type CDCStatus, parseCDCStatus } from '@emdzej/ibusx-commands'
import { IBus, MemoryTransport, Vehicle } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it, vi } from 'vitest'
import { CDC, CDCControls } from '../src/cdc.js'

async function setupCDC() {
  const [a, b] = MemoryTransport.pair()
  const vehicle = new Vehicle()
  const cdcBus = new IBus(a, vehicle)
  const radBus = new IBus(b, vehicle)
  const cdc = cdcBus.registerDevice(new CDC())
  cdc.mode = 'active'
  await cdcBus.start()
  await radBus.start()
  return { cdc, cdcBus, radBus, a, b }
}

async function flush(): Promise<void> {
  await new Promise<void>((r) => setTimeout(r, 0))
}

async function injectRadioRequest(
  cdcBus: IBus,
  destinationTransport: MemoryTransport,
  subcommand: CDCStatus extends never ? never : Parameters<typeof buildCDCRequest>[0]['subcommand'],
  param = 0,
): Promise<void> {
  // Build a 0x38 request from RAD → CDC and inject it into the CDC's transport.
  const msg = buildCDCRequest({
    source: DEVICE_ADDRESSES.RAD,
    destination: DEVICE_ADDRESSES.CDC,
    subcommand,
    param,
  })
  destinationTransport.inject(encode(msg))
  await flush()
  void cdcBus
}

describe('CDC twin — active emulation', () => {
  it('responds to GET_STATUS with a 0x39 status frame', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    const onStatus = vi.fn()
    radBus.events.on('frame', onStatus)

    await injectRadioRequest(cdcBus, a, 'GET_STATUS')

    expect(onStatus).toHaveBeenCalled()
    const msg = onStatus.mock.calls[0]![0]
    expect(msg.source).toBe(DEVICE_ADDRESSES.CDC)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.RAD)
    expect(parseCDCStatus(msg).status).toBe('STOP') // initial state
    void cdc

    await cdcBus.stop()
    await radBus.stop()
  })

  it('transitions STOP → PLAYING on START_PLAYING and emits playStarted', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    const onStart = vi.fn()
    cdc.events.on('playStarted', onStart)
    const onFrame = vi.fn()
    radBus.events.on('frame', onFrame)

    await injectRadioRequest(cdcBus, a, 'START_PLAYING')

    expect(onStart).toHaveBeenCalled()
    expect(cdc.state.status).toBe('PLAYING')
    expect(cdc.state.function).toBe('PLAYING')
    expect(parseCDCStatus(onFrame.mock.calls[0]![0]).status).toBe('PLAYING')

    await cdcBus.stop()
    await radBus.stop()
  })

  it('CHANGE_TRACK with non-zero param advances the track', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    cdc.setState({ track: 5 })
    await injectRadioRequest(cdcBus, a, 'CHANGE_TRACK', 1)
    expect(cdc.state.track).toBe(6)
    await cdcBus.stop()
    await radBus.stop()
  })

  it('CHANGE_TRACK with param=0 goes back a track (clamped to 1)', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    cdc.setState({ track: 2 })
    await injectRadioRequest(cdcBus, a, 'CHANGE_TRACK', 0)
    expect(cdc.state.track).toBe(1)
    await injectRadioRequest(cdcBus, a, 'CHANGE_TRACK', 0)
    expect(cdc.state.track).toBe(1) // clamped
    await cdcBus.stop()
    await radBus.stop()
  })

  it('CD_CHANGE selects the disc and resets track to 1', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    cdc.setState({ disc: 1, track: 5 })
    await injectRadioRequest(cdcBus, a, 'CD_CHANGE', 3)
    expect(cdc.state.disc).toBe(3)
    expect(cdc.state.track).toBe(1)
    await cdcBus.stop()
    await radBus.stop()
  })

  it('does NOT emit status in passive mode (just observes)', async () => {
    const { cdc, cdcBus, radBus, a } = await setupCDC()
    cdc.mode = 'passive'
    const reqRcv = vi.fn()
    cdc.events.on('requestReceived', reqRcv)
    const radFrames = vi.fn()
    radBus.events.on('frame', radFrames)

    await injectRadioRequest(cdcBus, a, 'START_PLAYING')

    expect(reqRcv).toHaveBeenCalled() // we still parsed the request
    expect(radFrames).not.toHaveBeenCalled() // but we did NOT respond
    expect(cdc.state.status).toBe('STOP') // state unchanged

    await cdcBus.stop()
    await radBus.stop()
  })

  it('CDCControls.nextTrack advances the track and broadcasts status', async () => {
    const { cdc, cdcBus, radBus } = await setupCDC()
    cdc.setState({ track: 7 })
    const onFrame = vi.fn()
    radBus.events.on('frame', onFrame)
    await CDCControls.nextTrack.invoke(cdc, {})
    await flush()
    expect(cdc.state.track).toBe(8)
    expect(parseCDCStatus(onFrame.mock.calls[0]![0]).track).toBe(8)
    void decode
    await cdcBus.stop()
    await radBus.stop()
  })
})
