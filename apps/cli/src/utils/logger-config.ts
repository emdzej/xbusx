/**
 * Map env vars onto a `@emdzej/bimmerz-logger` `LoggerConfig`. The
 * library never reads `process.env` (it has to stay browser-
 * portable); the CLI is the host that knows about env vars and
 * forwards them here.
 *
 * Env namespace (mirrors `EDIABASX_LOG_*` / `INPAX_LOG_*` from the
 * other bimmerz tools — same shape, different prefix, so users with
 * one tool installed get familiar ergonomics):
 *
 *   XBUSX_LOG_LEVEL        trace|debug|info|warn|error|fatal|silent
 *   XBUSX_LOG_CATEGORIES   cat=level,cat=level,…
 *                          e.g. "XBUSX.ikbus=trace,XBUSX=info"
 *   XBUSX_LOG_DESTINATION  file path; logs go to file instead of stdout
 *   XBUSX_LOG_FORMAT       pretty|json — sink format
 */

import type { LoggerConfig, LogLevel } from '@emdzej/bimmerz-logger'
import { pinoSink } from '@emdzej/bimmerz-logger/sinks/pino'

export interface ResolveLoggerInputs {
  env: NodeJS.ProcessEnv
  /** `process.stdout.isTTY` (or equivalent). Drives the "pretty when TTY" default. */
  isTty?: boolean
}

const VALID_LEVELS = new Set<LogLevel>([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
])

function parseLevel(raw: string | undefined, where: string): LogLevel | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim().toLowerCase()
  if (!VALID_LEVELS.has(trimmed as LogLevel)) {
    throw new Error(
      `${where}: invalid log level "${raw}" — expected one of ${[...VALID_LEVELS].join(', ')}`,
    )
  }
  return trimmed as LogLevel
}

function parseCategories(raw: string | undefined): Record<string, LogLevel> | undefined {
  if (!raw) return undefined
  const out: Record<string, LogLevel> = {}
  for (const pair of raw.split(',')) {
    const trimmedPair = pair.trim()
    if (trimmedPair === '') continue
    const eq = trimmedPair.indexOf('=')
    if (eq < 0) {
      throw new Error(`XBUSX_LOG_CATEGORIES: expected "category=level" pairs, got "${pair}"`)
    }
    const cat = trimmedPair.slice(0, eq).trim()
    const lvl = parseLevel(
      trimmedPair.slice(eq + 1),
      `XBUSX_LOG_CATEGORIES (entry "${trimmedPair}")`,
    )
    if (cat && lvl) out[cat] = lvl
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function resolveLoggerConfig(inputs: ResolveLoggerInputs): Partial<LoggerConfig> {
  const { env, isTty } = inputs

  const envLevel = parseLevel(env.XBUSX_LOG_LEVEL, 'XBUSX_LOG_LEVEL')
  const envCategories = parseCategories(env.XBUSX_LOG_CATEGORIES)
  const envDestination = env.XBUSX_LOG_DESTINATION
  const envFormatRaw = env.XBUSX_LOG_FORMAT?.trim().toLowerCase()
  const envPretty = envFormatRaw === 'pretty' ? true : envFormatRaw === 'json' ? false : undefined
  if (envFormatRaw && envFormatRaw !== 'pretty' && envFormatRaw !== 'json') {
    throw new Error(`XBUSX_LOG_FORMAT: expected "pretty" or "json", got "${env.XBUSX_LOG_FORMAT}"`)
  }

  const sinkOpts: { pretty: boolean; destination?: string } = {
    pretty: envPretty ?? (envDestination ? false : (isTty ?? false)),
  }
  if (envDestination !== undefined) sinkOpts.destination = envDestination

  const cfg: Partial<LoggerConfig> = {
    level: envLevel ?? 'info',
    sink: pinoSink(sinkOpts),
  }
  if (envCategories !== undefined) cfg.categories = envCategories
  return cfg
}
