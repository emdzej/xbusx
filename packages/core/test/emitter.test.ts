import { describe, expect, it, vi } from 'vitest'
import { TypedEmitter } from '../src/emitter.js'

type Events = {
  data: { value: number }
  open: void
  error: Error
}

describe('TypedEmitter', () => {
  it('delivers payloads to listeners', () => {
    const emitter = new TypedEmitter<Events>()
    const fn = vi.fn()
    emitter.on('data', fn)
    emitter.emit('data', { value: 42 })
    expect(fn).toHaveBeenCalledWith({ value: 42 })
  })

  it('supports void-payload events (no payload arg)', () => {
    const emitter = new TypedEmitter<Events>()
    const fn = vi.fn()
    emitter.on('open', fn)
    emitter.emit('open')
    expect(fn).toHaveBeenCalledWith()
  })

  it('off() removes a listener', () => {
    const emitter = new TypedEmitter<Events>()
    const fn = vi.fn()
    emitter.on('data', fn)
    emitter.off('data', fn)
    emitter.emit('data', { value: 1 })
    expect(fn).not.toHaveBeenCalled()
  })

  it('once() fires only the first emit', () => {
    const emitter = new TypedEmitter<Events>()
    const fn = vi.fn()
    emitter.once('data', fn)
    emitter.emit('data', { value: 1 })
    emitter.emit('data', { value: 2 })
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith({ value: 1 })
  })

  it('listenerCount reflects current registrations', () => {
    const emitter = new TypedEmitter<Events>()
    expect(emitter.listenerCount('data')).toBe(0)
    const a = vi.fn()
    const b = vi.fn()
    emitter.on('data', a)
    emitter.on('data', b)
    expect(emitter.listenerCount('data')).toBe(2)
    emitter.off('data', a)
    expect(emitter.listenerCount('data')).toBe(1)
  })

  it('removeAllListeners clears all events when called without args', () => {
    const emitter = new TypedEmitter<Events>()
    emitter.on('data', vi.fn())
    emitter.on('open', vi.fn())
    emitter.removeAllListeners()
    expect(emitter.listenerCount('data')).toBe(0)
    expect(emitter.listenerCount('open')).toBe(0)
  })

  it('isolates listener errors — one throwing listener does not stop the others', () => {
    const emitter = new TypedEmitter<Events>()
    const goodA = vi.fn()
    const goodB = vi.fn()
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    emitter.on('data', goodA)
    emitter.on('data', bad)
    emitter.on('data', goodB)

    expect(() => emitter.emit('data', { value: 1 })).not.toThrow()
    expect(goodA).toHaveBeenCalledTimes(1)
    expect(bad).toHaveBeenCalledTimes(1)
    expect(goodB).toHaveBeenCalledTimes(1)
  })

  it('listener that removes itself during emit is allowed', () => {
    const emitter = new TypedEmitter<Events>()
    const fn = vi.fn(() => emitter.off('data', fn))
    emitter.on('data', fn)
    emitter.emit('data', { value: 1 })
    emitter.emit('data', { value: 2 })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
