import {
  buildClearFaultMemoryRequest,
  buildReadCodingRequest,
  buildReadFaultMemoryRequest,
  buildReadFaultShadowMemoryRequest,
  buildReadIdentificationRequest,
  buildResetControlUnitRequest,
  buildTerminateDiagnosticRequest,
  type CodingRead,
  type ECUIdentification,
  type FaultMemoryRead,
  parseCodingResponse,
  parseECUIdentification,
  parseFaultMemoryResponse,
  parseResponse,
} from '@emdzej/dbus-commands'
import type { DeviceAddress } from '@emdzej/dbus-protocol'
import { type ControlsManifest, TypedEmitter } from '@emdzej/ibusx-core'
import type { DBus, DBusRequestOptions } from './dbus.js'
import { DBusNegativeResponseError } from './errors.js'

/**
 * Snapshot of an ECU's last-read state. Updated as a side-effect of the
 * query methods on `ECU`. All fields start `undefined` and get populated
 * the first time the matching command succeeds.
 */
export interface ECUState {
  /** Most recent successful `0x00` read-identification reply. */
  readonly identification: ECUIdentification | undefined
  /** Most recent successful `0x04` read-fault-memory reply. */
  readonly faultMemory: FaultMemoryRead | undefined
  /** Most recent successful `0x14` read-fault-shadow-memory reply. */
  readonly faultShadowMemory: FaultMemoryRead | undefined
  /** Most recent successful `0x08` read-coding-data reply. */
  readonly coding: CodingRead | undefined
  /** Epoch-ms timestamp of the most recent successful `0x12` reset. */
  readonly lastResetAt: number | undefined
  /** True after a `0x9F` terminate-diagnostic has been positively ACK'd. */
  readonly diagnosticTerminated: boolean
}

export type ECUEvents = {
  identification: ECUIdentification
  faultMemoryRead: FaultMemoryRead
  faultShadowMemoryRead: FaultMemoryRead
  faultMemoryCleared: undefined
  codingRead: CodingRead
  reset: undefined
  diagnosticTerminated: undefined
}

/**
 * Base class for D-bus ECU twins.
 *
 * Every DS2 ECU answers to the same handful of "general" commands
 * (identification, fault memory, coding, reset, terminate). This class
 * implements those once and exposes them as methods that update an
 * `ECUState` snapshot and fire typed events. ECU-specific commands
 * (live data, adaptation values, etc.) belong on the concrete subclasses
 * as additional methods + state.
 *
 * Subclasses must declare `address` and `name`. They can add their own
 * methods that issue ECU-specific DS2 requests via the protected
 * `request()` helper.
 */
export abstract class ECU {
  abstract readonly address: DeviceAddress
  abstract readonly name: string
  readonly events: TypedEmitter<ECUEvents>

  protected readonly bus: DBus
  protected _state: ECUState = {
    identification: undefined,
    faultMemory: undefined,
    faultShadowMemory: undefined,
    coding: undefined,
    lastResetAt: undefined,
    diagnosticTerminated: false,
  }

  constructor(bus: DBus) {
    this.bus = bus
    this.events = new TypedEmitter<ECUEvents>()
  }

  get state(): Readonly<ECUState> {
    return this._state
  }

  /**
   * Send a request to this ECU and return the positive-ACK payload
   * (bytes following the `0xA0` marker). Throws
   * `DBusNegativeResponseError` on any non-positive DS2 code. Subclasses
   * use this helper to implement ECU-specific commands.
   */
  protected async request(frame: Uint8Array, options?: DBusRequestOptions): Promise<Uint8Array> {
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    return parsed.data
  }

  /** DS2 `0x00` — read ECU identification. */
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

  /** DS2 `0x04` — read active fault memory (DTCs). */
  async readFaultMemory(options?: DBusRequestOptions): Promise<FaultMemoryRead> {
    const frame = buildReadFaultMemoryRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    const faults = parseFaultMemoryResponse(response)
    this._state = { ...this._state, faultMemory: faults }
    this.events.emit('faultMemoryRead', faults)
    return faults
  }

