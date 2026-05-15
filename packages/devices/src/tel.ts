import {
  buildTelLED,
  buildTelStatus,
  parseTelLED,
  parseTelStatus,
  type TelLEDFrame,
  type TelStatus,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_LED = 0x2b
const CMD_STATUS = 0x2c

export interface TELState {
  led: TelLEDFrame | undefined
  status: TelStatus | undefined
}

export type TELEvents = {
  ledUpdate: TelLEDFrame
  statusUpdate: TelStatus
}

/**
 * Telephone twin — covers the LED indicator (`0x2B`) and status bitfield
 * (`0x2C`).  The full TEL surface (16 display modes, body text, signal
 * strength, etc.) is documented in `docs/devices/tel.md` and will be added
 * in subsequent batches.
 */
export class TEL extends Device<TELState, TELEvents> {
  readonly address = DEVICE_ADDRESSES.TEL
  readonly name = 'TEL'

  private _state: TELState = { led: undefined, status: undefined }
  get state(): Readonly<TELState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    if (cmd === CMD_LED) {
      const led = parseTelLED(message)
      this._state = { ...this._state, led }
      this.events.emit('ledUpdate', led)
    } else if (cmd === CMD_STATUS) {
      const status = parseTelStatus(message)
      this._state = { ...this._state, status }
      this.events.emit('statusUpdate', status)
    }
  }

  async broadcastLED(state: Parameters<typeof buildTelLED>[0]['state']): Promise<void> {
    await this.sender.send(buildTelLED({ source: this.address, state }))
  }

  async broadcastStatus(args: Omit<Parameters<typeof buildTelStatus>[0], 'source'>): Promise<void> {
    await this.sender.send(buildTelStatus({ source: this.address, ...args }))
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
} as const satisfies ControlsManifest<TEL>
