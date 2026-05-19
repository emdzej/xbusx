import {
  buildIgnitionRequest,
  buildIKECCMText,
  buildIKENumeric,
  buildOdometerRequest,
  buildSensorsRequest,
  buildTemperatureRequest,
  CMD_IKE_CCM_WRITE_TEXT,
  CMD_IKE_NUMERIC_WRITE,
  CMD_IKE_OBC_TEXT,
  CMD_IKE_REPLICATE_DATA,
  type IgnitionState,
  IKE_NUMERIC_CLEAR,
  type IKECCMTextWrite,
  type IKENumericMode,
  type IKENumericWrite,
  type IKEOBCTextFrame,
  type IKEReplicateData,
  parseIgnitionStatus,
  parseIKECCMText,
  parseIKENumeric,
  parseIKEOBCText,
  parseIKEReplicateData,
  parseOdometer,
  parseSensors,
  parseSpeedRpm,
  parseTemperature,
  type SensorsState,
  type SpeedRpm,
  type Temperature,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_IGNITION_STATUS = 0x11
const CMD_SENSORS_STATUS = 0x13
const CMD_ODOMETER_STATUS = 0x17
const CMD_SPEED_RPM = 0x18
const CMD_TEMPERATURE = 0x19

/**
 * Snapshot of the latest values the IKE has broadcast.  Fields are
 * `undefined` until the corresponding command is observed.
 */
export interface IKEState {
  ignition: IgnitionState | undefined
  sensors: SensorsState | undefined
  speedRpm: SpeedRpm | undefined
  temperature: Temperature | undefined
  odometerKm: number | undefined
  /** Last Check-Control text written to the IKE (by anyone). */
  ccmText: IKECCMTextWrite | undefined
  /** Last numeric-display write addressed to the IKE. */
  numeric: IKENumericWrite | undefined
  /**
   * On-board-computer text strings the IKE has broadcast to the displays,
   * keyed by the property ID byte (`0x01` = Time, `0x02` = Date, etc.).
   */
  obcText: Record<number, string>
  /** Most recent `0x55` Replicate-Data broadcast (IKE → LCM). */
  replicate: IKEReplicateData | undefined
}

export type IKEEvents = {
  ignitionChanged: IgnitionState
  sensorsUpdate: SensorsState
  speedRpmUpdate: SpeedRpm
  temperatureUpdate: Temperature
  odometerUpdate: number
  ccmTextUpdate: IKECCMTextWrite
  numericUpdate: IKENumericWrite
  obcTextUpdate: IKEOBCTextFrame
  replicateUpdate: IKEReplicateData
}

/**
 * Instrument cluster twin.  Passively observes IKE broadcasts (`0x11`, `0x13`,
 * `0x17`, `0x18`, `0x19`) and updates its state + emits typed events.  Mirrors
 * ignition state changes into the shared `Vehicle` context so other devices
 * react to them too.
 */
export class IKE extends Device<IKEState, IKEEvents> {
  readonly address = DEVICE_ADDRESSES.IKE
  readonly name = 'IKE'

  private _state: IKEState = {
    ignition: undefined,
    sensors: undefined,
    speedRpm: undefined,
    temperature: undefined,
    odometerKm: undefined,
    ccmText: undefined,
    numeric: undefined,
    obcText: {},
    replicate: undefined,
  }

  get state(): Readonly<IKEState> {
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

  /** Frames originating at the IKE: broadcasts of state, OBC text, and replicate data. */
  private handleOutbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_IGNITION_STATUS: {
        const state = parseIgnitionStatus(message)
        this._state = { ...this._state, ignition: state }
        this.vehicle.setIgnition(state)
        this.events.emit('ignitionChanged', state)
        break
      }
      case CMD_SENSORS_STATUS: {
        const sensors = parseSensors(message)
        this._state = { ...this._state, sensors }
        if (sensors.isIki) this.vehicle.setVariants({ ike: 'IKI' })
        this.events.emit('sensorsUpdate', sensors)
        break
      }
      case CMD_ODOMETER_STATUS: {
        const km = parseOdometer(message)
        this._state = { ...this._state, odometerKm: km }
        this.events.emit('odometerUpdate', km)
        break
      }
      case CMD_SPEED_RPM: {
        const speedRpm = parseSpeedRpm(message)
        this._state = { ...this._state, speedRpm }
        this.events.emit('speedRpmUpdate', speedRpm)
        break
      }
      case CMD_TEMPERATURE: {
        const temperature = parseTemperature(message)
        this._state = { ...this._state, temperature }
        this.events.emit('temperatureUpdate', temperature)
        break
      }
      case CMD_IKE_OBC_TEXT: {
        const frame = parseIKEOBCText(message)
        this._state = {
          ...this._state,
          obcText: { ...this._state.obcText, [frame.propertyId]: frame.text },
        }
        this.events.emit('obcTextUpdate', frame)
        break
      }
      case CMD_IKE_REPLICATE_DATA: {
        const replicate = parseIKEReplicateData(message)
        this._state = { ...this._state, replicate }
        this.events.emit('replicateUpdate', replicate)
        break
      }
    }
  }

  /**
   * Frames addressed *to* the IKE.  We mirror writes so consumers can observe
   * what's on the cluster, regardless of which other device sent the write.
   */
  private handleInbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_IKE_CCM_WRITE_TEXT: {
        const write = parseIKECCMText(message)
        this._state = { ...this._state, ccmText: write }
        this.events.emit('ccmTextUpdate', write)
        break
      }
      case CMD_IKE_NUMERIC_WRITE: {
        const write = parseIKENumeric(message)
        this._state = { ...this._state, numeric: write }
        this.events.emit('numericUpdate', write)
        break
      }
    }
  }

  /** Send a `0x10` request asking the IKE to re-broadcast its ignition state. */
  async requestIgnition(source = DEVICE_ADDRESSES.DIA): Promise<void> {
    await this.sender.send(buildIgnitionRequest({ source }))
  }

  /** Send a `0x12` request asking the IKE to re-broadcast its sensor frame. */
  async requestSensors(source = DEVICE_ADDRESSES.DIA): Promise<void> {
    await this.sender.send(buildSensorsRequest({ source }))
  }

  /** Send a `0x16` request asking the IKE to re-broadcast its odometer. */
  async requestOdometer(source = DEVICE_ADDRESSES.DIA): Promise<void> {
    await this.sender.send(buildOdometerRequest({ source }))
  }

  /** Send a `0x1D` request asking the IKE to re-broadcast temperatures. */
  async requestTemperature(source = DEVICE_ADDRESSES.DIA): Promise<void> {
    await this.sender.send(buildTemperatureRequest({ source }))
  }

  /** Send a `0x1A` Check-Control-Module write addressed to the IKE. */
  async writeCCMText(text: string, source = DEVICE_ADDRESSES.PDC): Promise<void> {
    await this.sender.send(buildIKECCMText({ source, kind: 'persist', text }))
  }

  /** Send a `0x1A` clear addressed to the IKE — wipes the CCM text area. */
  async clearCCMText(source = DEVICE_ADDRESSES.PDC): Promise<void> {
    await this.sender.send(buildIKECCMText({ source, kind: 'clear' }))
  }

  /** Send a `0x44` numeric-display write addressed to the IKE. */
  async writeNumeric(
    mode: IKENumericMode,
    value: number,
    source = DEVICE_ADDRESSES.PDC,
  ): Promise<void> {
    await this.sender.send(buildIKENumeric({ source, mode, value }))
  }

  /** Send a `0x44` clear addressed to the IKE — wipes the low-OBC numeric. */
  async clearNumeric(source = DEVICE_ADDRESSES.PDC): Promise<void> {
    await this.sender.send(buildIKENumeric({ source, mode: IKE_NUMERIC_CLEAR }))
  }
}

