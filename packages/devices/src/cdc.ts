import {
  buildCDCStatus,
  type CDCFunction,
  type CDCRequest,
  type CDCStatus,
  type CDCSubcommand,
  parseCDCRequest,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_CDC_REQUEST = 0x38

export interface CDCEmulatorState {
  status: CDCStatus
  function: CDCFunction
  /** Magazine bitmask.  Defaults to 0x01 (slot 1 only — single-disc emulation). */
  magazineMask: number
  disc: number
  track: number
}

export type CDCEvents = {
  requestReceived: CDCRequest
  statusBroadcast: CDCEmulatorState
  /** Fired with semantic transitions so listeners can react without parsing status frames. */
  playStarted: void
  playStopped: void
  playPaused: void
  trackChanged: { disc: number; track: number }
}

/**
 * CD-changer twin with active-mode emulation — the BlueBus pattern.
 *
 * In `active` mode this twin auto-responds to incoming `0x38` requests from
 * the radio with a `0x39` status frame reflecting its internal state.  The
 * pragmatic rule is "reply with the requested state, not the actual state" —
 * if the radio asks us to start playing, we immediately reply `PLAYING` so
 * the radio stops re-polling, even if any downstream audio path is not yet
 * up.
 *
 * In `passive` mode the twin only observes — useful for logging an existing
 * CDC on the bus.
 */
export class CDC extends Device<CDCEmulatorState, CDCEvents> {
  readonly address = DEVICE_ADDRESSES.CDC
  readonly name = 'CDC'

  private _state: CDCEmulatorState = {
    status: 'STOP',
    function: 'NOT_PLAYING',
    magazineMask: 0x01,
    disc: 1,
    track: 1,
  }

  get state(): Readonly<CDCEmulatorState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.destination !== this.address) return
    if (message.payload.length < 1) return
    if (message.payload[0] !== CMD_CDC_REQUEST) return

    const request = parseCDCRequest(message)
    this.events.emit('requestReceived', request)

    if (this.mode !== 'active') return
    this.applyRequest(request)
    // Fire-and-forget — IBus.send returns a promise the caller can await,
    // but here we don't have anything to do with it.
    void this.broadcastStatus()
  }

  private applyRequest(request: CDCRequest): void {
    switch (request.subcommand) {
      case 'GET_STATUS':
        // No state change — just reply with current.
        break
      case 'START_PLAYING':
        this._state = { ...this._state, status: 'PLAYING', function: 'PLAYING' }
        this.events.emit('playStarted')
        break
      case 'STOP_PLAYING':
        this._state = { ...this._state, status: 'STOP', function: 'NOT_PLAYING' }
        this.events.emit('playStopped')
        break
      case 'PAUSE_PLAYING':
        this._state = { ...this._state, status: 'PAUSE', function: 'PAUSE' }
        this.events.emit('playPaused')
        break
      case 'CHANGE_TRACK':
      case 'CHANGE_TRACK_BLAUPUNKT': {
        // Direction is encoded in the param byte: 0 = previous, non-zero = next.
        const next = request.param === 0 ? this._state.track - 1 : this._state.track + 1
        const track = Math.max(1, Math.min(99, next))
        this._state = { ...this._state, track }
        this.events.emit('trackChanged', { disc: this._state.disc, track })
        break
      }
      case 'CD_CHANGE': {
        const disc = Math.max(1, Math.min(6, request.param || this._state.disc))
        this._state = { ...this._state, disc, track: 1 }
        this.events.emit('trackChanged', { disc, track: 1 })
        break
      }
      case 'SCAN':
        this._state = { ...this._state, function: 'SCAN_MODE' }
        break
      case 'RANDOM_MODE':
        this._state = { ...this._state, function: 'RANDOM_MODE' }
        break
      // SEEK / UNKNOWN — no state mutation
    }
  }

  /** Broadcast the current state as a `0x39` frame. */
  async broadcastStatus(): Promise<void> {
    await this.sender.send(
      buildCDCStatus({
        status: this._state.status,
        function: this._state.function,
        magazineMask: this._state.magazineMask,
        disc: this._state.disc,
        track: this._state.track,
      }),
    )
    this.events.emit('statusBroadcast', this._state)
  }

  /** Set a specific state directly (for tests / scripted scenarios). */
  setState(patch: Partial<CDCEmulatorState>): void {
    this._state = { ...this._state, ...patch }
  }
}

export const CDCControls = {
  startPlaying: {
    label: 'Start playing',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => {
      d.setState({ status: 'PLAYING', function: 'PLAYING' })
      await d.broadcastStatus()
    },
  },
  stopPlaying: {
    label: 'Stop playing',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => {
      d.setState({ status: 'STOP', function: 'NOT_PLAYING' })
      await d.broadcastStatus()
    },
  },
  pausePlaying: {
    label: 'Pause',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => {
      d.setState({ status: 'PAUSE', function: 'PAUSE' })
      await d.broadcastStatus()
    },
  },
  nextTrack: {
    label: 'Next track',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => {
      d.setState({ track: Math.min(99, d.state.track + 1) })
      await d.broadcastStatus()
    },
  },
  previousTrack: {
    label: 'Previous track',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => {
      d.setState({ track: Math.max(1, d.state.track - 1) })
      await d.broadcastStatus()
    },
  },
  selectDisc: {
    label: 'Select disc',
    requires: 'active',
    params: {
      disc: { kind: 'number', min: 1, max: 6, default: 1 },
    },
    invoke: async (d: CDC, args: { disc: number }) => {
      d.setState({ disc: args.disc, track: 1 })
      await d.broadcastStatus()
    },
  },
  broadcastStatus: {
    label: 'Broadcast status now',
    description: 'Force-emit a 0x39 status frame with the current state.',
    requires: 'active',
    params: {},
    invoke: async (d: CDC, _args: object) => d.broadcastStatus(),
  },
  announce: {
    label: 'Announce on bus',
    description: 'Subcommand: emit the 0x02 announce pong.  TBC — wire up to general/pong codec.',
    requires: 'active',
    params: {},
    invoke: async (_d: CDC, _args: object) => {
      // TBC — implement when general/announce codec lands.
    },
  },
} as const satisfies ControlsManifest<CDC>
