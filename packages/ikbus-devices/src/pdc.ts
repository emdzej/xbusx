import {
  buildPDCSensorRequest,
  type PDCDistances,
  type PDCStatus,
  parsePDCSensors,
  parsePDCStatus,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_STATUS = 0x07
const CMD_SENSOR_RESPONSE = 0xa0

export interface PDCState {
  status: PDCStatus | undefined
  distances: PDCDistances | undefined
}

export type PDCEvents = {
  statusUpdate: PDCStatus
  distancesUpdate: PDCDistances
}

/** Park-Distance Control twin.  Parses both `0x07` status and `0xA0` sensor distances. */
export class PDC extends Device<PDCState, PDCEvents> {
  readonly address = DEVICE_ADDRESSES.PDC
  readonly name = 'PDC'

  private _state: PDCState = { status: undefined, distances: undefined }
  get state(): Readonly<PDCState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    if (cmd === CMD_STATUS) {
      const status = parsePDCStatus(message)
      this._state = { ...this._state, status }
      this.events.emit('statusUpdate', status)
    } else if (cmd === CMD_SENSOR_RESPONSE) {
      const distances = parsePDCSensors(message)
      this._state = { ...this._state, distances }
      this.events.emit('distancesUpdate', distances)
    }
  }

  async requestSensors(): Promise<void> {
    await this.sender.send(buildPDCSensorRequest({ source: DEVICE_ADDRESSES.DIA }))
  }
}

export const PDCControls = {
  requestSensors: {
    label: 'Request sensor distances',
    params: {},
    invoke: async (d: PDC, _args: object) => d.requestSensors(),
  },
} as const satisfies ControlsManifest<PDC>
