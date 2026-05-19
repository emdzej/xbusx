<script lang="ts">
import type { Device } from '@emdzej/ibusx-core'
import { onMount } from 'svelte'
import CommandBar from './lib/components/CommandBar.svelte'
import ConnectScreen from './lib/components/ConnectScreen.svelte'
import DeviceList from './lib/components/DeviceList.svelte'
import EventLog from './lib/components/EventLog.svelte'
import StatePane from './lib/components/StatePane.svelte'
import Toolbar from './lib/components/Toolbar.svelte'
import { type Connection, connect } from './lib/connection.js'
import { LOG_CAPACITY, type LogEntry } from './lib/log.js'
import type { DeviceEntry } from './lib/registry.js'
import {
  CONFIG_KEY,
  DEFAULT_CONFIG,
  type IbusxConfig,
  loadConfig,
  saveConfig,
} from './lib/storage.js'

let config = $state<IbusxConfig>({ ...DEFAULT_CONFIG, ...loadConfig<IbusxConfig>(CONFIG_KEY) })
let connection = $state<Connection | undefined>(undefined)
let connectError = $state<string | undefined>(undefined)
let log = $state<LogEntry[]>([])
let stateTick = $state(0)
let selectedDeviceIndex = $state(0)

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
    if (config.active && connection !== undefined) {
      for (const d of connection.devices) d.mode = 'active'
    }
    log = appendLog(log, {
      id: Date.now(),
      kind: 'system',
      ts: Date.now(),
      message: `connected to ${connection.portLabel}`,
    })
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
  for (const d of connection.devices) d.mode = config.active ? 'active' : 'passive'
}

async function invokeControl(
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  device: Device<any, any>,
  entry: DeviceEntry,
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
    await descriptor.invoke(device, args as any)
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

// stateTick is passed down into StatePane (as a prop) so its `$derived`
// re-evaluates whenever a device fires an event — Svelte 5 can't see
// the plain class-field writes inside Device subclasses.

let currentEntry = $derived(
  connection !== undefined ? connection.entries[selectedDeviceIndex] : undefined,
)
let currentDevice = $derived(
  connection !== undefined ? connection.devices[selectedDeviceIndex] : undefined,
)
</script>

<header>
  <h1>ibusx</h1>
  <Toolbar
    connected={connection !== undefined}
    active={config.active}
    portLabel={connection?.portLabel ?? '—'}
    onToggleActive={toggleActive}
    onDisconnect={handleDisconnect}
  />
</header>

{#if connection === undefined}
  <ConnectScreen bind:baudRate={config.baudRate} error={connectError} onConnect={handleConnect} />
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

  h1 {
    margin: 0;
    font-size: 16px;
    color: var(--accent);
    letter-spacing: 0.5px;
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
