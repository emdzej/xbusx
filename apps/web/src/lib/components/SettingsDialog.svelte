<script lang="ts">
  /**
   * Modal settings dialog with two tabs:
   *
   *  - **Theme** — light / dark / system picker. Wired through
   *    `setTheme()` so the change paints + persists immediately.
   *  - **Developer** — bimmerz-logger central config. Default-level
   *    dropdown plus per-category override picker; the catalogue
   *    comes from `@emdzej/ibusx-core`'s `LOG_CATEGORIES` export,
   *    so adding a new category there automatically shows up here
   *    on the next install.
   *
   * Outer container is a flex column with `max-height: 90vh` so the
   * content area (`tab-body`) can scroll independently of header /
   * tab strip / footer. Closing via Escape, backdrop, or the close
   * button.
   */
  import { LOG_CATEGORIES } from '@emdzej/ibusx-core'
  import { configureLogger, type LogLevel } from '@emdzej/bimmerz-logger'
  import {
    CONFIG_KEY,
    type IbusxConfig,
    type ThemeChoice,
    type WebLoggerConfig,
    loadConfig,
    saveConfig,
  } from '../storage.js'
  import { setTheme } from '../settings-theme.js'

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  const LOG_LEVELS: readonly LogLevel[] = [
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
    'silent',
  ]

  type Tab = 'theme' | 'developer'
  let activeTab = $state<Tab>('theme')

  /**
   * Local mirror of the persisted theme + logging — read on every
   * `open` flip so the dialog always reflects what's on disk (not a
   * stale snapshot from when the component first mounted).
   */
  let theme = $state<ThemeChoice>('system')
  let logging = $state<WebLoggerConfig>({ level: 'info' })

  $effect(() => {
    if (!open) return
    const cfg = loadConfig<IbusxConfig>(CONFIG_KEY)
    theme = cfg?.theme ?? 'system'
    const next: WebLoggerConfig = { level: cfg?.logging?.level ?? 'info' }
    if (cfg?.logging?.categories) next.categories = cfg.logging.categories
    logging = next
  })

  function persistLogging(next: WebLoggerConfig): void {
    const cfg = loadConfig<IbusxConfig>(CONFIG_KEY)
    saveConfig<IbusxConfig>(CONFIG_KEY, {
      baudRate: cfg?.baudRate ?? 9600,
      active: cfg?.active ?? false,
      protocol: cfg?.protocol ?? 'ikbus',
      theme: cfg?.theme ?? theme,
      logging: next,
    })
    configureLogger({
      level: next.level ?? 'info',
      categories: next.categories ?? {},
    })
  }

  function pickTheme(choice: ThemeChoice): void {
    theme = choice
    setTheme(choice)
  }

  function setLevel(value: LogLevel): void {
    const next: WebLoggerConfig = { ...logging, level: value }
    logging = next
    persistLogging(next)
  }

  function setCategory(name: string, value: LogLevel | ''): void {
    const nextCategories = { ...(logging.categories ?? {}) }
    if (value === '') {
      delete nextCategories[name]
    } else {
      nextCategories[name] = value
    }
    const next: WebLoggerConfig = { level: logging.level ?? 'info' }
    if (Object.keys(nextCategories).length > 0) next.categories = nextCategories
    logging = next
    persistLogging(next)
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onClose()
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={onClose}
    onkeydown={onKeydown}
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="modal"
      role="document"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <header>
        <h2>Settings</h2>
        <button class="close" onclick={onClose} type="button">close</button>
      </header>

      <div class="tabstrip" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'theme'}
          class="tab"
          class:active={activeTab === 'theme'}
          onclick={() => (activeTab = 'theme')}
        >
          Theme
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'developer'}
          class="tab"
          class:active={activeTab === 'developer'}
          onclick={() => (activeTab = 'developer')}
        >
          Developer
        </button>
      </div>

      <div class="tab-body">
        {#if activeTab === 'theme'}
          <fieldset>
            <legend>Theme</legend>
            <p class="hint">
              "System" follows your OS preference and updates when you
              toggle light/dark there. Pick one to override.
            </p>
            <div class="theme-row">
              {#each ['light', 'dark', 'system'] as const as choice (choice)}
                <button
                  type="button"
                  class:active={theme === choice}
                  onclick={() => pickTheme(choice)}
                >
                  {choice}
                </button>
              {/each}
            </div>
          </fieldset>
        {:else if activeTab === 'developer'}
          <fieldset>
            <legend>Logging</legend>
            <label class="field">
              <span>Default level</span>
              <select
                value={logging.level ?? 'info'}
                onchange={(e) =>
                  setLevel((e.currentTarget as HTMLSelectElement).value as LogLevel)}
              >
                {#each LOG_LEVELS as lvl (lvl)}
                  <option value={lvl}>{lvl}</option>
                {/each}
              </select>
              <small>Applies to every category without a specific rule below.</small>
            </label>

            <h4>Category overrides</h4>
            <p class="hint">
              Hierarchical — a rule for <code>XBUSX</code> covers every
              <code>XBUSX.*</code> child unless something more
              specific matches.
            </p>
            <ul class="categories">
              {#each LOG_CATEGORIES as cat (cat.name)}
                {@const current = logging.categories?.[cat.name] ?? ''}
                <li>
                  <div class="cat-info">
                    <code>{cat.name}</code>
                    {#if cat.hint}<p>{cat.hint}</p>{/if}
                  </div>
                  <select
                    value={current}
                    onchange={(e) =>
                      setCategory(
                        cat.name,
                        (e.currentTarget as HTMLSelectElement).value as LogLevel | '',
                      )}
                  >
                    <option value="">(inherit)</option>
                    {#each LOG_LEVELS as lvl (lvl)}
                      <option value={lvl}>{lvl}</option>
                    {/each}
                  </select>
                </li>
              {/each}
            </ul>
          </fieldset>
        {/if}
      </div>

      <footer>
        <button type="button" class="primary" onclick={onClose}>Done</button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
  }

  .modal {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  header {
    flex: 0 0 auto;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  h2 {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .close {
    font-size: 12px;
    color: var(--fg-muted);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .close:hover {
    color: var(--fg);
    text-decoration: underline;
  }

  .tabstrip {
    flex: 0 0 auto;
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    padding: 0 8px;
  }

  .tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg-muted);
    cursor: pointer;
    border-radius: 0;
  }
  .tab:hover:not(.active) {
    color: var(--fg);
    background: transparent;
  }
  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 16px;
  }

  fieldset {
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px;
    margin: 0;
  }

  legend {
    padding: 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .hint {
    margin: 0 0 8px;
    font-size: 11px;
    color: var(--fg-muted);
  }

  h4 {
    margin: 12px 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--fg-muted);
  }

  .theme-row {
    display: flex;
    gap: 8px;
  }
  .theme-row button {
    flex: 1;
    text-transform: capitalize;
  }
  .theme-row button.active {
    background: var(--accent-strong);
    border-color: var(--accent-strong);
    color: var(--bg);
    font-weight: 600;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    color: var(--fg-muted);
  }
  .field span {
    font-size: 11px;
    color: var(--fg-muted);
  }
  .field small {
    font-size: 11px;
    color: var(--fg-muted);
  }
  .field select,
  .categories select {
    background: var(--bg-elev-2);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 4px 6px;
    font: inherit;
  }

  .categories {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .categories li {
    display: grid;
    grid-template-columns: 1fr 7rem;
    gap: 8px;
    align-items: baseline;
  }

  .cat-info code {
    font-size: 11px;
    color: var(--fg);
  }
  .cat-info p {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--fg-muted);
  }

  footer {
    flex: 0 0 auto;
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg-elev-2);
  }
</style>
