import { DEVICE_ADDRESSES, decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildMFLButton, parseMFLButton } from '../../src/mfl/buttons.js'

describe('parseMFLButton', () => {
  it('decodes FORWARD press from the Wilhelm example', () => {
    // 50 04 68 3B 01 06
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0x68, 0x3b, 0x01, 0x06])))).toEqual({
      button: 'FORWARD',
      state: 'PRESS',
    })
  })

  it('decodes BACK press and release', () => {
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0x68, 0x3b, 0x08, 0x0f])))).toEqual({
      button: 'BACK',
      state: 'PRESS',
    })
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0x68, 0x3b, 0x28, 0x2f])))).toEqual({
      button: 'BACK',
      state: 'RELEASE',
    })
  })

  it('decodes voice press / hold / release on TEL routing', () => {
    // The encoding (VOICE bit 0x80, state bits 0x00/0x10/0x20) matches
    // BlueBus's IBUS_MFL_BTN_EVENT_VOICE_PRESS/HOLD/REL (ibus.h:553–555).
    // Wilhelm mfl/3b.md's example comments are inconsistent with its own
    // encoding key — we follow the encoding.
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0xc8, 0x3b, 0x80, 0x27])))).toEqual({
      button: 'VOICE',
      state: 'PRESS',
    })
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0xc8, 0x3b, 0x90, 0x37])))).toEqual({
      button: 'VOICE',
      state: 'HOLD',
    })
    expect(parseMFLButton(decode(new Uint8Array([0x50, 0x04, 0xc8, 0x3b, 0xa0, 0x07])))).toEqual({
      button: 'VOICE',
      state: 'RELEASE',
    })
  })

  it('throws on unknown button bits', () => {
    expect(() =>
      parseMFLButton({
        source: 0x50,
        destination: 0x68,
        payload: new Uint8Array([0x3b, 0x02]),
        checksum: 0,
      }),
    ).toThrow(CommandPayloadError)
  })
})

describe('buildMFLButton', () => {
  it('defaults source to MFL, destination to RAD, state to PRESS', () => {
    const msg = buildMFLButton({ button: 'FORWARD' })
    expect(msg.source).toBe(DEVICE_ADDRESSES.MFL)
    expect(msg.destination).toBe(DEVICE_ADDRESSES.RAD)
    expect(Array.from(msg.payload)).toEqual([0x3b, 0x01])
  })

  it('round-trips every button × state combination', () => {
    const buttons = ['FORWARD', 'BACK', 'RT', 'VOICE'] as const
    const states = ['PRESS', 'HOLD', 'RELEASE'] as const
    for (const button of buttons) {
      for (const state of states) {
        const built = buildMFLButton({ button, state })
        const parsed = parseMFLButton(decode(encode(built)))
        expect(parsed).toEqual({ button, state })
      }
    }
  })

  it('routes to TEL when destination is set', () => {
    const msg = buildMFLButton({
      button: 'VOICE',
      state: 'PRESS',
      destination: DEVICE_ADDRESSES.TEL,
    })
    expect(msg.destination).toBe(DEVICE_ADDRESSES.TEL)
  })
})
