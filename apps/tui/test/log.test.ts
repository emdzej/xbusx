import { describe, expect, it } from 'vitest'
import { appendLog } from '../src/bus.js'
import type { LogEntry } from '../src/log.js'
import { LOG_CAPACITY } from '../src/log.js'

const sys = (id: number): LogEntry => ({ id, kind: 'system', ts: id, message: `m${id}` })

describe('appendLog', () => {
  it('appends within capacity', () => {
    const a = sys(1)
    const b = sys(2)
    const r1 = appendLog([], a)
    const r2 = appendLog(r1, b)
    expect(r2).toEqual([a, b])
  })

  it('caps at LOG_CAPACITY and drops the oldest', () => {
    let log: readonly LogEntry[] = []
    for (let i = 0; i < LOG_CAPACITY + 5; i++) {
      log = appendLog(log, sys(i))
    }
    expect(log).toHaveLength(LOG_CAPACITY)
    expect(log[0]).toEqual(sys(5))
    expect(log.at(-1)).toEqual(sys(LOG_CAPACITY + 4))
  })

  it('does not mutate the input array', () => {
    const original: readonly LogEntry[] = [sys(1)]
    const result = appendLog(original, sys(2))
    expect(original).toEqual([sys(1)])
    expect(result).toEqual([sys(1), sys(2)])
  })
})
