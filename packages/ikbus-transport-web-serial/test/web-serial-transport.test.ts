import { describe, expect, it } from 'vitest'
import { WebSerialTransport } from '../src/web-serial-transport.js'

class MockReader {
  private queue: Array<{ value?: Uint8Array; done: boolean }> = []
  private waiters: Array<(v: { value?: Uint8Array; done: boolean }) => void> = []
  private cancelled = false

  push(value: Uint8Array): void {
    if (this.cancelled) return
    if (this.waiters.length > 0) {
      this.waiters.shift()?.({ value, done: false })
    } else {
      this.queue.push({ value, done: false })
    }
  }

  async read(): Promise<{ value?: Uint8Array; done: boolean }> {
    const next = this.queue.shift()
    if (next !== undefined) return next
    if (this.cancelled) return { done: true }
    return new Promise((resolve) => {
      this.waiters.push(resolve)
    })
  }

  async cancel(): Promise<void> {
    this.cancelled = true
    for (const w of this.waiters) w({ done: true })
    this.waiters = []
  }

  releaseLock(): void {
    /* no-op */
  }
}

class MockWriter {
  written: Uint8Array[] = []
  async write(bytes: Uint8Array): Promise<void> {
    this.written.push(bytes)
  }
  async close(): Promise<void> {
    /* no-op */
  }
  releaseLock(): void {
    /* no-op */
  }
}

function makeMockPort(): { port: SerialPort; reader: MockReader; writer: MockWriter } {
  const reader = new MockReader()
  const writer = new MockWriter()
  const port = {
    readable: { getReader: () => reader } as unknown as ReadableStream<Uint8Array>,
    writable: { getWriter: () => writer } as unknown as WritableStream<Uint8Array>,
    open: async (_opts: SerialOptions) => undefined,
    close: async () => undefined,
  } as unknown as SerialPort
  return { port, reader, writer }
}

describe('WebSerialTransport', () => {
  it('emits open + data + close events', async () => {
    const { port, reader } = makeMockPort()
    const transport = new WebSerialTransport({ port })

    const opens: undefined[] = []
    const datas: Uint8Array[] = []
    const closes: undefined[] = []
    transport.events.on('open', () => opens.push(undefined))
    transport.events.on('data', (d) => datas.push(d))
    transport.events.on('close', () => closes.push(undefined))

    await transport.open()
    expect(opens).toHaveLength(1)
    expect(transport.isOpen).toBe(true)

    reader.push(new Uint8Array([1, 2, 3]))
    await new Promise((r) => setTimeout(r, 0))
    expect(datas).toHaveLength(1)
    expect(datas[0]).toEqual(new Uint8Array([1, 2, 3]))

    await transport.close()
    expect(closes).toHaveLength(1)
    expect(transport.isOpen).toBe(false)
  })

  it('writes bytes through the writer', async () => {
    const { port, writer } = makeMockPort()
    const transport = new WebSerialTransport({ port })
    await transport.open()
    await transport.write(new Uint8Array([0xaa, 0xbb]))
    expect(writer.written).toEqual([new Uint8Array([0xaa, 0xbb])])
    await transport.close()
  })

  it('refuses writes before open', async () => {
    const { port } = makeMockPort()
    const transport = new WebSerialTransport({ port })
    await expect(transport.write(new Uint8Array([1]))).rejects.toThrow()
  })

  it('is idempotent on open and close', async () => {
    const { port } = makeMockPort()
    const transport = new WebSerialTransport({ port })
    await transport.open()
    await transport.open()
    await transport.close()
    await transport.close()
    expect(transport.isOpen).toBe(false)
  })
})
