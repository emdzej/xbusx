import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import { CommandPayloadError } from '../../src/errors.js'
import { buildIKECCMText, IKE_CCM_TEXT_LENGTH, parseIKECCMText } from '../../src/ike/ccm-text.js'

describe('parseIKECCMText', () => {
  it('parses a persist-text frame', () => {
    const msg = decode(encode(buildIKECCMText({ kind: 'persist', text: 'HELLO' })))
    expect(parseIKECCMText(msg)).toEqual({ kind: 'persist', text: 'HELLO' })
  })

  it('parses a clear frame', () => {
    const msg = decode(encode(buildIKECCMText({ kind: 'clear' })))
    expect(parseIKECCMText(msg)).toEqual({ kind: 'clear', text: '' })
  })

  it('rejects unknown sub-commands', () => {
    // Hand-built 0x1A with subcmd 0x99
    const built = encode({
      source: 0x60,
      destination: 0x80,
      payload: new Uint8Array([0x1a, 0x99, 0x00]),
      checksum: 0,
    })
    expect(() => parseIKECCMText(decode(built))).toThrow(/sub-command/)
  })
})

describe('buildIKECCMText', () => {
  it('pads text to exactly 20 chars', () => {
    const msg = buildIKECCMText({ text: 'AB' })
    expect(msg.payload).toHaveLength(3 + IKE_CCM_TEXT_LENGTH)
    // Last 18 bytes are 0x20 (space)
    for (let i = 5; i < msg.payload.length; i++) {
      expect(msg.payload[i]).toBe(0x20)
    }
  })

  it('truncates text longer than 20 chars', () => {
    const long = 'X'.repeat(40)
    const msg = buildIKECCMText({ text: long })
    expect(msg.payload).toHaveLength(3 + IKE_CCM_TEXT_LENGTH)
    expect(parseIKECCMText(decode(encode(msg))).text).toBe('X'.repeat(20))
  })

  it('accepts Latin-1 text but rejects characters beyond U+00FF', () => {
    // 'é' = U+00E9 fits in one Latin-1 byte (0xE9) — should encode.
    expect(() => buildIKECCMText({ text: 'café' })).not.toThrow()
    // '✓' = U+2713 is outside Latin-1 and is rejected.
    expect(() => buildIKECCMText({ text: 'ok ✓' })).toThrow(CommandPayloadError)
  })

  it('clears with the documented subcommand byte', () => {
    const msg = buildIKECCMText({ kind: 'clear' })
    expect(msg.payload[1]).toBe(0x30)
  })

  it('persists with the documented subcommand byte', () => {
    const msg = buildIKECCMText({ kind: 'persist', text: 'X' })
    expect(msg.payload[1]).toBe(0x36)
  })
})
