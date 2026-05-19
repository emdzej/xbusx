import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import {
  buildTELBodyText,
  buildTELDirectDial,
  buildTELMenuText,
  buildTELSMSIcon,
  buildTelLED,
  buildTelStatus,
  CMD_TEL_BODY_TEXT,
  CMD_TEL_DIRECT_DIAL,
  CMD_TEL_MENU_TEXT,
  CMD_TEL_SMS_ICON,
  parseTELBodyText,
  parseTELDirectDial,
  parseTELMenuText,
  parseTELSMSIcon,
  parseTelLED,
  parseTelStatus,
  type TELBodyText,
  type TELDirectDial,
  type TELMenuText,
  type TELSMSIcon,
  type TelLEDFrame,
  type TelStatus,
} from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

const CMD_LED = 0x2b
const CMD_STATUS = 0x2c

export interface TELState {
  led: TelLEDFrame | undefined
  status: TelStatus | undefined
  /** Last `0x21` menu-text frame the TEL broadcast. */
  menuText: TELMenuText | undefined
  /** Last `0xA5` body-text frame. */
  bodyText: TELBodyText | undefined
  /** Last `0xA6` SMS-icon visibility broadcast. */
  smsIcon: TELSMSIcon | undefined
  /** Last `0x2D` direct-dial request received from the GT. */
  lastDirectDial: TELDirectDial | undefined
}

export type TELEvents = {
  ledUpdate: TelLEDFrame
  statusUpdate: TelStatus
  menuTextUpdate: TELMenuText
  bodyTextUpdate: TELBodyText
  smsIconUpdate: TELSMSIcon
  directDial: TELDirectDial
}

/**
 * Telephone twin.  Covers the LED indicator (`0x2B`), status bitfield
 * (`0x2C`), menu-text (`0x21`), body-text (`0xA5`), SMS icon (`0xA6`),
 * and direct-dial (`0x2D`) frames.
 */
export class TEL extends Device<TELState, TELEvents> {
  readonly address = DEVICE_ADDRESSES.TEL
  readonly name = 'TEL'

  private _state: TELState = {
    led: undefined,
    status: undefined,
    menuText: undefined,
    bodyText: undefined,
    smsIcon: undefined,
    lastDirectDial: undefined,
  }
  get state(): Readonly<TELState> {
    return this._state
  }

  handle(message: IKBusMessage): void {
    if (message.payload.length < 1) return
    if (message.source === this.address) {
      this.handleOutbound(message)
    } else if (message.destination === this.address) {
      this.handleInbound(message)
    }
  }

  private handleOutbound(message: IKBusMessage): void {
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_LED: {
        const led = parseTelLED(message)
        this._state = { ...this._state, led }
        this.events.emit('ledUpdate', led)
        break
      }
      case CMD_STATUS: {
        const status = parseTelStatus(message)
        this._state = { ...this._state, status }
        this.events.emit('statusUpdate', status)
        break
      }
      case CMD_TEL_MENU_TEXT: {
        const m = parseTELMenuText(message)
        this._state = { ...this._state, menuText: m }
        this.events.emit('menuTextUpdate', m)
        break
      }
      case CMD_TEL_BODY_TEXT: {
        const b = parseTELBodyText(message)
        this._state = { ...this._state, bodyText: b }
        this.events.emit('bodyTextUpdate', b)
        break
      }
      case CMD_TEL_SMS_ICON: {
        const s = parseTELSMSIcon(message)
        this._state = { ...this._state, smsIcon: s }
        this.events.emit('smsIconUpdate', s)
        break
      }
    }
  }

  private handleInbound(message: IKBusMessage): void {
    const cmd = message.payload[0]
    if (cmd === CMD_TEL_DIRECT_DIAL) {
      const d = parseTELDirectDial(message)
      this._state = { ...this._state, lastDirectDial: d }
      this.events.emit('directDial', d)
    }
  }

  async broadcastLED(state: Parameters<typeof buildTelLED>[0]['state']): Promise<void> {
    await this.sender.send(buildTelLED({ source: this.address, state }))
  }

  async broadcastStatus(args: Omit<Parameters<typeof buildTelStatus>[0], 'source'>): Promise<void> {
    await this.sender.send(buildTelStatus({ source: this.address, ...args }))
  }

  /** Broadcast a `0x21` menu-text frame from the TEL. */
  async broadcastMenuText(
    args: Omit<Parameters<typeof buildTELMenuText>[0], 'source'>,
  ): Promise<void> {
    await this.sender.send(buildTELMenuText({ source: this.address, ...args }))
  }

  /** Broadcast a `0xA5` body-text frame from the TEL. */
  async broadcastBodyText(
    args: Omit<Parameters<typeof buildTELBodyText>[0], 'source'>,
  ): Promise<void> {
    await this.sender.send(buildTELBodyText({ source: this.address, ...args }))
  }

  /** Show or hide the SMS unread-message icon. */
  async showSMSIcon(visible: boolean): Promise<void> {
    await this.sender.send(buildTELSMSIcon({ source: this.address, visible }))
  }

  /** Send a `0x2D` direct-dial request as if from the GT. */
  async sendDirectDial(phoneNumber: string, source = DEVICE_ADDRESSES.GT): Promise<void> {
    await this.sender.send(buildTELDirectDial({ source, phoneNumber }))
  }
}

export const TELControls = {
  ledOff: {
    label: 'LED off',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.broadcastLED('OFF'),
  },
  ledGreen: {
    label: 'LED green',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.broadcastLED('GREEN_ON'),
  },
  ledRed: {
    label: 'LED red',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.broadcastLED('RED_ON'),
  },
  setStatusIdle: {
    label: 'Status: power on, idle',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.broadcastStatus({ power: true }),
  },
  setStatusOnCall: {
    label: 'Status: on call, handsfree',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) =>
      d.broadcastStatus({ power: true, onCall: true, handsfree: true }),
  },
  showSMSIcon: {
    label: 'Show SMS unread icon',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.showSMSIcon(true),
  },
  hideSMSIcon: {
    label: 'Hide SMS unread icon',
    requires: 'active',
    params: {},
    invoke: async (d: TEL, _args: object) => d.showSMSIcon(false),
  },
} as const satisfies ControlsManifest<TEL>
