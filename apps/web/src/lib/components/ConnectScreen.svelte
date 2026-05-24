<script lang="ts">
import type { Protocol } from '../storage.js'

interface Props {
  baudRate: number
  protocol: Protocol
  error: string | undefined
  onConnect: (port: SerialPort) => void | Promise<void>
}

let { baudRate = $bindable(), protocol = $bindable(), error, onConnect }: Props = $props()
let busy = $state(false)

async function pick(): Promise<void> {
  if (!('serial' in navigator)) return
  busy = true
  try {
    const port = await navigator.serial.requestPort()
    await onConnect(port)
  } catch (err) {
    if (err instanceof Error && err.name !== 'NotFoundError') {
      throw err
    }
  } finally {
    busy = false
  }
}
</script>

<div class="screen">
  <div class="card">
    <h2>Connect</h2>
    <p class="muted">
      The browser will prompt you to pick a serial port. Both buses share the same 9600 8E1
      wire; pick which protocol the adapter is currently tapping.
    </p>

    <fieldset class="protocol">
      <legend>Protocol</legend>
      <label>
        <input type="radio" bind:group={protocol} value="ikbus" />
        <span class="proto-name">I/K-bus</span>
        <span class="proto-hint">single-wire body/comfort bus — passive broadcast observation</span>
        <span class="proto-hw">
          needs a serial interface with a <strong>TH3122</strong> transceiver IC (or equivalent)
        </span>
      </label>
      <label>
        <input type="radio" bind:group={protocol} value="dbus" />
        <span class="proto-name">D-bus (DS2)</span>
        <span class="proto-hint">OBD-II diagnostic — request/response, engine + drivetrain ECUs</span>
        <span class="proto-hw">
          needs an <strong>INPA K+DCAN</strong> serial interface
        </span>
      </label>
    </fieldset>

    <label class="baud">
      Baud rate
      <input type="number" bind:value={baudRate} min="300" max="115200" step="100" />
    </label>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <button class="primary" disabled={busy} onclick={pick}>
      {busy ? 'Connecting…' : 'Choose serial port'}
    </button>

    <p class="muted small">
      Chrome / Edge / Opera on HTTPS or <code>localhost</code> only. Settings persist via
      <code>localStorage</code>.
    </p>
  </div>
</div>

<style>
  .screen {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .card {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px;
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h2 {
    margin: 0;
    color: var(--fg);
    font-size: 16px;
  }

  .protocol {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px 12px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .protocol legend {
    color: var(--fg-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0 4px;
  }

  /* Three rows per radio:
   *   row 1: radio | name | hint (single short tagline)
   *   row 2: empty | empty | hardware note (smaller, distinct)
   * `grid-column: 3` on the hardware span pushes it under the hint
   * column so it aligns with the rest of the text rather than the
   * radio button. */
  .protocol label {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: baseline;
    gap: 4px 8px;
    padding: 4px 0;
    font-size: 12px;
    color: var(--fg);
    cursor: pointer;
  }

  .proto-name {
    color: var(--accent);
    font-weight: 600;
  }

  .proto-hint {
    color: var(--fg-muted);
    font-size: 11px;
  }

  .proto-hw {
    grid-column: 3;
    color: var(--fg-muted);
    font-size: 11px;
    opacity: 0.75;
  }
  .proto-hw strong {
    color: var(--fg);
    font-weight: 600;
  }

  .baud {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--fg-muted);
  }

  input[type='number'] {
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 8px;
    font: inherit;
  }

  .muted {
    color: var(--fg-muted);
    margin: 0;
  }

  .small {
    font-size: 11px;
  }

  .error {
    color: var(--red);
    background: rgba(252, 165, 165, 0.08);
    border: 1px solid rgba(252, 165, 165, 0.3);
    border-radius: 4px;
    padding: 8px;
    font-size: 12px;
  }

  code {
    color: var(--accent);
  }
</style>
