import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import {
  buildIgnitionRequest,
  buildIKECCMText,
  buildIKEClusterButton,
  buildIKEDeviceReset,
  buildIKELanguageRegionRequest,
  buildIKENumeric,
  buildIKEOBCRemoteConfig,
  buildIKEOBCStatus,
  buildIKERedundantDataRequest,
  buildOdometerRequest,
  buildSensorsRequest,
  buildTemperatureRequest,
  CMD_DEVICE_RESET,
  CMD_GPS_TIME,
  CMD_IKE_CCM_WRITE_TEXT,
  CMD_IKE_CLUSTER_BUTTON,
  CMD_IKE_LANGUAGE_REGION,
  CMD_IKE_LANGUAGE_REGION_REQUEST,
  CMD_IKE_NUMERIC_WRITE,
  CMD_IKE_OBC_REMOTE_CONFIG,
  CMD_IKE_OBC_STATUS,
  CMD_IKE_OBC_TEXT,
  CMD_IKE_REDUNDANT_DATA,
  CMD_IKE_REPLICATE_DATA,
  type GPSTime,
  type IgnitionState,
  IKE_NUMERIC_CLEAR,
  type IKECCMTextWrite,
  type IKEClusterButton,
  type IKEClusterButtonName,
  type IKEDeviceReset,
  type IKELanguageRegion,
  type IKENumericMode,
  type IKENumericWrite,
  type IKEOBCRemoteConfig,
  type IKEOBCStatus,
  type IKEOBCTextFrame,
  type IKERedundantData,
  type IKEReplicateData,
  parseGPSTime,
  parseIgnitionStatus,
  parseIKECCMText,
  parseIKEClusterButton,
  parseIKEDeviceReset,
  parseIKELanguageRegion,
  parseIKENumeric,
  parseIKEOBCRemoteConfig,
  parseIKEOBCStatus,
  parseIKEOBCText,
  parseIKERedundantData,
  parseIKEReplicateData,
  parseOdometer,
  parseSensors,
  parseSpeedRpm,
  parseTemperature,
  type SensorsState,
  type SpeedRpm,
  type Temperature,
} from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

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
  /** Most recent `0x1F` GPS time pushed in by the navigation computer. */
  gpsTime: GPSTime | undefined
  /** Most recent `0x15` language & region broadcast (IKE → broadcast or GT → IKE). */
  languageRegion: IKELanguageRegion | undefined
  /** Most recent `0x2A` OBC status broadcast to displays. */
  obcStatus: IKEOBCStatus | undefined
  /** Most recent `0x42` remote-control config (IKE ↔ GT). */
  obcRemoteConfig: IKEOBCRemoteConfig | undefined
  /** Most recent `0x57` cluster-button broadcast. */
  lastClusterButton: IKEClusterButton | undefined
  /** Most recent `0x54` redundant-data response (LCM → IKE). */
  redundantData: IKERedundantData | undefined
  /** Most recent `0x1C` device-reset addressed to the IKE. */
  deviceReset: IKEDeviceReset | undefined
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
  gpsTimeUpdate: GPSTime
  languageRegionUpdate: IKELanguageRegion
  obcStatusUpdate: IKEOBCStatus
  obcRemoteConfigUpdate: IKEOBCRemoteConfig
  clusterButton: IKEClusterButton
  redundantDataUpdate: IKERedundantData
  deviceReset: IKEDeviceReset
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
    gpsTime: undefined,
    languageRegion: undefined,
    obcStatus: undefined,
    obcRemoteConfig: undefined,
    lastClusterButton: undefined,
    redundantData: undefined,
    deviceReset: undefined,
  }

  get state(): Readonly<IKEState> {
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

  /** Frames originating at the IKE: broadcasts of state, OBC text, and replicate data. */
  private handleOutbound(message: IKBusMessage): void {
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
      case CMD_IKE_LANGUAGE_REGION: {
        const lr = parseIKELanguageRegion(message)
        this._state = { ...this._state, languageRegion: lr }
        this.events.emit('languageRegionUpdate', lr)
        break
      }
      case CMD_IKE_OBC_STATUS: {
        const status = parseIKEOBCStatus(message)
        this._state = { ...this._state, obcStatus: status }
        this.events.emit('obcStatusUpdate', status)
        break
      }
      case CMD_IKE_OBC_REMOTE_CONFIG: {
        const config = parseIKEOBCRemoteConfig(message)
        this._state = { ...this._state, obcRemoteConfig: config }
        this.events.emit('obcRemoteConfigUpdate', config)
        break
      }
      case CMD_IKE_CLUSTER_BUTTON: {
        const btn = parseIKEClusterButton(message)
        this._state = { ...this._state, lastClusterButton: btn }
        this.events.emit('clusterButton', btn)
        break
      }
    }
  }

  /**
   * Frames addressed *to* the IKE.  We mirror writes so consumers can observe
   * what's on the cluster, regardless of which other device sent the write.
   */
  private handleInbound(message: IKBusMessage): void {
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
      case CMD_GPS_TIME: {
        const gpsTime = parseGPSTime(message)
        this._state = { ...this._state, gpsTime }
        this.events.emit('gpsTimeUpdate', gpsTime)
        break
      }
      case CMD_IKE_LANGUAGE_REGION_REQUEST: {
        // No payload to decode beyond the command byte itself.  Just
        // surface that someone asked the cluster to re-broadcast its
        // settings.  Consumers usually want this so they can replay
        // the matching 0x15 response in active mode.
        break
      }
      case CMD_IKE_REDUNDANT_DATA: {
        const r = parseIKERedundantData(message)
        this._state = { ...this._state, redundantData: r }
        this.events.emit('redundantDataUpdate', r)
        break
      }
      case CMD_DEVICE_RESET: {
        const reset = parseIKEDeviceReset(message)
        this._state = { ...this._state, deviceReset: reset }
        this.events.emit('deviceReset', reset)
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

  /** Send a `0x14` request asking the IKE to re-broadcast its language/region. */
  async requestLanguageRegion(source = DEVICE_ADDRESSES.DIA): Promise<void> {
    await this.sender.send(buildIKELanguageRegionRequest({ source }))
  }

  /**
   * Broadcast a `0x2A` OBC-status frame as if from the IKE.  Defaults to
   * "all off"; pass partial flags to set just the bits you care about.
   */
  async broadcastOBCStatus(flags: Parameters<typeof buildIKEOBCStatus>[0] = {}): Promise<void> {
    await this.sender.send(buildIKEOBCStatus({ source: this.address, ...flags }))
  }

  /** Send a `0x42` OBC remote-control config from IKE → GT. */
  async sendOBCRemoteConfig(slots: ReadonlyArray<number>): Promise<void> {
    await this.sender.send(buildIKEOBCRemoteConfig({ source: this.address, slots }))
  }

  /**
   * Broadcast a `0x57` cluster button press as if from the IKE.  Defaults
   * to a press; pass `'release'` for the release frame.
   */
  async sendClusterButton(
    button: IKEClusterButtonName,
    state: 'press' | 'release' = 'press',
  ): Promise<void> {
    await this.sender.send(buildIKEClusterButton({ source: this.address, button, state }))
  }

  /** Send a `0x53` redundant-data request to the LCM. */
  async requestRedundantData(destination = DEVICE_ADDRESSES.LCM): Promise<void> {
    await this.sender.send(buildIKERedundantDataRequest({ source: this.address, destination }))
  }

  /** Send a `0x1C` device-reset broadcast (defaults to the canonical `[0x1C, 0x00]`). */
  async sendDeviceReset(): Promise<void> {
    await this.sender.send(buildIKEDeviceReset({ source: this.address }))
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
  requestLanguageRegion: {
    label: 'Request language & region',
    description: 'Asks the IKE to re-broadcast its 0x15 language/region settings.',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestLanguageRegion(),
  },
  requestRedundantData: {
    label: 'Request LCM redundant data',
    description: 'IKE → LCM 0x53 request for VIN + mileage + SII data.',
    params: {},
    invoke: async (d: IKE, _args: object) => d.requestRedundantData(),
  },
  sendCheckButton: {
    label: 'Send CHECK button press',
    description: 'Broadcasts a 0x57 CHECK button press as if from the cluster.',
    requires: 'active',
    params: {
      state: {
        kind: 'enum',
        values: ['press', 'release'] as const,
        label: 'Press/release',
        default: 'press',
      },
    },
    invoke: async (d: IKE, args: { state: 'press' | 'release' }) =>
      d.sendClusterButton('CHECK', args.state),
  },
  sendStalkBC: {
    label: 'Send BC stalk button',
    description: 'Broadcasts a 0x57 BC stalk button press from the cluster.',
    requires: 'active',
    params: {
      state: {
        kind: 'enum',
        values: ['press', 'release'] as const,
        label: 'Press/release',
        default: 'press',
      },
    },
    invoke: async (d: IKE, args: { state: 'press' | 'release' }) =>
      d.sendClusterButton('STALK_BC', args.state),
  },
  sendDeviceReset: {
    label: 'Broadcast device reset',
    description: 'Send the navcoder-canonical 0x1C 0x00 "device reset" broadcast.',
    requires: 'active',
    params: {},
    invoke: async (d: IKE, _args: object) => d.sendDeviceReset(),
  },
} as const satisfies ControlsManifest<IKE>
