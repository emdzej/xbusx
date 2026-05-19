import { describe, expect, it } from 'vitest'
import { parseResponse, RESPONSE, responseCodeName } from '../src/responses.js'

const msg = (payload: number[]) => ({
  destination: 0xf1,
  payload: new Uint8Array(payload),
  checksum: 0,
})

describe('parseResponse', () => {
  it('classifies 0xA0 as positive with the trailing bytes as data', () => {
    const result = parseResponse(msg([0xa0, 0x01, 0x02, 0x03]))
    expect(result.kind).toBe('positive')
    expect(result.code).toBe(0xa0)
    expect(Array.from(result.data)).toEqual([0x01, 0x02, 0x03])
  })

  it('classifies 0xFF as negative', () => {
    const result = parseResponse(msg([0xff]))
    expect(result.kind).toBe('negative')
    expect(result.code).toBe(RESPONSE.NEGATIVE_ACK)
  })

  it.each([
    ['BUSY', RESPONSE.BUSY],
    ['REJECTED', RESPONSE.REJECTED],
    ['PARAMETER_ERROR', RESPONSE.PARAMETER_ERROR],
    ['FUNCTION_ERROR', RESPONSE.FUNCTION_ERROR],
    ['CODING_ERROR', RESPONSE.CODING_ERROR],
    ['TERMINATE', RESPONSE.TERMINATE],
  ])('classifies %s (0x%s) as negative', (_name, code) => {
    const result = parseResponse(msg([code]))
    expect(result.kind).toBe('negative')
    expect(result.code).toBe(code)
  })

  it('returns kind=unknown for unrecognised codes', () => {
    const result = parseResponse(msg([0x55, 0xaa]))
    expect(result.kind).toBe('unknown')
    expect(result.code).toBe(0x55)
    expect(Array.from(result.data)).toEqual([0xaa])
  })
})

describe('responseCodeName', () => {
  it('maps known codes to symbolic names', () => {
    expect(responseCodeName(0xa0)).toBe('POSITIVE_ACK')
    expect(responseCodeName(0xff)).toBe('NEGATIVE_ACK')
    expect(responseCodeName(0xb0)).toBe('PARAMETER_ERROR')
  })

  it('falls back to hex for unknown codes', () => {
    expect(responseCodeName(0x55)).toBe('0x55')
  })
})