export const IKEControls = {
  requestIgnition: {
    label: 'Request ignition status',
    description: 'Asks the IKE to re-broadcast its 0x11 ignition state.',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestIgnition(),
  },
  requestSensors: {
    label: 'Request sensors',
    description: 'Asks the IKE to re-broadcast its 0x13 sensor frame.',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestSensors(),
  },
  requestOdometer: {
    label: 'Request odometer',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestOdometer(),
  },
  requestTemperature: {
    label: 'Request temperature',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestTemperature(),
  },
  writeCCMText: {
    label: 'Write Check-Control text',
    description: 'Sends a 0x1A frame to the IKE.  Text is right-padded to 20 chars.',
    requires: 'active',
    params: {
      text: { kind: 'string', maxLength: 20, label: 'CCM text' },
    },
    invoke: async (d: IKE, args: { text: string }) => d.writeCCMText(args.text),
  },
  clearCCMText: {
    label: 'Clear Check-Control text',
    requires: 'active',
    params: {},
    invoke: async (d: IKE, _args: object) => d.clearCCMText(),
  },
  writeNumeric: {
    label: 'Write low-OBC numeric',
    description: 'Sets the small numeric display on the cluster (PDC distance, etc.).',
    requires: 'active',
    params: {
      mode: {
        kind: 'enum',
        values: ['X1', 'X1_M', 'X100_M'] as const,
        label: 'Display mode',
        default: 'X1',
      },
      value: { kind: 'number', min: 0, max: 99, step: 1, label: 'Value (0..99)' },
    },
    invoke: async (d: IKE, args: { mode: 'X1' | 'X1_M' | 'X100_M'; value: number }) => {
      const mode = args.mode === 'X1' ? 0x23 : args.mode === 'X1_M' ? 0x21 : 0x25
      await d.writeNumeric(mode, args.value)
    },
  },
  clearNumeric: {
    label: 'Clear low-OBC numeric',
    requires: 'active',
    params: {},
    invoke: async (d: IKE, _args: object) => d.clearNumeric(),
  },
} as const satisfies ControlsManifest<IKE>
