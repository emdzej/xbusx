import type { ControlParam } from '@emdzej/ibusx-core'

export class ArgValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArgValidationError'
  }
}

/**
 * Coerce a single CLI-string argument into the typed value the control expects.
 * `name` is included in error messages so the user knows which param failed.
 */
export function coerceArg(name: string, raw: string | undefined, param: ControlParam): unknown {
  const value = raw ?? defaultFor(param)
  if (value === undefined) {
    throw new ArgValidationError(`missing required argument --${name}`)
  }
  switch (param.kind) {
    case 'enum': {
      if (!param.values.includes(value)) {
        throw new ArgValidationError(
          `--${name}: expected one of ${param.values.join(', ')}, got ${value}`,
        )
      }
      return value
    }
    case 'number': {
      const n = Number(value)
      if (!Number.isFinite(n)) {
        throw new ArgValidationError(`--${name}: expected a number, got ${value}`)
      }
      if (param.min !== undefined && n < param.min) {
        throw new ArgValidationError(`--${name}: ${n} below min ${param.min}`)
      }
      if (param.max !== undefined && n > param.max) {
        throw new ArgValidationError(`--${name}: ${n} above max ${param.max}`)
      }
      return n
    }
    case 'string': {
      if (param.maxLength !== undefined && value.length > param.maxLength) {
        throw new ArgValidationError(
          `--${name}: string longer than ${param.maxLength} chars (${value.length})`,
        )
      }
      return value
    }
    case 'boolean': {
      if (value === 'true' || value === '1' || value === 'yes') return true
      if (value === 'false' || value === '0' || value === 'no') return false
      throw new ArgValidationError(`--${name}: expected true|false, got ${value}`)
    }
  }
}

function defaultFor(param: ControlParam): string | undefined {
  if (param.kind === 'boolean' && param.default !== undefined) return String(param.default)
  if (param.kind === 'number' && param.default !== undefined) return String(param.default)
  if (param.kind === 'string' && param.default !== undefined) return param.default
  if (param.kind === 'enum' && param.default !== undefined) return param.default
  return undefined
}
