<script lang="ts">
import type { IBus } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type DeviceAddress } from '@emdzej/ibusx-protocol'
import { parseHex } from '../hex.js'

interface Props {
  bus: IBus
  /** Surface errors back to App.svelte's log. */
  onError: (message: string) => void
}

let { bus, onError }: Props = $props()

type Mode = 'raw' | 'build'
let mode = $state<Mode>('raw')

// Raw mode: a single hex string interpreted as SRC + DST + payload (>=1 byte).
let rawInput = $state('')

// Build mode.
let buildSource = $state<number>(DEVICE_ADDRESSES.DIA)
let buildDest = $state<number>(DEVICE_ADDRESSES.GLO)
let buildPayload = $state('')

const ADDRESS_OPTIONS = Object.entries(DEVICE_ADDRESSES)
  .map(([name, addr]) => ({ name, addr: addr as number }))
  .sort((a, b) => a.addr - b.addr)

async function sendRaw(): Promise<void> {
  const parsed = parseHex(rawInput)
  if (!parsed.ok) {
    onError(`raw: ${parsed.error}`)
    return
  }
  if (parsed.bytes.length < 3) {
    onError('raw: need at least SRC DST PAYLOAD (≥3 bytes)')
    return
  }
  const source = parsed.bytes[0] as DeviceAddress
  const destination = parsed.bytes[1] as DeviceAddress
  const payload = parsed.bytes.slice(2)
  try {
    await bus.send({ source, destination, payload, checksum: 0 })
    rawInput = ''
  } catch (err) {
    onError(`raw: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function sendBuild(): Promise<void> {
  const parsed = parseHex(buildPayload)
  if (!parsed.ok) {
    onError(`build: ${parsed.error}`)
    return
  }
  if (parsed.bytes.length === 0) {
    onError('build: payload must contain at least one byte (the command)')
    return
  }
  try {
    await bus.send({
      source: buildSource,
      destination: buildDest,
      payload: parsed.bytes,
      checksum: 0,
    })
    buildPayload = ''
  } catch (err) {
    onError(`build: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function onRawKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    void sendRaw()
  }
}

function onBuildKey(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    void sendBuild()
  }
}

function hex(n: number): string {
  return `0x${n.toString(16).padStart(2, '0').toUpperCase()}`
}
</script>

<div class="bar">
  <div class="tabs">
    <button
      class:on={mode === 'raw'}
      onclick={() => (mode = 'raw')}
      title="Type the full frame as hex (SRC DST PAYLOAD…)"
    >
      raw
    </button>
    <button
      class:on={mode === 'build'}
      onclick={() => (mode = 'build')}
      title="Pick addresses + payload"
    >
      build
    </button>
  </div>

  {#if mode === 'raw'}
    <div class="row">
      <span class="hint">SRC DST PAYLOAD…</span>
      <input
        type="text"
        placeholder="80 FF 02 00"
        bind:value={rawInput}
        onkeydown={onRawKey}
        spellcheck="false"
        autocomplete="off"
      />
      <button class="primary" onclick={sendRaw}>send</button>
    </div>
    <p class="muted small">length byte + XOR computed automatically.  Whitespace or commas between bytes.</p>
  {:else}
    <div class="row build">
      <label>
        <span>src</span>
        <select bind:value={buildSource}>
          {#each ADDRESS_OPTIONS as opt (opt.addr)}
            <option value={opt.addr}>{opt.name} ({hex(opt.addr)})</option>
          {/each}
        </select>
      </label>
      <label>
        <span>dst</span>
        <select bind:value={buildDest}>
          {#each ADDRESS_OPTIONS as opt (opt.addr)}
            <option value={opt.addr}>{opt.name} ({hex(opt.addr)})</option>
          {/each}
        </select>
      </label>
      <label class="grow">
        <span>payload</span>
        <input
          type="text"
          placeholder="01"
          bind:value={buildPayload}
          onkeydown={onBuildKey}
          spellcheck="false"
          autocomplete="off"
        />
      </label>
      <button class="primary" onclick={sendBuild}>send</button>
    </div>
    <p class="muted small">first payload byte is the command ID; length + XOR computed.</p>
  {/if}
</div>

<style>
  .bar {
    border-bottom: 1px solid var(--border);
    background: var(--bg-elev);
    padding: 6px 12px 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }

  .tabs button {
    background: transparent;
    border: 1px solid transparent;
    padding: 2px 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-muted);
    cursor: pointer;
    border-radius: 3px;
  }

  .tabs button:hover {
    color: var(--fg);
  }

  .tabs button.on {
    background: var(--bg-elev-2);
    border-color: var(--border);
    color: var(--accent);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .row.build {
    flex-wrap: wrap;
  }

  .row input[type='text'] {
    flex: 1;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 8px;
    font: inherit;
    min-width: 0;
  }

  .row select {
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 3px 4px;
    font: inherit;
  }

  label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--fg-muted);
  }

  label.grow {
    flex: 1;
    min-width: 200px;
  }

  label.grow input {
    width: 100%;
  }

  .hint {
    color: var(--fg-muted);
    font-size: 11px;
    white-space: nowrap;
  }

  .muted {
    color: var(--fg-muted);
    margin: 0;
  }

  .small {
    font-size: 10.5px;
  }
</style>
