import {
  type BMBTServiceReply,
  type BMBTServiceRequest,
  buildBMBTServiceRequest,
  buildGTMenuSelect,
  buildOBCControl,
  buildOBCInput,
  buildSetRadioUI,
  CMD_BMBT_SERVICE_REPLY,
  CMD_BMBT_SERVICE_REQUEST,
  CMD_GT_MENU_SELECT,
  GT_MENU_SELECT_TELEPHONE,
  type GTMenuSelect,
  type OBCControl,
  type OBCControlAction,
  type OBCInput,
  type OBCProperty,
  parseBMBTServiceReply,
  parseBMBTServiceRequest,
  parseGTMenuSelect,
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
  /** Most recent outbound `0x20` menu-select. */
  lastMenuSelect: GTMenuSelect | undefined
  /** Most recent outbound `0x05` BMBT Service-Mode request. */
  lastServiceRequest: BMBTServiceRequest | undefined
  /** Most recent inbound `0x06` BMBT Service-Mode reply. */
  lastServiceReply: BMBTServiceReply | undefined
}

export type GTEvents = {
  setRadioUI: SetRadioUI
  obcInput: OBCInput
  obcControl: OBCControl
  menuSelect: GTMenuSelect
  serviceRequest: BMBTServiceRequest
  serviceReply: BMBTServiceReply
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
    lastMenuSelect: undefined,
    lastServiceRequest: undefined,
    lastServiceReply: undefined,
  }
  get state(): Readonly<GTState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.payload.length < 1) return
    if (message.source === this.address) {
      this.handleOutbound(message)
    } else if (message.destination === this.address) {
      this.handleInbound(message)
    }
  }

  private handleOutbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_SET_RADIO_UI: {
        const evt = parseSetRadioUI(message)
        this._state = { ...this._state, lastSetRadioUI: evt }
        this.events.emit('setRadioUI', evt)
        break
      }
      case CMD_OBC_INPUT: {
        const evt = parseOBCInput(message)
        this._state = { ...this._state, lastOBCInput: evt }
        this.events.emit('obcInput', evt)
        break
      }
      case CMD_OBC_CONTROL: {
        const evt = parseOBCControl(message)
        this._state = { ...this._state, lastOBCControl: evt }
        this.events.emit('obcControl', evt)
        break
      }
      case CMD_GT_MENU_SELECT: {
        const m = parseGTMenuSelect(message)
        this._state = { ...this._state, lastMenuSelect: m }
        this.events.emit('menuSelect', m)
        break
      }
      case CMD_BMBT_SERVICE_REQUEST: {
        const req = parseBMBTServiceRequest(message)
        this._state = { ...this._state, lastServiceRequest: req }
        this.events.emit('serviceRequest', req)
        break
      }
    }
  }

  private handleInbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    if (cmd === CMD_BMBT_SERVICE_REPLY) {
      const reply = parseBMBTServiceReply(message)
      this._state = { ...this._state, lastServiceReply: reply }
      this.events.emit('serviceReply', reply)
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

  /** Broadcast a `0x20` menu-select frame.  Defaults to the Telephone selection. */
  async sendMenuSelect(
    param1 = GT_MENU_SELECT_TELEPHONE.param1,
    param2 = GT_MENU_SELECT_TELEPHONE.param2,
  ): Promise<void> {
    await this.sender.send(buildGTMenuSelect({ source: this.address, param1, param2 }))
  }

  /** Send a `0x05` BMBT Service-Mode request. */
  async sendBMBTServiceRequest(property: number, data: ReadonlyArray<number> = []): Promise<void> {
    await this.sender.send(buildBMBTServiceRequest({ source: this.address, property, data }))
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
  selectTelephone: {
    label: 'Select Telephone from main menu',
    description: 'Broadcasts the 0x20 menu-select Wilhelm documents for Telephone.',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.sendMenuSelect(),
  },
  requestBMBTIdent: {
    label: 'Request BMBT identification',
    description: 'Sends 0x05 / property 0x00 to ask the BMBT for its ident data.',
    requires: 'active',
    params: {},
    invoke: async (d: GT, _args: object) => d.sendBMBTServiceRequest(0x00),
  },
} as const satisfies ControlsManifest<GT>
