<script lang="ts">
interface Props {
  baudRate: number
  error: string | undefined
  onConnect: (port: SerialPort) => void | Promise<void>
}

let { baudRate = $bindable(), error, onConnect }: Props = $props()
let busy = $state(false)

async function pick(): Promise<void> {
  if (!('serial' in navigator)) return
  busy = true
  try {
    const port = await navigator.serial.requestPort()
    await onConnect(port)
  } catch (err) {
    // User cancelled or denied — surface only real failures via parent's error.
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
    <h2>Connect to a BMW I/K-bus</h2>
    <p class="muted">
      The browser will prompt you to pick a serial port.  Best results with a 9600-baud 8E1
      FTDI adapter tapped onto the single-wire K-bus or I-bus line.
    </p>

    <label>
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
      Chrome / Edge / Opera on HTTPS or <code>localhost</code> only.  Settings persist via
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

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: var(--fg-muted);
  }

  input {
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
