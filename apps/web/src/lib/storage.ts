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

export interface IbusxConfig {
  baudRate: number
  active: boolean
  protocol: Protocol
}

export const DEFAULT_CONFIG: IbusxConfig = {
  baudRate: 9600,
  active: false,
  protocol: 'ikbus',
}

export const CONFIG_KEY = 'ibusx.config'
