import { decode, encode } from '@emdzej/ibusx-protocol'
import { describe, expect, it } from 'vitest'
import {
  BMBT_TAPE_LED_CONTROL,
  buildBMBTTapeLedControl,
  parseBMBTTapeLedControl,
} from '../../src/bmbt/tape-control.js'

describe('BMBT Tape/LED Control 0x4A', () => {
  it('decodes Wilhelm LED off example (68 04 F0 4A 00 D6)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0xf0, 0x4a, 0x00, 0xd6]))
    expect(parseBMBTTapeLedControl(msg).command).toBe(BMBT_TAPE_LED_CONTROL.LED_OFF)
  })

  it('decodes Wilhelm LED on example (68 04 F0 4A FF 29)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0xf0, 0x4a, 0xff, 0x29]))
    expect(parseBMBTTapeLedControl(msg).command).toBe(BMBT_TAPE_LED_CONTROL.LED_ON)
  })

  it('decodes Wilhelm tape play example (68 04 F0 4A 4B 9D)', () => {
    const msg = decode(new Uint8Array([0x68, 0x04, 0xf0, 0x4a, 0x4b, 0x9d]))
    expect(parseBMBTTapeLedControl(msg).command).toBe(BMBT_TAPE_LED_CONTROL.PLAY)
  })

  it('round-trips builder/parser', () => {
    const msg = buildBMBTTapeLedControl({ command: BMBT_TAPE_LED_CONTROL.STOP })
    expect(parseBMBTTapeLedControl(decode(encode(msg))).command).toBe(BMBT_TAPE_LED_CONTROL.STOP)
  })
})
