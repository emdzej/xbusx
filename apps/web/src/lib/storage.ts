/**
 * Tiny typed wrapper around localStorage.  Values are JSON-encoded; reads
 * return `undefined` on any parse error or missing key.
 */
export function loadConfig<T>(key: string): T | undefined {
  if (typeof localStorage === 'undefined') return undefined
  const raw = localStorage.getItem(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

export function saveConfig<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled — silently drop.
  }
}

/** Which protocol shell to bring up after `Connect`. */
export type Protocol = 'ikbus' | 'dbus'

/**
 * One of the bimmerz-logger levels. Inlined here (rather than
 * imported from `@emdzej/bimmerz-logger`) so this file stays a pure
 * config-shape definition with no library dependency — the wiring
 * layer in `logger-wiring.ts` is what actually pulls in
 * bimmerz-logger.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'

/**
 * Persisted logger config. Mirrors `@emdzej/bimmerz-logger`'s
 * `LoggerConfig` minus the sink (the web app always uses the console
 * sink — no Node-side pino transports available in the browser).
 *
 * Keys (category names) are dot-separated paths from
 * `@emdzej/ibusx-core`'s `LOG_CATEGORIES` export.
 */
export interface WebLoggerConfig {
  level?: LogLevel
  categories?: Record<string, LogLevel>
}

/**
 * UI theme. "system" tracks `prefers-color-scheme` and updates when
 * the OS toggles light/dark; "light" / "dark" pin the theme
 * regardless of OS preference. Applied by `settings-theme.ts`.
 */
export type ThemeChoice = 'light' | 'dark' | 'system'

export interface IbusxConfig {
  baudRate: number
  active: boolean
  protocol: Protocol
  /** Light / dark / system. Applied by `settings-theme.ts`. */
  theme?: ThemeChoice
  /** Bimmerz-logger central config — applied at boot via `applyLoggerConfig()`. */
  logging?: WebLoggerConfig
}

export const DEFAULT_CONFIG: IbusxConfig = {
  baudRate: 9600,
  active: false,
  protocol: 'ikbus',
  theme: 'system',
  logging: { level: 'info' },
}

export const CONFIG_KEY = 'ibusx.config'
