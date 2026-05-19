import { type ControlsManifest, Device } from '@emdzej/ibusx-core'
import { buildMIDButton, type MIDButtonEvent, parseMIDButton } from '@emdzej/ikbus-commands'
import { DEVICE_ADDRESSES, type IKBusMessage } from '@emdzej/ikbus-protocol'

const CMD_BUTTON = 0x31

export interface MIDState {
  lastButton: MIDButtonEvent | undefined
}

export type MIDEvents = {
  buttonPress: MIDButtonEvent
}

/**
 * Multi-Info Display twin.  Currently exposes only the `0x31` button-press
 * event observation.  Full UI render commands (`0x21`, `0x23`, `0x24`,
 * `0xA5`) are documented in `docs/devices/mid.md` and will be added later.
 */
export class MID extends Device<MIDState, MIDEvents> {
  readonly address = DEVICE_ADDRESSES.MID
  readonly name = 'MID'

  private _state: MIDState = { lastButton: undefined }
  get state(): Readonly<MIDState> {
    return this._state
  }

  handle(message: IKBusMessage): void {
    if (message.source !== this.address) return
    if (message.payload[0] !== CMD_BUTTON) return
    const evt = parseMIDButton(message)
    this._state = { ...this._state, lastButton: evt }
    this.events.emit('buttonPress', evt)
  }

  /** Emit a `0x31` button press to a target (default RAD). */
  async pressButton(layoutByte: number, data: ReadonlyArray<number> = []): Promise<void> {
    await this.sender.send(buildMIDButton({ source: this.address, layoutByte, data }))
  }
}

export const MIDControls = {
  pressButton: {
    label: 'Send button press',
    description:
      'Emit a 0x31 frame with the given layout byte (low-level — see docs/devices/mid.md).',
    requires: 'active',
    params: {
      layoutByte: { kind: 'number', min: 0, max: 255, default: 0 },
    },
    invoke: async (d: MID, args: { layoutByte: number }) => d.pressButton(args.layoutByte),
  },
} as const satisfies ControlsManifest<MID>
