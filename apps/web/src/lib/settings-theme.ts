/**
 * Theme application — reads the persisted `IbusxConfig.theme` and
 * either pins `<html data-theme>` to the user's choice, or tracks
 * the OS's `prefers-color-scheme` when the user picked "system".
 *
 * Called once from `main.ts` BEFORE the Svelte mount so the first
 * paint already matches the saved theme (no light-then-dark flash).
 * A second `watchSystemTheme()` call installs an OS-preference
 * watcher for the page lifetime — it only does anything when the
 * user has chosen "system".
 *
 * Mirrors the inpax-web pattern (apps/web/src/lib/settings.svelte.ts).
 */

import {
  CONFIG_KEY,
  type IbusxConfig,
  loadConfig,
  saveConfig,
  type ThemeChoice,
} from './storage.js'

function readTheme(): ThemeChoice {
  return loadConfig<IbusxConfig>(CONFIG_KEY)?.theme ?? 'system'
}

/**
 * Set the `data-theme` attribute on `<html>` so the CSS variables
 * defined for `[data-theme='light']` in `app.css` kick in. "dark" is
 * the absence of the attribute (the `:root` defaults).
 */
function paintTheme(choice: ThemeChoice): void {
  const html = document.documentElement
  if (choice === 'light') {
    html.setAttribute('data-theme', 'light')
  } else if (choice === 'dark') {
    html.setAttribute('data-theme', 'dark')
  } else {
    // "system" — drop the override and let the OS preference rule.
    const prefersLight =
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    if (prefersLight) {
      html.setAttribute('data-theme', 'light')
    } else {
      html.removeAttribute('data-theme')
    }
  }
}

/** Apply whatever theme is currently persisted. Idempotent. */
export function applyTheme(): void {
  paintTheme(readTheme())
}

/**
 * Subscribe to OS theme changes once. Only re-paints when the user's
 * current choice is "system" — otherwise the OS pref is irrelevant.
 * Safe to call multiple times; subsequent calls no-op.
 */
let watcherInstalled = false
export function watchSystemTheme(): void {
  if (watcherInstalled) return
  if (typeof window === 'undefined') return
  watcherInstalled = true
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  mq.addEventListener('change', () => {
    if (readTheme() === 'system') paintTheme('system')
  })
}

/**
 * Persist + apply a new theme choice. The dialog calls this from its
 * onclick handlers — the inline write through `localStorage` keeps a
 * single source of truth (no separate Svelte $state for theme), and
 * `paintTheme` re-runs immediately so the UI flips on click.
 */
export function setTheme(choice: ThemeChoice): void {
  const current = loadConfig<IbusxConfig>(CONFIG_KEY)
  saveConfig<IbusxConfig>(CONFIG_KEY, {
    ...(current ?? {}),
    // Need this cast because loadConfig might have returned undefined
    // — the spread above + DEFAULTS in storage.ts cover the remaining
    // fields when the caller saves through saveConfig.
    baudRate: current?.baudRate ?? 9600,
    active: current?.active ?? false,
    protocol: current?.protocol ?? 'ikbus',
    theme: choice,
  })
  paintTheme(choice)
}
