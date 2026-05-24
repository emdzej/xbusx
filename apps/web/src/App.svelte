<script lang="ts">
import { onMount } from 'svelte'
import CommandBar from './lib/components/CommandBar.svelte'
import ConnectScreen from './lib/components/ConnectScreen.svelte'
import DeviceList from './lib/components/DeviceList.svelte'
import EventLog from './lib/components/EventLog.svelte'
import SettingsDialog from './lib/components/SettingsDialog.svelte'
import StatePane from './lib/components/StatePane.svelte'
import Toolbar from './lib/components/Toolbar.svelte'
import { type Connection, connect } from './lib/connection.js'
import { LOG_CAPACITY, type LogEntry } from './lib/log.js'
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  type IbusxConfig,
  loadConfig,
  saveConfig,
} from './lib/storage.js'
import type { DisplayableDevice, DisplayableEntry } from './lib/types.js'

let config = $state<IbusxConfig>({ ...DEFAULT_CONFIG, ...loadConfig<IbusxConfig>(CONFIG_KEY) })
let connection = $state<Connection | undefined>(undefined)
let connectError = $state<string | undefined>(undefined)
let log = $state<LogEntry[]>([])
let stateTick = $state(0)
let selectedDeviceIndex = $state(0)
let showSettings = $state(false)

onMount(() => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator
  if (!supported) {
    connectError = 'Web Serial is unavailable.  Use Chrome, Edge, or Opera on HTTPS or localhost.'
  }
})

$effect(() => {
  saveConfig<IbusxConfig>(CONFIG_KEY, config)
})

async function handleConnect(port: SerialPort): Promise<void> {
  connectError = undefined
  try {
    connection = await connect({
      port,
      baudRate: config.baudRate,
      protocol: config.protocol,
      onLog: (entry) => {
        log = appendLog(log, entry)
      },
      onDeviceEvent: () => {
        stateTick++
      },
      onClose: () => {
        log = appendLog(log, {
          id: Date.now(),
          kind: 'system',
          ts: Date.now(),
          message: 'transport closed',
        })
        connection = undefined
      },
    })
    // I/K-bus uses Device.mode for its passive/active gate; D-bus has no
    // such mode (every request sends a frame), so the toggle is purely
    // informational for D-bus controls that declare `requires: 'active'`.
    if (connection.kind === 'ikbus' && config.active) {
      for (const d of connection.bus.devices) d.mode = 'active'
    }
    log = appendLog(log, {
      id: Date.now(),
      kind: 'system',
      ts: Date.now(),
      message: `connected to ${connection.portLabel} (${connection.kind})`,
    })
    selectedDeviceIndex = 0
  } catch (err) {
    connectError = err instanceof Error ? err.message : String(err)
  }
}

async function handleDisconnect(): Promise<void> {
  if (connection === undefined) return
  await connection.close()
  connection = undefined
}

function toggleActive(): void {
  config.active = !config.active
  if (connection === undefined) return
  if (connection.kind === 'ikbus') {
    for (const d of connection.bus.devices) d.mode = config.active ? 'active' : 'passive'
  }
}

