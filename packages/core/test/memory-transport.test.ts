import { describe, expect, it, vi } from 'vitest'
import { TransportNotOpenError } from '../src/errors.js'
import { MemoryTransport } from '../src/memory-transport.js'

describe('MemoryTransport', () => {
  it('emits open/close on lifecycle', async () => {
    const t = new MemoryTransport()
    const onOpen = vi.fn()
    const onClose = vi.fn()
    t.events.on('open', onOpen)
    t.events.on('close', onClose)
    await t.open()
    expect(onOpen).toHaveBeenCalled()
    expect(t.isOpen).toBe(true)
    await t.close()
    expect(onClose).toHaveBeenCalled()
    expect(t.isOpen).toBe(false)
  })

  it('rejects writes when not open', async () => {
    const t = new MemoryTransport()
    await expect(t.write(new Uint8Array([1]))).rejects.toBeInstanceOf(TransportNotOpenError)
  })

  it('inject() synchronously fires data event', () => {
    const t = new MemoryTransport()
    const fn = vi.fn()
    t.events.on('data', fn)
    t.inject(new Uint8Array([0xaa]))
    expect(fn).toHaveBeenCalledWith(new Uint8Array([0xaa]))
  })

  it('loopback=true echoes writes back as data', async () => {
    const t = new MemoryTransport({ loopback: true })
    await t.open()
    const fn = vi.fn()
    t.events.on('data', fn)
    await t.write(new Uint8Array([0x01]))
    await new Promise<void>((r) => setImmediate(r))
    expect(fn).toHaveBeenCalledWith(new Uint8Array([0x01]))
  })

  it('loopback=false (default) does not echo', async () => {
    const t = new MemoryTransport()
    await t.open()
    const fn = vi.fn()
    t.events.on('data', fn)
    await t.write(new Uint8Array([0x01]))
    await new Promise<void>((r) => setImmediate(r))
    expect(fn).not.toHaveBeenCalled()
  })

  it('pair() — writes on one appear as data on the other', async () => {
    const [a, b] = MemoryTransport.pair()
    await a.open()
    await b.open()

    const aData = vi.fn()
    const bData = vi.fn()
    a.events.on('data', aData)
    b.events.on('data', bData)

    await a.write(new Uint8Array([0x01]))
    await b.write(new Uint8Array([0x02]))
    await new Promise<void>((r) => setImmediate(r))

    expect(aData).toHaveBeenCalledWith(new Uint8Array([0x02]))
    expect(bData).toHaveBeenCalledWith(new Uint8Array([0x01]))
  })

  it('pair() — writes from a closed peer do not surface on the open one', async () => {
    const [a, b] = MemoryTransport.pair()
    await a.open()
    // b not opened
    await a.write(new Uint8Array([0x01]))
    const bData = vi.fn()
    b.events.on('data', bData)
    await new Promise<void>((r) => setImmediate(r))
    expect(bData).not.toHaveBeenCalled()
  })
})
