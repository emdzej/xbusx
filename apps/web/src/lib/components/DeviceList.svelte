<script lang="ts">
import type { Device } from '@emdzej/ibusx-core'
import type { DeviceEntry } from '../registry.js'

interface Props {
  entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  devices: readonly Device<any, any>[]
  selectedIndex: number
  onSelect: (index: number) => void
}

let { entries, devices, selectedIndex, onSelect }: Props = $props()
</script>

<ul>
  {#each entries as entry, i (entry.name)}
    <li>
      <button
        class:selected={i === selectedIndex}
        class:stub={!entry.implemented}
        onclick={() => onSelect(i)}
        title={entry.implemented ? entry.name : `${entry.name} (stub — no decoded state)`}
      >
        <span class="name">{entry.name}</span>
        <span class="addr">0x{devices[i]?.address.toString(16).padStart(2, '0').toUpperCase()}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 8px 0;
  }

  li {
    display: block;
  }

  button {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    border-left: 3px solid transparent;
    border-radius: 0;
    padding: 6px 12px;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  button:hover {
    background: var(--bg-elev-2);
  }

  button.selected {
    background: var(--bg-elev-2);
    border-left-color: var(--accent);
    color: var(--accent);
  }

  .name {
    font-weight: 600;
  }

  .addr {
    color: var(--fg-muted);
    font-size: 11px;
  }

  button.selected .addr {
    color: var(--accent);
  }

  button.stub .name {
    color: var(--fg-muted);
    font-weight: 400;
  }

  button.stub.selected .name {
    color: var(--accent);
  }
</style>
