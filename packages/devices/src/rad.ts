import {
  buildScreenMode,
  buildTitleText,
  parseScreenMode,
  parseTitleText,
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
}

export type RADEvents = {
  titleTextUpdate: TitleText
  screenModeUpdate: ScreenMode
}

/**
 * Radio twin.  Passively observes outgoing title-text (`0x23`) and
 * screen-mode (`0x46`) frames.  Active-mode controls let scripts emit title
 * text or assert UI priority on the bus.
 */
export class RAD extends Device<RADState, RADEvents> {
  readonly address = DEVICE_ADDRESSES.RAD
  readonly name = 'RAD'

  private _state: RADState = { lastTitleText: undefined, lastScreenMode: undefined }
  get state(): Readonly<RADState> {
    return this._state
  }

  handle(message: IBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload.length < 1) return
    const cmd = message.payload[0]
    if (cmd === CMD_TITLE_TEXT) {
      const tt = parseTitleText(message)
      this._state = { ...this._state, lastTitleText: tt }
      this.events.emit('titleTextUpdate', tt)
    } else if (cmd === CMD_SCREEN_MODE) {
      const sm = parseScreenMode(message)
      this._state = { ...this._state, lastScreenMode: sm }
      this.events.emit('screenModeUpdate', sm)
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
