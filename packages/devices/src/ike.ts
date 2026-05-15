import {
  buildIgnitionRequest,
  buildOdometerRequest,
  buildSensorsRequest,
  buildTemperatureRequest,
  type IgnitionState,
  parseIgnitionStatus,
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
}

export type IKEEvents = {
  ignitionChanged: IgnitionState
  sensorsUpdate: SensorsState
  speedRpmUpdate: SpeedRpm
  temperatureUpdate: Temperature
  odometerUpdate: number
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
  }

  get state(): Readonly<IKEState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    // Only parse frames the IKE itself broadcasts.  Requests addressed to the
    // IKE are inputs for an active-mode twin — handled separately below.
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
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
} as const satisfies ControlsManifest<IKE>
