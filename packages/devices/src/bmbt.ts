import {
  type BMBTButtonState,
  type BMBTHardButton,
  type BMBTHardButtonEvent,
  type BMBTSoftButton,
  type BMBTSoftButtonEvent,
  buildBMBTHardButton,
  buildBMBTSoftButton,
  buildNavDial,
  buildVolume,
  type NavDialDirection,
  type NavDialEvent,
  parseBMBTHardButton,
  parseBMBTSoftButton,
  parseNavDial,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_SOFT_BUTTONS = 0x47
const CMD_HARD_BUTTONS = 0x48
const CMD_NAV_DIAL = 0x49

export interface BMBTState {
  lastHardButton: BMBTHardButtonEvent | undefined
  lastSoftButton: BMBTSoftButtonEvent | undefined
  lastNavDial: NavDialEvent | undefined
}

export type BMBTEvents = {
  hardButton: BMBTHardButtonEvent
  softButton: BMBTSoftButtonEvent
  navDial: NavDialEvent
  buttonSent: { button: BMBTHardButton | BMBTSoftButton; state: BMBTButtonState }
}

/**
 * On-board-monitor twin.  Receives 0x47/0x48/0x49 from a real BMBT or emits
 * the same when in active mode (button presses, dial rotations).
 */
export class BMBT extends Device<BMBTState, BMBTEvents> {
  readonly address = DEVICE_ADDRESSES.BMBT
  readonly name = 'BMBT'

  private _state: BMBTState = {
    lastHardButton: undefined,
    lastSoftButton: undefined,
    lastNavDial: undefined,
  }
  get state(): Readonly<BMBTState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    if (cmd === CMD_HARD_BUTTONS) {
      const evt = parseBMBTHardButton(message)
      this._state = { ...this._state, lastHardButton: evt }
      this.events.emit('hardButton', evt)
    } else if (cmd === CMD_SOFT_BUTTONS) {
      const evt = parseBMBTSoftButton(message)
      this._state = { ...this._state, lastSoftButton: evt }
      this.events.emit('softButton', evt)
    } else if (cmd === CMD_NAV_DIAL) {
      const evt = parseNavDial(message)
      this._state = { ...this._state, lastNavDial: evt }
      this.events.emit('navDial', evt)
    }
  }

  async pressHardButton(button: BMBTHardButton, state: BMBTButtonState = 'PRESS'): Promise<void> {
    await this.sender.send(buildBMBTHardButton({ source: this.address, button, state }))
    this.events.emit('buttonSent', { button, state })
  }

  async pressSoftButton(button: BMBTSoftButton, state: BMBTButtonState = 'PRESS'): Promise<void> {
    await this.sender.send(buildBMBTSoftButton({ source: this.address, button, state }))
    this.events.emit('buttonSent', { button, state })
  }

  async rotateNavDial(direction: NavDialDirection, steps = 1): Promise<void> {
    await this.sender.send(buildNavDial({ source: this.address, direction, steps }))
  }

  async changeVolume(direction: 'UP' | 'DOWN', steps = 1): Promise<void> {
    await this.sender.send(buildVolume({ source: this.address, direction, steps }))
  }
}

export const BMBTControls = {
  pressMenu: {
    label: 'Press Menu',
    requires: 'active',
    params: {},
    invoke: async (d: BMBT, _args: object) => d.pressHardButton('MENU'),
  },
  pressConfirm: {
    label: 'Press Confirm',
    requires: 'active',
    params: {},
    invoke: async (d: BMBT, _args: object) => d.pressHardButton('CONFIRM'),
  },
  pressPower: {
    label: 'Press Power',
    requires: 'active',
    params: {},
    invoke: async (d: BMBT, _args: object) => d.pressHardButton('POWER'),
  },
  pressMode: {
    label: 'Press Mode (next source)',
    requires: 'active',
    params: {},
    invoke: async (d: BMBT, _args: object) => d.pressHardButton('MODE_NEXT'),
  },
  pressPreset: {
    label: 'Press preset',
    requires: 'active',
    params: {
      preset: { kind: 'number', min: 1, max: 6, default: 1 },
    },
    invoke: async (d: BMBT, args: { preset: number }) => {
      const map: Record<number, BMBTHardButton> = {
        1: 'PRESET_1',
        2: 'PRESET_2',
        3: 'PRESET_3',
        4: 'PRESET_4',
        5: 'PRESET_5',
        6: 'PRESET_6',
      }
      const btn = map[args.preset]
      if (btn !== undefined) await d.pressHardButton(btn)
    },
  },
  rotateNavDial: {
    label: 'Rotate nav dial',
    requires: 'active',
    params: {
      direction: { kind: 'enum', values: ['LEFT', 'RIGHT'] as const, default: 'RIGHT' },
      steps: { kind: 'number', min: 1, max: 15, default: 1 },
    },
    invoke: async (d: BMBT, args: { direction: NavDialDirection; steps: number }) =>
      d.rotateNavDial(args.direction, args.steps),
  },
  volumeUp: {
    label: 'Volume up',
    requires: 'active',
    params: { steps: { kind: 'number', min: 1, max: 15, default: 1 } },
    invoke: async (d: BMBT, args: { steps: number }) => d.changeVolume('UP', args.steps),
  },
  volumeDown: {
    label: 'Volume down',
    requires: 'active',
    params: { steps: { kind: 'number', min: 1, max: 15, default: 1 } },
    invoke: async (d: BMBT, args: { steps: number }) => d.changeVolume('DOWN', args.steps),
  },
} as const satisfies ControlsManifest<BMBT>
