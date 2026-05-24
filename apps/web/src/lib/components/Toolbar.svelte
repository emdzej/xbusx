<script lang="ts">
interface Props {
  connected: boolean
  active: boolean
  portLabel: string
  onToggleActive: () => void
  onDisconnect: () => void | Promise<void>
  onOpenSettings: () => void
}

let { connected, active, portLabel, onToggleActive, onDisconnect, onOpenSettings }: Props =
  $props()
</script>

<div class="toolbar">
  {#if connected}
    <span class="port">{portLabel}</span>
    <button class:on={active} onclick={onToggleActive}>
      <span class="dot" class:on={active}></span>
      {active ? 'ACTIVE' : 'passive'}
    </button>
    <button onclick={() => onDisconnect()}>Disconnect</button>
  {:else}
    <span class="status">disconnected</span>
  {/if}
  <button class="settings" onclick={onOpenSettings} aria-label="Settings" title="Settings">
    ⚙
  </button>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .port {
    color: var(--fg-muted);
    font-size: 12px;
  }

  .status {
    color: var(--fg-muted);
  }

  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--fg-muted);
    margin-right: 6px;
    vertical-align: middle;
  }

  .dot.on {
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
  }

  button.on {
    color: var(--green);
    border-color: var(--green);
  }

  button.settings {
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;
  }
</style>
