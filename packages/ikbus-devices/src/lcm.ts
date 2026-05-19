import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import {
  buildClusterIndicators,
  buildClusterIndicatorsRequest,
  buildIKERedundantData,
  type CCMStatus,
  type ClusterIndicators,
  CMD_CCM_STATUS,
  CMD_IKE_REDUNDANT_DATA,
  CMD_IKE_REDUNDANT_DATA_REQUEST,
  type IKERedundantData,
  parseCCMStatus,
  parseClusterIndicators,
  parseIKERedundantData,
} from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

const CMD_INDICATORS = 0x5b

export interface LCMState {
  indicators: ClusterIndicators | undefined
  /** Most recent outbound `0x54` redundant-data response. */
  redundantData: IKERedundantData | undefined
  /**
   * Most recent inbound `0x53` redundant-data request from the IKE.
   * Set to a timestamp on each request so consumers can react.
   */
  lastRedundantDataRequestAt: number | undefined
  /**
   * Most recent `0x51` Check-Control status frame.  On early E38s this
   * came from the CCM module (`0x30`); on later models the LCM absorbed
   * the CCM and sends `0x51` itself.  We track both since the LCM twin
   * is the practical place for CC indicators on later chassis.
   */
  ccmStatus: CCMStatus | undefined
}

export type LCMEvents = {
  indicatorsUpdate: ClusterIndicators
  redundantDataUpdate: IKERedundantData
  redundantDataRequest: undefined
  ccmStatusUpdate: CCMStatus
}

/**
 * Light Check Module twin.
 *
 * Outbound (LCM → ...):
 *   0x5B  cluster indicators       (existing)
 *   0x54  redundant-data response  (LCM → IKE)
 *   0x51  Check Control status     (on later chassis, broadcast)
 *
 * Inbound (... → LCM):
 *   0x53  redundant-data request   (IKE → LCM)
 *
 * Variant-aware byte-offset parsing for LME38 / LCM / LSZ etc. is TBC.
 */
export class LCM extends Device<LCMState, LCMEvents> {
  readonly address = DEVICE_ADDRESSES.LCM
  readonly name = 'LCM'

  private _state: LCMState = {
    indicators: undefined,
    redundantData: undefined,
    lastRedundantDataRequestAt: undefined,
    ccmStatus: undefined,
  }
  get state(): Readonly<LCMState> {
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
      case CMD_INDICATORS: {
        const ind = parseClusterIndicators(message)
        this._state = { ...this._state, indicators: ind }
        this.events.emit('indicatorsUpdate', ind)
        break
      }
      case CMD_IKE_REDUNDANT_DATA: {
        const r = parseIKERedundantData(message)
        this._state = { ...this._state, redundantData: r }
        this.events.emit('redundantDataUpdate', r)
        break
      }
      case CMD_CCM_STATUS: {
        const s = parseCCMStatus(message)
        this._state = { ...this._state, ccmStatus: s }
        this.events.emit('ccmStatusUpdate', s)
        break
      }
    }
  }

  private handleInbound(message: IKBusMessage): void {
    const cmd = message.payload[0]
    if (cmd === CMD_IKE_REDUNDANT_DATA_REQUEST) {
      this._state = { ...this._state, lastRedundantDataRequestAt: Date.now() }
      this.events.emit('redundantDataRequest')
    }
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

  /** Reply to the IKE's `0x53` redundant-data request with a `0x54` frame. */
  async sendRedundantData(
    args: Omit<Parameters<typeof buildIKERedundantData>[0], 'source'>,
  ): Promise<void> {
    await this.sender.send(buildIKERedundantData({ source: this.address, ...args }))
  }
}

export const LCMControls = {
  requestIndicators: {
    label: 'Request cluster indicators',
    params: {},
    invoke: async (d: LCM, _args: object) => d.requestIndicators(),
  },
} as const satisfies ControlsManifest<LCM>
