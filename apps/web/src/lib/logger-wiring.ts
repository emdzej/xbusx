/**
 * Apply a persisted `WebLoggerConfig` onto the bimmerz-logger
 * central config. Called once at boot in `App.svelte` (before the
 * first Connect attempt) so component-init log calls land at the
 * user's chosen level.
 *
 * No UI surface yet — users tweak via DevTools (`localStorage`
 * + reload), or via the CLI's `XBUSX_LOG_*` env vars. A future
 * Settings dialog will wire mutators here.
 */

import { configureLogger, type LogLevel } from '@emdzej/bimmerz-logger'
import type { WebLoggerConfig } from './storage.js'

const VALID_LEVELS = new Set<LogLevel>([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
])

function sanitizeLevel(value: unknown): LogLevel | undefined {
  return typeof value === 'string' && VALID_LEVELS.has(value as LogLevel)
    ? (value as LogLevel)
    : undefined
}

function sanitizeCategories(
  raw: WebLoggerConfig['categories'],
): Record<string, LogLevel> | undefined {
  if (!raw) return undefined
  const out: Record<string, LogLevel> = {}
  for (const [key, value] of Object.entries(raw)) {
    const trimmedKey = key.trim()
    if (!trimmedKey) continue
    const level = sanitizeLevel(value)
    if (level) out[trimmedKey] = level
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function applyLoggerConfig(logging?: WebLoggerConfig): void {
  configureLogger({
    level: sanitizeLevel(logging?.level) ?? 'info',
    categories: sanitizeCategories(logging?.categories) ?? {},
  })
}
