import {
  buildOBCControl,
  buildOBCInput,
  buildSetRadioUI,
  type OBCControl,
  type OBCControlAction,
  type OBCInput,
  type OBCProperty,
  parseOBCControl,
  parseOBCInput,
  parseSetRadioUI,
  type SetRadioUI,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_OBC_INPUT = 0x40
const CMD_OBC_CONTROL = 0x41
const CMD_SET_RADIO_UI = 0x45

export interface GTState {
  lastSetRadioUI: SetRadioUI | undefined
  lastOBCInput: OBCInput | undefined
  lastOBCControl: OBCControl | undefined
}

export type GTEvents = {
  setRadioUI: SetRadioUI
  obcInput: OBCInput
  obcControl: OBCControl
}

/**
 * Graphics Terminal twin.  Observes outgoing GT frames (`0x45` arbitration,
 * `0x40` / `0x41` OBC traffic) and exposes active-mode controls for the same.
 */
export class GT extends Device<GTState, GTEvents> {
  readonly address = DEVICE_ADDRESSES.GT
  readonly name = 'GT'

  private _state: GTState = {
    lastSetRadioUI: undefined,
    lastOBCInput: undefined,
    lastOBCControl: undefined,
  }
  get state(): Readonly<GTState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    if (cmd === CMD_SET_RADIO_UI) {
      const evt = parseSetRadioUI(message)
      this._state = { ...this._state, lastSetRadioUI: evt }
      this.events.emit('setRadioUI', evt)
    } else if (cmd === CMD_OBC_INPUT) {
      const evt = parseOBCInput(message)
      this._state = { ...this._state, lastOBCInput: evt }
      this.events.emit('obcInput', evt)
    } else if (cmd === CMD_OBC_CONTROL) {
      const evt = parseOBCControl(message)
      this._state = { ...this._state, lastOBCControl: evt }
      this.events.emit('obcControl', evt)
    }
  }

  async setRadioUI(args: Omit<Parameters<typeof buildSetRadioUI>[0], 'source'>): Promise<void> {
    await this.sender.send(buildSetRadioUI({ source: this.address, ...args }))
  }

  async writeOBCInput(property: OBCProperty, data: ReadonlyArray<number>): Promise<void> {
    await this.sender.send(buildOBCInput({ source: this.address, property, data }))
  }

  async controlOBC(property: OBCProperty, actions: ReadonlyArray<OBCControlAction>): Promise<void> {
    await this.sender.send(buildOBCControl({ source: this.address, property, actions }))
  }
}

export const GTControls = {
  yieldRadio: {
    label: 'Yield to radio (no priority bits)',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.setRadioUI({}),
  },
  takeRadio: {
    label: 'Take radio screen (GT priority)',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.setRadioUI({ priorityGt: true }),
  },
  requestOBCTime: {
    label: 'Request OBC: Time',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.controlOBC('TIME', ['REQUEST_STRING']),
  },
  requestOBCRange: {
    label: 'Request OBC: Range',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.controlOBC('RANGE', ['REQUEST_STRING']),
  },
} as const satisfies ControlsManifest<GT>
