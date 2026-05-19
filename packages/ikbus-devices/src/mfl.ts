import {
  type ButtonState,
  buildMFLButton,
  buildVolume,
  type MFLButton,
  type VolumeDirection,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

/** Which downstream device button events route to.  Toggled by the R/T button. */
export type MFLRouting = 'RAD' | 'TEL'

export interface MFLState {
  /** Internal R/T toggle.  RAD by default; flipped on each RT press. */
  routing: MFLRouting
}

export type MFLEvents = {
  routingChanged: MFLRouting
  buttonSent: { button: MFLButton; state: ButtonState; destination: number }
  volumeSent: { direction: VolumeDirection; steps: number; destination: number }
}

/**
 * Steering-wheel twin.  Input-only on a real bus — has no observed state.
 * In `active` mode it can emit button-press and volume-change frames as if
 * the user were operating the steering wheel.  The R/T routing is tracked
 * internally and flips on each RT press.
 */
export class MFL extends Device<MFLState, MFLEvents> {
  readonly address = DEVICE_ADDRESSES.MFL
  readonly name = 'MFL'

  private _state: MFLState = { routing: 'RAD' }

  get state(): Readonly<MFLState> {
    return this._state
  }

  handle(_message: IBusMessage): void {
    // MFL is input-only on the bus.  Nothing to update from inbound frames.
  }

  private get destination(): number {
    return this._state.routing === 'TEL' ? DEVICE_ADDRESSES.TEL : DEVICE_ADDRESSES.RAD
  }

  /**
   * Press a button (and optionally specify the state).  Sends a `0x3B` frame
   * to whichever device the R/T toggle currently routes to.  An RT press
   * flips the routing.
   */
  async pressButton(button: MFLButton, state: ButtonState = 'PRESS'): Promise<void> {
    const destination = this.destination
    await this.sender.send(buildMFLButton({ button, state, destination }))
    this.events.emit('buttonSent', { button, state, destination })
    if (button === 'RT' && state === 'PRESS') this.toggleRouting()
  }

  /** Send a `0x32` volume change.  Default 1 step. */
  async changeVolume(direction: VolumeDirection, steps = 1): Promise<void> {
    const destination = this.destination
    await this.sender.send(buildVolume({ direction, steps, destination }))
    this.events.emit('volumeSent', { direction, steps, destination })
  }

  /** Manually flip the R/T routing without emitting a frame. */
  toggleRouting(): void {
    const next: MFLRouting = this._state.routing === 'RAD' ? 'TEL' : 'RAD'
    this._state = { routing: next }
    this.events.emit('routingChanged', next)
  }
}

export const MFLControls = {
  pressForward: {
    label: 'Press Forward',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.pressButton('FORWARD'),
  },
  pressBack: {
    label: 'Press Back',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.pressButton('BACK'),
  },
  pressVoice: {
    label: 'Press Voice',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.pressButton('VOICE'),
  },
  toggleRT: {
    label: 'R/T toggle',
    description: 'Flips button routing between RAD and TEL.',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.pressButton('RT'),
  },
  volumeUp: {
    label: 'Volume Up',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.changeVolume('UP'),
  },
  volumeDown: {
    label: 'Volume Down',
    requires: 'active',
    params: {},
    invoke: async (d: MFL, _args: object) => d.changeVolume('DOWN'),
  },
  pressButton: {
    label: 'Press button (advanced)',
    description: 'Press a button with explicit state (press / hold / release).',
    requires: 'active',
    params: {
      button: {
        kind: 'enum',
        values: ['FORWARD', 'BACK', 'RT', 'VOICE'] as const,
      },
      state: {
        kind: 'enum',
        values: ['PRESS', 'HOLD', 'RELEASE'] as const,
        default: 'PRESS',
      },
    },
    invoke: async (d: MFL, args: { button: MFLButton; state?: ButtonState }) =>
      d.pressButton(args.button, args.state),
  },
} as const satisfies ControlsManifest<MFL>