  /** DS2 `0x14` — read fault shadow memory (historic / cleared DTCs). */
  async readFaultShadowMemory(options?: DBusRequestOptions): Promise<FaultMemoryRead> {
    const frame = buildReadFaultShadowMemoryRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    const faults = parseFaultMemoryResponse(response)
    this._state = { ...this._state, faultShadowMemory: faults }
    this.events.emit('faultShadowMemoryRead', faults)
    return faults
  }

  /** DS2 `0x05` — clear the fault memory. */
  async clearFaultMemory(options?: DBusRequestOptions): Promise<void> {
    const frame = buildClearFaultMemoryRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    this._state = { ...this._state, faultMemory: undefined }
    this.events.emit('faultMemoryCleared')
  }

  /** DS2 `0x08` — read coding data (the NCS coding string). */
  async readCoding(options?: DBusRequestOptions): Promise<CodingRead> {
    const frame = buildReadCodingRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    const coding = parseCodingResponse(response)
    this._state = { ...this._state, coding }
    this.events.emit('codingRead', coding)
    return coding
  }

  /**
   * DS2 `0x12` — soft-reset the ECU. The ECU positive-ACKs and
   * re-initialises; later traffic may briefly fail until it's ready.
   */
  async resetControlUnit(options?: DBusRequestOptions): Promise<void> {
    const frame = buildResetControlUnitRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    this._state = { ...this._state, lastResetAt: Date.now() }
    this.events.emit('reset')
  }

  /** DS2 `0x9F` — politely end the diagnostic session. */
  async terminateDiagnostic(options?: DBusRequestOptions): Promise<void> {
    const frame = buildTerminateDiagnosticRequest({ destination: this.address })
    const response = await this.bus.request(this.address, frame, options)
    const parsed = parseResponse(response)
    if (parsed.kind !== 'positive') {
      throw new DBusNegativeResponseError(parsed.code as number, parsed.data)
    }
    this._state = { ...this._state, diagnosticTerminated: true }
    this.events.emit('diagnosticTerminated')
  }
}

/**
 * Shared `ControlsManifest` for the general DS2 commands every ECU twin
 * supports. Reads are always safe; the `clear`, `reset`, and `terminate`
 * controls flip persistent state on the ECU and are gated behind
 * `requires: 'active'` so the safety toggle is meaningful for them.
 */
export const DS2_CONTROLS = {
  readIdentification: {
    label: 'Read identification',
    description: 'DS2 0x00 — hardware/coding/firmware indices.',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.readIdentification()
    },
  },
  readFaultMemory: {
    label: 'Read fault memory',
    description: 'DS2 0x04 — active DTCs.',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.readFaultMemory()
    },
  },
  readFaultShadowMemory: {
    label: 'Read fault shadow memory',
    description: 'DS2 0x14 — historic / cleared DTCs.',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.readFaultShadowMemory()
    },
  },
  clearFaultMemory: {
    label: 'Clear fault memory',
    description: 'DS2 0x05 — wipe the DTC list.',
    requires: 'active',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.clearFaultMemory()
    },
  },
  readCoding: {
    label: 'Read coding data',
    description: 'DS2 0x08 — the NCS / NCS-Expert coding string.',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.readCoding()
    },
  },
  resetControlUnit: {
    label: 'Reset control unit',
    description: 'DS2 0x12 — soft-reset the ECU (it re-initialises).',
    requires: 'active',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.resetControlUnit()
    },
  },
  terminateDiagnostic: {
    label: 'Terminate diagnostic mode',
    description: 'DS2 0x9F — politely close the DS2 session.',
    requires: 'active',
    params: {},
    invoke: async (d: ECU, _args: object) => {
      await d.terminateDiagnostic()
    },
  },
} as const satisfies ControlsManifest<ECU>
