import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildTELMenuText,
  buildTELMenuTextFromFields,
  parseTELMenuText,
  parseTELMenuTextSegments,
  TEL_MENU_FUNCTION,
  TEL_MENU_LAYOUT,
} from '../../src/tel/menu-text.js'

describe('parseTELMenuText', () => {
  it('decodes Wilhelm DIAL example (C8 06 3B 21 42 02 20 B4)', () => {
    // layout=0x42 DIAL, function=0x02 DIGIT, options=0x20 (CLEAR + index 0)
    const msg = decode(new Uint8Array([0xc8, 0x06, 0x3b, 0x21, 0x42, 0x02, 0x20, 0xb4]))
    const t = parseTELMenuText(msg)
    expect(t.layout).toBe(TEL_MENU_LAYOUT.DIAL)
    expect(t.function).toBe(TEL_MENU_FUNCTION.DIGIT)
    expect(t.index).toBe(0)
    expect(t.clear).toBe(true)
    expect(t.buffer).toBe(false)
    expect(t.highlight).toBe(false)
  })

  it('decodes the Wilhelm DIRECTORY example with multi-field string', () => {
    // C8 1E 3B 21 43 01 60 06 "CallConnect" 06 "MessageBank" FF
    const bytes = [
      0xc8, 0x1e, 0x3b, 0x21, 0x43, 0x01, 0x60, 0x06, 0x43, 0x61, 0x6c, 0x6c, 0x43, 0x6f, 0x6e,
      0x6e, 0x65, 0x63, 0x74, 0x06, 0x4d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x42, 0x61, 0x6e,
      0x6b, 0xff,
    ]
    const msg = decode(new Uint8Array(bytes))
    const t = parseTELMenuText(msg)
    expect(t.layout).toBe(TEL_MENU_LAYOUT.DIRECTORY)
    expect(t.function).toBe(TEL_MENU_FUNCTION.CONTACT)
    // 0x60 = BUFFER (0x40) | CLEAR (0x20) | index 0
    expect(t.clear).toBe(true)
    expect(t.buffer).toBe(true)
    expect(t.index).toBe(0)
    // First byte 0x06 → empty first segment, then "CallConnect", then "MessageBank"
    const segments = parseTELMenuTextSegments(t.data)
    expect(segments).toEqual(['', 'CallConnect', 'MessageBank'])
  })
})

describe('buildTELMenuText', () => {
  it('rebuilds the Wilhelm DIAL example exactly (header-only)', () => {
    const msg = buildTELMenuText({
      layout: TEL_MENU_LAYOUT.DIAL,
      function: TEL_MENU_FUNCTION.DIGIT,
      clear: true,
      data: [],
    })
    expect(Array.from(encode(msg))).toEqual([0xc8, 0x06, 0x3b, 0x21, 0x42, 0x02, 0x20, 0xb4])
  })

  it('builds a multi-field frame from strings', () => {
    const msg = buildTELMenuTextFromFields({
      layout: TEL_MENU_LAYOUT.DIRECTORY,
      function: TEL_MENU_FUNCTION.CONTACT,
      buffer: true,
      clear: true,
      fields: ['', 'CallConnect', 'MessageBank'],
    })
    const parsed = parseTELMenuText(decode(encode(msg)))
    const segs = parseTELMenuTextSegments(parsed.data)
    expect(segs).toEqual(['', 'CallConnect', 'MessageBank'])
    expect(parsed.clear).toBe(true)
    expect(parsed.buffer).toBe(true)
  })

  it('rejects non-Latin-1 text', () => {
    expect(() =>
      buildTELMenuTextFromFields({
        layout: TEL_MENU_LAYOUT.DIAL,
        function: TEL_MENU_FUNCTION.NULL,
        fields: ['ok ✓'],
      }),
    ).toThrow(CommandPayloadError)
  })

  it('rejects out-of-range index', () => {
    expect(() =>
      buildTELMenuText({
        layout: TEL_MENU_LAYOUT.DIAL,
        function: 0,
        index: 32,
        data: [0x20],
      }),
    ).toThrow(/5-bit range/)
  })
})
