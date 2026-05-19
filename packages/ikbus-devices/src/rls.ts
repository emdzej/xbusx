import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { type LightSensorState, parseLightSensor } from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

const CMD_LIGHT_SENSOR = 0x59

export interface RLSState {
  light: LightSensorState | undefined
}

export type RLSEvents = {
  lightUpdate: LightSensorState
}

/** Rain / Light Sensor twin.  Parses the `0x59` ambient-light status frame to LCM. */
export class RLS extends Device<RLSState, RLSEvents> {
  readonly address = DEVICE_ADDRESSES.RLS
  readonly name = 'RLS'

  private _state: RLSState = { light: undefined }
  get state(): Readonly<RLSState> {
    return this._state
  }

  handle(message: IKBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload[0] !== CMD_LIGHT_SENSOR) return
    const light = parseLightSensor(message)
    this._state = { ...this._state, light }
    this.events.emit('lightUpdate', light)
  }
}

export const RLSControls = {} as const satisfies ControlsManifest<RLS>
