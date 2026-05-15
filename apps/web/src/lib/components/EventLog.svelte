<script lang="ts">
import type { LogEntry } from '../log.js'

interface Props {
  entries: readonly LogEntry[]
}

let { entries }: Props = $props()

function formatTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number, w = 2): string => n.toString().padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

function formatCmd(n: number): string {
  return `0x${n.toString(16).padStart(2, '0').toUpperCase()}`
}

function formatPayload(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

// Auto-scroll to bottom when new entries arrive.
let viewport: HTMLDivElement | undefined = $state(undefined)
$effect(() => {
  void entries.length
  if (viewport !== undefined) {
    viewport.scrollTop = viewport.scrollHeight
  }
})
</script>

<div class="log" bind:this={viewport}>
  {#if entries.length === 0}
    <div class="muted">(waiting for frames…)</div>
  {/if}
  {#each entries as entry (entry.id)}
    <div class="row" data-kind={entry.kind}>
      <span class="ts">{formatTs(entry.ts)}</span>
      {#if entry.kind === 'frame'}
        <span class="src">{entry.source}</span>
        <span class="arrow">→</span>
        <span class="dst">{entry.dest}</span>
        <span class="cmd">{formatCmd(entry.cmd)}</span>
        <span class="muted">({entry.len}B)</span>
      {:else if entry.kind === 'event'}
        <span class="dev">{entry.device}</span>
        <span class="evt">{entry.event}</span>
        <span class="muted">{formatPayload(entry.payload)}</span>
      {:else if entry.kind === 'error'}
        <span class="err">err</span>
        <span>{entry.message}</span>
      {:else}
        <span class="sys">sys</span>
        <span>{entry.message}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .log {
    height: 100%;
    overflow-y: auto;
    padding: 8px 12px;
    font-size: 11.5px;
    line-height: 1.5;
  }

  .muted {
    color: var(--fg-muted);
  }

  .row {
    display: flex;
    gap: 6px;
    align-items: baseline;
    white-space: nowrap;
  }

  .ts {
    color: var(--fg-muted);
  }

  .src,
  .dst {
    color: var(--accent);
    min-width: 5ch;
    display: inline-block;
  }

  .cmd {
    color: var(--yellow);
  }

  .dev {
    color: var(--magenta);
    min-width: 5ch;
    display: inline-block;
  }

  .evt {
    color: var(--green);
  }

  .err {
    color: var(--red);
  }

  .sys {
    color: var(--accent);
  }

  .arrow {
    color: var(--fg-muted);
  }
</style>
