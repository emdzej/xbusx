import { TransportNotOpenError } from '@emdzej/ibusx-core'
import { describe, expect, it } from 'vitest'
import { SerialTransport } from '../src/serial-transport.js'

describe('SerialTransport', () => {
  it('constructs without opening the port', () => {
    const t = new SerialTransport({ path: '/dev/null-test' })
    expect(t.isOpen).toBe(false)
  })

  it('rejects writes when the port is not open', async () => {
    const t = new SerialTransport({ path: '/dev/null-test' })
    await expect(t.write(new Uint8Array([1]))).rejects.toBeInstanceOf(TransportNotOpenError)
  })

  it('close() on a never-opened transport is a no-op', async () => {
    const t = new SerialTransport({ path: '/dev/null-test' })
    await expect(t.close()).resolves.toBeUndefined()
  })

  it('exposes a typed events emitter with open/close/error/data channels', () => {
    const t = new SerialTransport({ path: '/dev/null-test' })
    expect(typeof t.events.on).toBe('function')
    expect(typeof t.events.off).toBe('function')
    expect(typeof t.events.emit).toBe('function')
    expect(t.events.listenerCount('data')).toBe(0)
    expect(t.events.listenerCount('error')).toBe(0)
    expect(t.events.listenerCount('open')).toBe(0)
    expect(t.events.listenerCount('close')).toBe(0)
  })

  // Note: end-to-end open/data/write tests require actual serial hardware and
  // are intentionally omitted.  Run the CLI against a real port (or a virtual
  // pair via `socat`) for that integration coverage.
})
