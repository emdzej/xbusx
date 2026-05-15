<script lang="ts">
import type { ControlParam, Device } from '@emdzej/ibusx-core'
import type { DeviceEntry } from '../registry.js'

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  device: Device<any, any>
  entry: DeviceEntry
  active: boolean
  onInvoke: (controlName: string, args: Record<string, unknown>) => void | Promise<void>
}

let { device, entry, active, onInvoke }: Props = $props()

let argValues = $state<Record<string, Record<string, string>>>({})

function formatValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

function coerce(param: ControlParam, raw: string): unknown {
  switch (param.kind) {
    case 'enum':
      return raw
    case 'number':
      return Number(raw)
    case 'string':
      return raw
    case 'boolean':
      return raw === 'true'
  }
}

function defaultRawFor(param: ControlParam): string {
  if (param.kind === 'enum') return String(param.default ?? param.values[0] ?? '')
  if (param.kind === 'number') return String(param.default ?? 0)
  if (param.kind === 'string') return String(param.default ?? '')
  return param.default === true ? 'true' : 'false'
}

async function handleInvoke(controlName: string): Promise<void> {
  const descriptor = entry.controls[controlName]
  if (descriptor === undefined) return
  const raws = argValues[controlName] ?? {}
  const args: Record<string, unknown> = {}
  for (const [paramName, param] of Object.entries(descriptor.params)) {
    const raw = raws[paramName] ?? defaultRawFor(param as ControlParam)
    args[paramName] = coerce(param as ControlParam, raw)
  }
  await onInvoke(controlName, args)
}

function setArg(controlName: string, paramName: string, value: string): void {
  argValues = {
    ...argValues,
    [controlName]: { ...(argValues[controlName] ?? {}), [paramName]: value },
  }
}

let stateEntries = $derived(Object.entries(device.state as Record<string, unknown>))
let controlEntries = $derived(Object.entries(entry.controls))
</script>

<div class="header">
  <h2>{entry.name} <span class="addr">0x{device.address.toString(16).padStart(2, '0').toUpperCase()}</span></h2>
</div>

<section class="state">
  <h3>State</h3>
  {#if stateEntries.length === 0}
    <p class="muted">(no state)</p>
  {:else}
    <dl>
      {#each stateEntries as [key, value] (key)}
        <dt>{key}</dt>
        <dd>{formatValue(value)}</dd>
      {/each}
    </dl>
  {/if}
</section>

<section class="controls">
  <h3>Controls</h3>
  {#if controlEntries.length === 0}
    <p class="muted">(none)</p>
  {/if}
  {#each controlEntries as [name, descriptor] (name)}
    <article class="control">
      <div class="control-head">
        <strong>{descriptor.label}</strong>
        {#if descriptor.requires === 'active'}
          <span class="badge" class:dim={!active}>active</span>
        {/if}
      </div>
      {#if descriptor.description}
        <p class="muted small">{descriptor.description}</p>
      {/if}
      {#each Object.entries(descriptor.params) as [paramName, param] (paramName)}
        <label>
          <span>{paramName}</span>
          {#if (param as ControlParam).kind === 'enum'}
            <select
              value={argValues[name]?.[paramName] ?? defaultRawFor(param as ControlParam)}
              onchange={(e) => setArg(name, paramName, (e.currentTarget as HTMLSelectElement).value)}
            >
              {#each ((param as ControlParam).kind === 'enum' ? (param as { values: readonly string[] }).values : []) as v (v)}
                <option value={v}>{v}</option>
              {/each}
            </select>
          {:else if (param as ControlParam).kind === 'number'}
            <input
              type="number"
              value={argValues[name]?.[paramName] ?? defaultRawFor(param as ControlParam)}
              oninput={(e) => setArg(name, paramName, (e.currentTarget as HTMLInputElement).value)}
            />
          {:else if (param as ControlParam).kind === 'boolean'}
            <select
              value={argValues[name]?.[paramName] ?? defaultRawFor(param as ControlParam)}
              onchange={(e) => setArg(name, paramName, (e.currentTarget as HTMLSelectElement).value)}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          {:else}
            <input
              type="text"
              value={argValues[name]?.[paramName] ?? defaultRawFor(param as ControlParam)}
              oninput={(e) => setArg(name, paramName, (e.currentTarget as HTMLInputElement).value)}
            />
          {/if}
        </label>
      {/each}
      <button
        class="primary"
        disabled={descriptor.requires === 'active' && !active}
        onclick={() => handleInvoke(name)}
      >
        Invoke
      </button>
    </article>
  {/each}
</section>

<style>
  .header h2 {
    margin: 0 0 12px;
    font-size: 18px;
    color: var(--accent);
  }

  .addr {
    color: var(--fg-muted);
    font-size: 12px;
    margin-left: 8px;
    font-weight: 400;
  }

  h3 {
    margin: 16px 0 8px;
    color: var(--fg-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 4px 16px;
  }

  dt {
    color: var(--fg-muted);
    font-size: 12px;
  }

  dd {
    margin: 0;
    color: var(--fg);
    font-size: 12px;
    word-break: break-word;
  }

  .muted {
    color: var(--fg-muted);
    margin: 0;
  }

  .small {
    font-size: 11px;
  }

  .control {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .badge {
    font-size: 10px;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--yellow);
    color: var(--bg);
    font-weight: 600;
  }

  .badge.dim {
    opacity: 0.4;
  }

  label {
    display: grid;
    grid-template-columns: 120px 1fr;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--fg-muted);
  }

  input,
  select {
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 6px;
    font: inherit;
  }
</style>
