import {
  buildDoorsRequest,
  buildZKE3LockRequest,
  buildZKE5LockRequest,
  type DoorsState,
  type GMVariant,
  parseDoorsStatus,
  parseRemoteKey,
  parseVisualIndicators,
  type RemoteKeyEvent,
  type VisualIndicators,
  ZKE3_JOBS,
  ZKE5_JOBS,
} from '@emdzej/ibusx-commands'
import { type ChassisType, type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_REMOTE_KEY = 0x72
const CMD_VISUAL_INDICATORS = 0x76
const CMD_DOORS_STATUS = 0x7a

const ZKE5_CHASSIS: ReadonlySet<ChassisType> = new Set(['E46', 'E83', 'E85', 'E86', 'E87'])

export interface GMState {
  doors: DoorsState | undefined
  lastRemoteKeyEvent: RemoteKeyEvent | undefined
  lastVisualIndicators: VisualIndicators | undefined
}

export type GMEvents = {
  doorsUpdate: DoorsState
  remoteKeyEvent: RemoteKeyEvent
  visualIndicators: VisualIndicators
  lockCommandSent: { variant: GMVariant; job: number }
}

/**
 * General Module (body electronics) twin.
 *
 * Passively observes `0x72` remote-key events, `0x76` visual indicators and
 * `0x7A` door / lid status.  Actively dispatches lock / unlock commands via
 * either the ZKE3 4-byte or ZKE5 3-byte job-request format, choosing the
 * variant from `vehicle.variants.gm` (preferred) or `vehicle.chassis`
 * (fallback heuristic).
 */
export class GM extends Device<GMState, GMEvents> {
  readonly address = DEVICE_ADDRESSES.GM
  readonly name = 'GM'

  /** Source address used when emitting lock-job requests.  Defaults to DIA. */
  activeSource: number = DEVICE_ADDRESSES.DIA

  private _state: GMState = {
    doors: undefined,
    lastRemoteKeyEvent: undefined,
    lastVisualIndicators: undefined,
  }

  get state(): Readonly<GMState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_DOORS_STATUS: {
        const doors = parseDoorsStatus(message)
        this._state = { ...this._state, doors }
        this.events.emit('doorsUpdate', doors)
        break
      }
      case CMD_REMOTE_KEY: {
        const evt = parseRemoteKey(message)
        this._state = { ...this._state, lastRemoteKeyEvent: evt }
        this.events.emit('remoteKeyEvent', evt)
        break
      }
      case CMD_VISUAL_INDICATORS: {
        const ind = parseVisualIndicators(message)
        this._state = { ...this._state, lastVisualIndicators: ind }
        this.events.emit('visualIndicators', ind)
        break
      }
    }
  }

  /** Return the GM variant for this car — prefers `vehicle.variants.gm`, falls back on chassis. */
  detectVariant(): GMVariant {
    const declared = this.vehicle.variants.gm as GMVariant | undefined
    if (declared !== undefined) return declared
    if (this.vehicle.chassis !== undefined && ZKE5_CHASSIS.has(this.vehicle.chassis)) return 'ZKE5'
    return 'ZKE3_GM1'
  }

  /** Send a `0x79` request asking the GM to re-broadcast door / lid state. */
  async requestDoors(): Promise<void> {
    await this.sender.send(buildDoorsRequest({ source: this.activeSource }))
  }

  /** Lock all doors + trunk.  Dispatches to ZKE3 or ZKE5 based on detected variant. */
  async lockAll(): Promise<void> {
    const variant = this.detectVariant()
    if (variant === 'ZKE5' || variant === 'ZKE5_S12') {
      const job = ZKE5_JOBS.LOCK_ALL
      await this.sender.send(buildZKE5LockRequest({ source: this.activeSource, job }))
      this.events.emit('lockCommandSent', { variant, job })
      return
    }
    const job =
      variant === 'ZKE3_GM5' || variant === 'ZKE3_GM6'
        ? ZKE3_JOBS.LOCK_ALL_GM5
        : ZKE3_JOBS.LOCK_ALL_GM1
    await this.sender.send(buildZKE3LockRequest({ source: this.activeSource, job }))
    this.events.emit('lockCommandSent', { variant, job })
  }

  /** Unlock all doors + trunk.  ZKE3 GM1/GM4 don't have a single unlock-all — falls back to centre-lock press. */
  async unlockAll(): Promise<void> {
    const variant = this.detectVariant()
    if (variant === 'ZKE5' || variant === 'ZKE5_S12') {
      const job = ZKE5_JOBS.UNLOCK_ALL
      await this.sender.send(buildZKE5LockRequest({ source: this.activeSource, job }))
      this.events.emit('lockCommandSent', { variant, job })
      return
    }
    if (variant === 'ZKE3_GM5' || variant === 'ZKE3_GM6') {
      // Unlock-high then unlock-low for full unlock.
      await this.sender.send(
        buildZKE3LockRequest({ source: this.activeSource, job: ZKE3_JOBS.UNLOCK_HIGH_GM5 }),
      )
      await this.sender.send(
        buildZKE3LockRequest({ source: this.activeSource, job: ZKE3_JOBS.UNLOCK_LOW_GM5 }),
      )
      this.events.emit('lockCommandSent', { variant, job: ZKE3_JOBS.UNLOCK_LOW_GM5 })
      return
    }
    // GM1 / GM4: no dedicated unlock command — emit centre-lock press as the
    // user-facing approximation.  Real cars toggle from this state.
    const job = ZKE3_JOBS.CENTRAL_LOCK_GM1
    await this.sender.send(buildZKE3LockRequest({ source: this.activeSource, job }))
    this.events.emit('lockCommandSent', { variant, job })
  }

  /** Unlock the trunk only (ZKE5 only — no-op on ZKE3). */
  async unlockTrunk(): Promise<void> {
    const variant = this.detectVariant()
    if (variant !== 'ZKE5' && variant !== 'ZKE5_S12') return
    const job = ZKE5_JOBS.UNLOCK_TRUNK
    await this.sender.send(buildZKE5LockRequest({ source: this.activeSource, job }))
    this.events.emit('lockCommandSent', { variant, job })
  }

  /** Press the centre-lock button on the variant-appropriate ZKE generation. */
  async pressCentralLock(): Promise<void> {
    const variant = this.detectVariant()
    if (variant === 'ZKE5' || variant === 'ZKE5_S12') {
      const job = ZKE5_JOBS.CENTRAL_LOCK
      await this.sender.send(buildZKE5LockRequest({ source: this.activeSource, job }))
      this.events.emit('lockCommandSent', { variant, job })
      return
    }
    const job =
      variant === 'ZKE3_GM5' || variant === 'ZKE3_GM6'
        ? ZKE3_JOBS.CENTRAL_LOCK_GM5
        : ZKE3_JOBS.CENTRAL_LOCK_GM1
    await this.sender.send(buildZKE3LockRequest({ source: this.activeSource, job }))
    this.events.emit('lockCommandSent', { variant, job })
  }
}

export const GMControls = {
  requestDoors: {
    label: 'Request door / lid state',
    params: {},
    invoke: async (d: GM, _args: object) => d.requestDoors(),
  },
  lockAll: {
    label: 'Lock all',
    requires: 'active',
    params: {},
    invoke: async (d: GM, _args: object) => d.lockAll(),
  },
  unlockAll: {
    label: 'Unlock all',
    requires: 'active',
    params: {},
    invoke: async (d: GM, _args: object) => d.unlockAll(),
  },
  unlockTrunk: {
    label: 'Unlock trunk (ZKE5 only)',
    requires: 'active',
    params: {},
    invoke: async (d: GM, _args: object) => d.unlockTrunk(),
  },
  pressCentralLock: {
    label: 'Press centre-lock button',
    requires: 'active',
    params: {},
    invoke: async (d: GM, _args: object) => d.pressCentralLock(),
  },
} as const satisfies ControlsManifest<GM>
