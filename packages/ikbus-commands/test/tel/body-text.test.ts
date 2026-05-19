import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildTELBodyText,
  parseTELBodyText,
  TEL_BODY_LAYOUT_DETAIL,
} from '../../src/tel/body-text.js'

describe('parseTELBodyText', () => {
  it('decodes the Wilhelm "your current position is:" example', () => {
    // C8 1F 3B A5 F1 05 60 "Your current position is:" 9C
    const bytes = [
      0xc8, 0x1f, 0x3b, 0xa5, 0xf1, 0x05, 0x60, 0x59, 0x6f, 0x75, 0x72, 0x20, 0x63, 0x75, 0x72,
      0x72, 0x65, 0x6e, 0x74, 0x20, 0x70, 0x6f, 0x73, 0x69, 0x74, 0x69, 0x6f, 0x6e, 0x20, 0x69,
      0x73, 0x3a, 0x9c,
    ]
    const msg = decode(new Uint8Array(bytes))
    const t = parseTELBodyText(msg)
    expect(t.layout).toBe(TEL_BODY_LAYOUT_DETAIL)
    expect(t.offsetRaw).toBe(0x05)
    expect(t.offsetChars).toBe(4)
    // options 0x60 = CLEAR | BUFFER | index 0
    expect(t.clear).toBe(true)
    expect(t.buffer).toBe(true)
    expect(t.index).toBe(0)
    // First two bytes of "Your..." should decode correctly
    expect(t.data[0]).toBe(0x59) // 'Y'
  })
})

describe('buildTELBodyText', () => {
  it('round-trips the offset+options encoding', () => {
    const msg = buildTELBodyText({
      offsetChars: 4,
      clear: true,
      buffer: true,
      data: [0x59, 0x6f, 0x75, 0x72],
    })
    const parsed = parseTELBodyText(decode(encode(msg)))
    expect(parsed.offsetChars).toBe(4)
    expect(parsed.clear).toBe(true)
    expect(parsed.buffer).toBe(true)
  })

  it('rejects offset > 30', () => {
    expect(() => buildTELBodyText({ offsetChars: 31, data: [0x20] })).toThrow(CommandPayloadError)
  })
})
