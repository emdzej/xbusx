import {
  buildGPSTime,
  buildNAVControl,
  buildNAVTelematicsLocation,
  buildNAVViewStatus,
  CMD_GPS_TIME,
  CMD_NAV_CONTROL,
  CMD_NAV_TELEMATICS_COORDINATES,
  CMD_NAV_TELEMATICS_LOCATION,
  CMD_NAV_VIEW_STATUS,
  type GPSTime,
  type NAVControl,
  type NAVTelematicsCoordinates,
  type NAVTelematicsLocation,
  type NAVViewStatus,
  parseGPSTime,
  parseNAVControl,
  parseNAVTelematicsCoordinates,
  parseNAVTelematicsLocation,
  parseNAVViewStatus,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

/**
 * Snapshot of the navigation computer's state, accumulated from its
 * broadcasts and the control frames sent to it.
 */
export interface NAVState {
  /** Most recent `0x1F` GPS time broadcast (NAV → IKE). */
  gpsTime: GPSTime | undefined
  /** Most recent `0xA2` telematics coordinates broadcast. */
  coordinates: NAVTelematicsCoordinates | undefined
  /** Most recent `0xA4` telematics location string. */
  location: NAVTelematicsLocation | undefined
  /** Most recent `0xAB` view-status broadcast (NAV → GTF). */
  viewStatus: NAVViewStatus | undefined
  /** Most recent inbound `0xAA` control frame (from SES / GTF). */
  lastControlIn: NAVControl | undefined
}

export type NAVEvents = {
  gpsTimeUpdate: GPSTime
  coordinatesUpdate: NAVTelematicsCoordinates
  locationUpdate: NAVTelematicsLocation
  viewStatusUpdate: NAVViewStatus
  controlIn: NAVControl
}

/**
 * Navigation Computer twin (NAV — address `0x7F`).
 *
 * Outbound (NAV → ...):
 *   0x1F  GPS time          → IKE (every minute when locked)
 *   0xA2  Telematics coords → TEL (BMW Assist support)
 *   0xA4  Telematics city/street → TEL
 *   0xAB  View status       → GTF (rear-screen graphics stage)
 *
 * Inbound (... → NAV):
 *   0xAA  Navigation Control (from SES or GTF — focus, map scale, POI)
 *
 * Sources: Wilhelm `nav/1f.md`, `nav/a2.md`, `nav/a4.md`, `nav/aa.md`,
 * `nav/ab.md`.
 */
export class NAV extends Device<NAVState, NAVEvents> {
  readonly address = DEVICE_ADDRESSES.NAV
  readonly name = 'NAV'

  private _state: NAVState = {
    gpsTime: undefined,
    coordinates: undefined,
    location: undefined,
    viewStatus: undefined,
    lastControlIn: undefined,
  }
  get state(): Readonly<NAVState> {
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

  private handleOutbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    switch (cmd) {
      case CMD_GPS_TIME: {
        const t = parseGPSTime(message)
        this._state = { ...this._state, gpsTime: t }
        this.events.emit('gpsTimeUpdate', t)
        break
      }
      case CMD_NAV_TELEMATICS_COORDINATES: {
        const c = parseNAVTelematicsCoordinates(message)
        this._state = { ...this._state, coordinates: c }
        this.events.emit('coordinatesUpdate', c)
        break
      }
      case CMD_NAV_TELEMATICS_LOCATION: {
        const l = parseNAVTelematicsLocation(message)
        this._state = { ...this._state, location: l }
        this.events.emit('locationUpdate', l)
        break
      }
      case CMD_NAV_VIEW_STATUS: {
        const v = parseNAVViewStatus(message)
        this._state = { ...this._state, viewStatus: v }
        this.events.emit('viewStatusUpdate', v)
        break
      }
    }
  }

  private handleInbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    if (cmd === CMD_NAV_CONTROL) {
      const c = parseNAVControl(message)
      this._state = { ...this._state, lastControlIn: c }
      this.events.emit('controlIn', c)
    }
  }

  /** Broadcast a `0x1F` GPS time frame to the IKE. */
  async sendGPSTime(args: Omit<Parameters<typeof buildGPSTime>[0], 'source'>): Promise<void> {
    await this.sender.send(buildGPSTime({ source: this.address, ...args }))
  }

  /** Send a `0xA4` telematics location string to the TEL. */
  async sendTelematicsLocation(
    args: Omit<Parameters<typeof buildNAVTelematicsLocation>[0], 'source'>,
  ): Promise<void> {
    await this.sender.send(buildNAVTelematicsLocation({ source: this.address, ...args }))
  }

  /** Broadcast a `0xAB` view-status frame to the GTF. */
  async sendViewStatus(
    args: Omit<Parameters<typeof buildNAVViewStatus>[0], 'source'>,
  ): Promise<void> {
    await this.sender.send(buildNAVViewStatus({ source: this.address, ...args }))
  }

  /** Send a `0xAA` control frame to the NAV (as if from the SES or GTF). */
  async sendControl(
    data: ReadonlyArray<number> | Uint8Array,
    source = DEVICE_ADDRESSES.SES,
  ): Promise<void> {
    await this.sender.send(buildNAVControl({ source, data }))
  }
}

export const NAVControls = {
  focusMap: {
    label: 'Focus map (from SES)',
    description: 'Sends 0xAA 0x04 0x00 — SES focus-map command.',
    requires: 'active',
    params: {},
    invoke: async (d: NAV, _args: object) => d.sendControl([0x04, 0x00]),
  },
  focusMenu: {
    label: 'Focus menu (from SES)',
    description: 'Sends 0xAA 0x02 0x00 — SES focus-menu command.',
    requires: 'active',
    params: {},
    invoke: async (d: NAV, _args: object) => d.sendControl([0x02, 0x00]),
  },
  poiPetrolHere: {
    label: 'POI: petrol at current location',
    requires: 'active',
    params: {},
    invoke: async (d: NAV, _args: object) => d.sendControl([0x20, 0x03]),
  },
  poiRestaurantsHere: {
    label: 'POI: restaurants at current location',
    requires: 'active',
    params: {},
    invoke: async (d: NAV, _args: object) => d.sendControl([0x20, 0x07]),
  },
} as const satisfies ControlsManifest<NAV>