async function invokeControl(
  device: DisplayableDevice,
  entry: DisplayableEntry,
  controlName: string,
  args: Record<string, unknown>,
): Promise<void> {
  const descriptor = entry.controls[controlName]
  if (descriptor === undefined) return
  if (descriptor.requires === 'active' && !config.active) {
    log = appendLog(log, {
      id: Date.now(),
      kind: 'error',
      ts: Date.now(),
      message: `${entry.name}.${controlName} needs active mode — toggle the ACTIVE switch`,
    })
    return
  }
  try {
    // biome-ignore lint/suspicious/noExplicitAny: param type erased at this generic call site
    await descriptor.invoke(device as any, args as any)
    log = appendLog(log, {
      id: Date.now(),
      kind: 'system',
      ts: Date.now(),
      message: `invoked ${entry.name}.${controlName}`,
    })
  } catch (err) {
    log = appendLog(log, {
      id: Date.now(),
      kind: 'error',
      ts: Date.now(),
      message: `${entry.name}.${controlName}: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

function appendLog(arr: LogEntry[], entry: LogEntry): LogEntry[] {
  const next = arr.length >= LOG_CAPACITY ? arr.slice(-LOG_CAPACITY + 1) : arr.slice()
  next.push(entry)
  return next
}

let currentEntry = $derived<DisplayableEntry | undefined>(
  connection !== undefined ? connection.entries[selectedDeviceIndex] : undefined,
)
let currentDevice = $derived<DisplayableDevice | undefined>(
  connection !== undefined ? connection.devices[selectedDeviceIndex] : undefined,
)
</script>

<header>
  <div class="title-group">
    <h1>XBUS<span class="accent">X</span></h1>
    <!-- Build version surfaced from package.json via Vite `define`.
         Linked to the matching git tag so users can pop the changelog
         in one click. Faint styling keeps it as metadata, not chrome. -->
    <a
      class="version"
      href="https://github.com/emdzej/xbusx/releases/tag/{__APP_VERSION__}"
      target="_blank"
      rel="noopener noreferrer"
      title="Release notes on GitHub"
    >
      {__APP_VERSION__}
    </a>
    <!-- GitHub repo link. The 16x16 mark is GitHub's official
         public-domain octocat SVG (https://github.com/logos); we
         inline rather than reference an asset so the icon picks up
         the theme colour (`currentColor`) and renders before any
         network fetch. -->
    <a
      class="repo-link"
      href="https://github.com/emdzej/xbusx"
      target="_blank"
      rel="noopener noreferrer"
      title="xbusx on GitHub"
      aria-label="xbusx on GitHub"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        />
      </svg>
    </a>
  </div>
  <Toolbar
    connected={connection !== undefined}
    active={config.active}
    portLabel={connection !== undefined
      ? `${connection.portLabel} (${connection.kind})`
      : '—'}
    onToggleActive={toggleActive}
    onDisconnect={handleDisconnect}
    onOpenSettings={() => (showSettings = true)}
  />
</header>

<SettingsDialog open={showSettings} onClose={() => (showSettings = false)} />

{#if connection === undefined}
  <ConnectScreen
    bind:baudRate={config.baudRate}
    bind:protocol={config.protocol}
    error={connectError}
    onConnect={handleConnect}
  />
{:else}
  <main>
    <aside>
      <DeviceList
        entries={connection.entries}
        devices={connection.devices}
        selectedIndex={selectedDeviceIndex}
        onSelect={(i) => (selectedDeviceIndex = i)}
      />
    </aside>
    <section>
      {#if currentDevice && currentEntry}
        <StatePane
          device={currentDevice}
          entry={currentEntry}
          active={config.active}
          {stateTick}
          onInvoke={(name, args) =>
            currentDevice && currentEntry && invokeControl(currentDevice, currentEntry, name, args)}
        />
      {/if}
    </section>
    <footer>
      {#if connection.kind === 'ikbus'}
        <CommandBar
          bus={connection.bus}
          onError={(message) => {
            log = appendLog(log, {
              id: Date.now(),
              kind: 'error',
              ts: Date.now(),
              message,
            })
          }}
        />
      {/if}
      <EventLog entries={log} />
    </footer>
  </main>
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elev);
  }

  /* Left side of the header — title sits next to the version pill
   * and the GitHub icon as a tight group. Toolbar stays right-aligned
   * via header's `justify-content: space-between`. */
  .title-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    margin: 0;
    font-size: 16px;
    color: var(--fg);
    letter-spacing: 0.5px;
    font-weight: 700;
  }

  h1 .accent {
    color: var(--accent);
  }

  .version {
    font-size: 11px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color: var(--fg-muted);
    text-decoration: none;
    letter-spacing: 0.3px;
    transition: color 0.15s ease;
  }
  .version:hover {
    color: var(--fg);
  }

  .repo-link {
    display: inline-flex;
    align-items: center;
    color: var(--fg-muted);
    transition: color 0.15s ease;
  }
  .repo-link:hover {
    color: var(--fg);
  }

  main {
    flex: 1;
    display: grid;
    grid-template-columns: 220px 1fr;
    grid-template-rows: 1fr 260px;
    grid-template-areas:
      'aside section'
      'footer footer';
    min-height: 0;
  }

  aside {
    grid-area: aside;
    border-right: 1px solid var(--border);
    overflow-y: auto;
    background: var(--bg-elev);
  }

  section {
    grid-area: section;
    overflow-y: auto;
    padding: 12px 16px;
  }

  footer {
    grid-area: footer;
    border-top: 1px solid var(--border);
    background: var(--bg-elev);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  footer :global(.log) {
    flex: 1;
  }
</style>
