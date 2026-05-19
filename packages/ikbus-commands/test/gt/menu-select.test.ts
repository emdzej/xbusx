import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import {
  buildGTMenuSelect,
  GT_MENU_SELECT_TELEPHONE,
  parseGTMenuSelect,
} from '../../src/gt/menu-select.js'

describe('GT menu-select 0x20', () => {
  it('decodes the Wilhelm telephone-from-main example (3B 05 FF 20 02 0C EF)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x05, 0xff, 0x20, 0x02, 0x0c, 0xef]))
    expect(parseGTMenuSelect(msg)).toEqual({ param1: 0x02, param2: 0x0c })
  })

  it('rebuilds the Wilhelm telephone-from-main example exactly', () => {
    const msg = buildGTMenuSelect(GT_MENU_SELECT_TELEPHONE)
    expect(Array.from(encode(msg))).toEqual([0x3b, 0x05, 0xff, 0x20, 0x02, 0x0c, 0xef])
  })

  it('rejects out-of-range bytes', () => {
    expect(() => buildGTMenuSelect({ param1: 256, param2: 0 })).toThrow(CommandPayloadError)
    expect(() => buildGTMenuSelect({ param1: 0, param2: -1 })).toThrow(CommandPayloadError)
  })
})
