import {
  buildReadIdentificationRequest,
  type ECUIdentification,
  parseECUIdentification,
  parseResponse,
} from '@emdzej/dbus-commands'
import { DBUS_ADDRESSES, type DeviceAddress } from '@emdzej/dbus-protocol'
import { type ControlsManifest, TypedEmitter } from '@emdzej/ibusx-core'
import type { DBus, DBusRequestOptions } from './dbus.js'
import { DBusNegativeResponseError } from './errors.js'

export interface DMEState {
  /** Most recent successful read-identification reply. */
  readonly identification: ECUIdentification | undefined
}

export type DMEEvents = {
  /** Fires after a successful `readIdentification()`. */
  identification: ECUIdentification
}

/**
 * Digital Motor Electronics twin (engine controller — address `0x12`).
 *
 * D-bus ECU twins differ from I/K-bus device twins: they are not passive
 * observers of broadcast traffic — they are remote objects you query via
 * the `DBus` orchestrator. State is updated as side-effects of query
 * methods, and events fire when a query completes successfully.
 */
export class DME {
  readonly address: DeviceAddress = DBUS_ADDRESSES.DME
  readonly name = 'DME'
  readonly events: TypedEmitter<DMEEvents>

  private readonly bus: DBus
  private _state: DMEState = { identification: undefined }

  constructor(bus: DBus) {
    this.bus = bus
    this.events = new TypedEmitter<DMEEvents>()
  }

  get state(): Readonly<DMEState> {
    return this._state
  }

  /**
   * Send the DS2 `0x00` read-identification request and resolve with the
   * ECU's reply. Throws `DBusNegativeResponseError` if the ECU answers
   * with a non-positive code.
   */
  async readIdentification(options?: DBusRequestOptions): Promise<ECUIdentification> {
    const frame = buildReadIdentificationRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    const ident = parseECUIdentification(response)
    this._state = { ...this._state, identification: ident }
    this.events.emit('identification', ident)
    return ident
  }
}

/**
 * UI control manifest for `DME`. The CLI / TUI / web walk this to render
 * buttons that issue DS2 queries.
 *
 * Note: D-bus queries always send a frame on the wire (D-bus is
 * request/response — there's no "observe-only" mode). The `requires`
 * field is therefore left at the default (`passive`) for reads — they're
 * always safe to issue. Coding-write controls (when added) should set
 * `requires: 'active'` to keep the safety toggle meaningful for the
 * dangerous operations.
 */
export const DMEControls = {
  readIdentification: {
    label: 'Read identification',
    description: 'DS2 0x00 — request ECU identification (hardware/coding/firmware indices).',
    params: {},
    invoke: async (d: DME, _args: object) => {
      await d.readIdentification()
    },
  },
} as const satisfies ControlsManifest<DME>
