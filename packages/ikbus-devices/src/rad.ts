import {
  buildRADEqUpdate,
  buildRADNGStationListChunk,
  buildRADToneSelect,
  buildScreenMode,
  buildTitleText,
  CMD_RAD_EQ,
  CMD_RAD_INPUT_SOURCE,
  CMD_RAD_NG_STATION_LIST,
  CMD_RAD_TONE_SELECT,
  parseRADEqUpdate,
  parseRADInputSource,
  parseRADNGStationList,
  parseRADToneSelect,
  parseScreenMode,
  parseTitleText,
  type RADEqUpdate,
  type RADInputSource,
  type RADNGStationList,
  type RADNGStationListEntry,
  type RADToneSelect,
  type ScreenMode,
  type TitleText,
} from '@emdzej/ibusx-commands'
import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type IBusMessage } from '@emdzej/ibusx-protocol'

const CMD_TITLE_TEXT = 0x23
const CMD_SCREEN_MODE = 0x46

export interface RADState {
  lastTitleText: TitleText | undefined
  lastScreenMode: ScreenMode | undefined
  /** Most recent EQ-update (Balance / Bass / Fader / Treble). */
  eq: RADEqUpdate | undefined
  /** Most recent Tone/Select frame (`0x37`). */
  toneSelect: RADToneSelect | undefined
  /** Most recent NG station-list frame (BM54 split-screen). */
  ngStationList: RADNGStationList | undefined
  /** Most recent input-source switch from the GT (`0x4E`). */
  lastInputSource: RADInputSource | undefined
}

export type RADEvents = {
  titleTextUpdate: TitleText
  screenModeUpdate: ScreenMode
  eqUpdate: RADEqUpdate
  toneSelectUpdate: RADToneSelect
  ngStationListUpdate: RADNGStationList
  inputSourceChanged: RADInputSource
}

/**
 * Radio twin.  Observes the radio's outbound frames (`0x23` title-text,
 * `0x46` screen-mode, `0x36` EQ, `0x37` Tone/Select, `0xD4` NG station
 * list) and inbound writes (`0x4E` input source).
 */
export class RAD extends Device<RADState, RADEvents> {
  readonly address = DEVICE_ADDRESSES.RAD
  readonly name = 'RAD'

  private _state: RADState = {
    lastTitleText: undefined,
    lastScreenMode: undefined,
    eq: undefined,
    toneSelect: undefined,
    ngStationList: undefined,
    lastInputSource: undefined,
  }
  get state(): Readonly<RADState> {
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
      case CMD_TITLE_TEXT: {
        const tt = parseTitleText(message)
        this._state = { ...this._state, lastTitleText: tt }
        this.events.emit('titleTextUpdate', tt)
        break
      }
      case CMD_SCREEN_MODE: {
        const sm = parseScreenMode(message)
        this._state = { ...this._state, lastScreenMode: sm }
        this.events.emit('screenModeUpdate', sm)
        break
      }
      case CMD_RAD_EQ: {
        const eq = parseRADEqUpdate(message)
        this._state = { ...this._state, eq }
        this.events.emit('eqUpdate', eq)
        break
      }
      case CMD_RAD_TONE_SELECT: {
        const ts = parseRADToneSelect(message)
        this._state = { ...this._state, toneSelect: ts }
        this.events.emit('toneSelectUpdate', ts)
        break
      }
      case CMD_RAD_NG_STATION_LIST: {
        const list = parseRADNGStationList(message)
        this._state = { ...this._state, ngStationList: list }
        this.events.emit('ngStationListUpdate', list)
        break
      }
    }
  }

  private handleInbound(message: IBusMessage): void {
    const cmd = message.payload[0]
    if (cmd === CMD_RAD_INPUT_SOURCE) {
      const src = parseRADInputSource(message)
      this._state = { ...this._state, lastInputSource: src }
      this.events.emit('inputSourceChanged', src)
    }
  }

  /** Write display text to the GT.  Useful for active-mode debugging / demos. */
  async writeTitleText(text: string, layoutByte = 0x40, optionsByte = 0x20): Promise<void> {
    await this.sender.send(buildTitleText({ source: this.address, layoutByte, optionsByte, text }))
  }

  /** Claim foreground on the GT. */
  async claimForeground(): Promise<void> {
    await this.sender.send(buildScreenMode({ source: this.address, priorityRad: true }))
  }

  /** Yield foreground to the GT. */
  async yieldForeground(): Promise<void> {
    await this.sender.send(buildScreenMode({ source: this.address, priorityGt: true }))
  }

  /** Broadcast a `0x36` EQ update from the radio. */
  async sendEQUpdate(property: number, rawValue: number): Promise<void> {
    await this.sender.send(buildRADEqUpdate({ source: this.address, property, rawValue }))
  }

  /** Broadcast a `0x37` Tone/Select frame. */
  async sendToneSelect(controlByte: number, extra: ReadonlyArray<number> = []): Promise<void> {
    await this.sender.send(buildRADToneSelect({ source: this.address, controlByte, extra }))
  }

  /** Broadcast a `0xD4` STATION_LIST chunk (BM54 FMD mode). */
  async sendNGStationListChunk(
    totalStationCount: number,
    msgIndex: number,
    entries: ReadonlyArray<RADNGStationListEntry>,
  ): Promise<void> {
    await this.sender.send(
      buildRADNGStationListChunk({
        source: this.address,
        totalStationCount,
        msgIndex,
        entries,
      }),
    )
  }
}

export const RADControls = {
  writeTitleText: {
    label: 'Write title text',
    requires: 'active',
    params: {
      text: { kind: 'string', label: 'Text', default: 'ibusx' },
    },
    invoke: async (d: RAD, args: { text: string }) => d.writeTitleText(args.text),
  },
  claimForeground: {
    label: 'Claim foreground (radio priority)',
    requires: 'active',
    params: {},
    invoke: async (d: RAD, _args: object) => d.claimForeground(),
  },
  yieldForeground: {
    label: 'Yield foreground (GT priority)',
    requires: 'active',
    params: {},
    invoke: async (d: RAD, _args: object) => d.yieldForeground(),
  },
} as const satisfies ControlsManifest<RAD>
