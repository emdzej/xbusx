import type { ControlParam } from '@emdzej/ibusx-core'
import { describe, expect, it } from 'vitest'
import { ArgValidationError, coerceArg } from '../src/coerce.js'

describe('coerceArg', () => {
  describe('enum', () => {
    const param: ControlParam = { kind: 'enum', values: ['a', 'b'] as const }

    it('passes through valid values', () => {
      expect(coerceArg('x', 'a', param)).toBe('a')
    })

    it('rejects unknown values', () => {
      expect(() => coerceArg('x', 'c', param)).toThrow(ArgValidationError)
    })

    it('uses default when raw is undefined', () => {
      expect(coerceArg('x', undefined, { ...param, default: 'b' })).toBe('b')
    })

    it('throws when no value and no default', () => {
      expect(() => coerceArg('x', undefined, param)).toThrow(/missing/i)
    })
  })

  describe('number', () => {
    it('parses integers and floats', () => {
      expect(coerceArg('n', '42', { kind: 'number' })).toBe(42)
      expect(coerceArg('n', '3.14', { kind: 'number' })).toBeCloseTo(3.14)
    })

    it('rejects non-numbers', () => {
      expect(() => coerceArg('n', 'oops', { kind: 'number' })).toThrow(ArgValidationError)
    })

    it('enforces min/max', () => {
      const p: ControlParam = { kind: 'number', min: 0, max: 10 }
      expect(() => coerceArg('n', '-1', p)).toThrow(/below min/)
      expect(() => coerceArg('n', '11', p)).toThrow(/above max/)
    })
  })

  describe('string', () => {
    it('passes raw value', () => {
      expect(coerceArg('s', 'hello', { kind: 'string' })).toBe('hello')
    })

    it('enforces maxLength', () => {
      expect(() => coerceArg('s', 'abcdef', { kind: 'string', maxLength: 3 })).toThrow(
        /longer than 3/,
      )
    })
  })

  describe('boolean', () => {
    it('accepts truthy variants', () => {
      expect(coerceArg('b', 'true', { kind: 'boolean' })).toBe(true)
      expect(coerceArg('b', '1', { kind: 'boolean' })).toBe(true)
      expect(coerceArg('b', 'yes', { kind: 'boolean' })).toBe(true)
    })

    it('accepts falsy variants', () => {
      expect(coerceArg('b', 'false', { kind: 'boolean' })).toBe(false)
      expect(coerceArg('b', '0', { kind: 'boolean' })).toBe(false)
      expect(coerceArg('b', 'no', { kind: 'boolean' })).toBe(false)
    })

    it('rejects nonsense', () => {
      expect(() => coerceArg('b', 'maybe', { kind: 'boolean' })).toThrow(ArgValidationError)
    })
  })
})
