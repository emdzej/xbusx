import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { buildKeyStatusRequest, type KeyStatus, parseKeyStatus } from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

const CMD_KEY_STATUS = 0x74

export interface EWSState {
  keyStatus: KeyStatus | undefined
}

export type EWSEvents = {
  keyStatusUpdate: KeyStatus
}

/** Drive-Away Protection (immobiliser) twin.  Parses the `0x74` key status broadcast. */
export class EWS extends Device<EWSState, EWSEvents> {
  readonly address = DEVICE_ADDRESSES.EWS
  readonly name = 'EWS'

  private _state: EWSState = { keyStatus: undefined }
  get state(): Readonly<EWSState> {
    return this._state
  }

  handle(message: IKBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload[0] !== CMD_KEY_STATUS) return
    const keyStatus = parseKeyStatus(message)
    this._state = { ...this._state, keyStatus }
    this.events.emit('keyStatusUpdate', keyStatus)
  }

  async requestStatus(): Promise<void> {
    await this.sender.send(buildKeyStatusRequest({ source: DEVICE_ADDRESSES.DIA }))
  }
}

export const EWSControls = {
  requestStatus: {
    label: 'Request key status',
    params: {},
    invoke: async (d: EWS, _args: object) => d.requestStatus(),
  },
} as const satisfies ControlsManifest<EWS>
