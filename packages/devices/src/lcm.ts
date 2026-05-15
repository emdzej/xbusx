import {
  buildClusterIndicators,
  buildClusterIndicatorsRequest,
  type ClusterIndicators,
  parseClusterIndicators,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_INDICATORS = 0x5b

export interface LCMState {
  indicators: ClusterIndicators | undefined
}

export type LCMEvents = {
  indicatorsUpdate: ClusterIndicators
}

/**
 * Light Check Module twin.  Currently parses the `0x5B` cluster-indicators
 * broadcast.  Variant-aware byte-offset parsing for LME38 / LCM / LSZ etc. is
 * TBC — for now we only expose byte 0 (stable across variants) and the raw
 * trailing bytes for callers that need to interpret variant-specific bits.
 */
export class LCM extends Device<LCMState, LCMEvents> {
  readonly address = DEVICE_ADDRESSES.LCM
  readonly name = 'LCM'

  private _state: LCMState = { indicators: undefined }
  get state(): Readonly<LCMState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload[0] !== CMD_INDICATORS) return
    const ind = parseClusterIndicators(message)
    this._state = { ...this._state, indicators: ind }
    this.events.emit('indicatorsUpdate', ind)
  }

  /** Send a `0x5A` request asking the LCM to re-broadcast cluster indicators. */
  async requestIndicators(): Promise<void> {
    await this.sender.send(buildClusterIndicatorsRequest({ source: DEVICE_ADDRESSES.DIA }))
  }

  /** Broadcast a fresh `0x5B` cluster-indicators frame.  Active mode only. */
  async broadcastIndicators(
    args: Parameters<typeof buildClusterIndicators>[0] = {},
  ): Promise<void> {
    await this.sender.send(buildClusterIndicators({ source: this.address, ...args }))
  }
}

export const LCMControls = {
  requestIndicators: {
    label: 'Request cluster indicators',
    params: {},
    invoke: async (d: LCM, _args: object) => d.requestIndicators(),
  },
} as const satisfies ControlsManifest<LCM>
