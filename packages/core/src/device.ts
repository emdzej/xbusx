import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'
import { type EventMap, TypedEmitter } from './emitter.js'
import type { FrameSender } from './sender.js'
import type { Vehicle } from './vehicle.js'

export type DeviceMode = 'passive' | 'active' | 'disabled'

const BROADCAST_OR_MULTICAST = new Set<DeviceAddress>([
  DEVICE_ADDRESSES.GLO,
  DEVICE_ADDRESSES.LOC,
  DEVICE_ADDRESSES.ANZV,
])

/**
 * Base class for digital twins of bus devices.  Subclasses describe a single
 * device family (e.g. IKE, MFL, LCM) with:
 *
 *   - a fixed `address` and `name`
 *   - a typed `state` object
 *   - a typed `events` emitter for semantic state changes
 *   - a `handle(message)` method that parses incoming frames
 *   - optionally a `controls` static for the reflective control surface
 *
 * Devices are attached to an `IBus` via `IBus.registerDevice()`.  That call
 * passes the shared `Vehicle` context and a `FrameSender` the device uses to
 * emit frames (when in `active` mode).
 */
export abstract class Device<TState extends object = object, TEvents extends EventMap = EventMap> {
  abstract readonly address: DeviceAddress
  abstract readonly name: string
  abstract readonly state: Readonly<TState>

  readonly events: TypedEmitter<TEvents>
  mode: DeviceMode = 'passive'

  protected vehicle!: Vehicle
  protected sender!: FrameSender

  constructor() {
    this.events = new TypedEmitter<TEvents>()
  }

  /** Wire the device into an IBus.  Called by `IBus.registerDevice()`. */
  attach(vehicle: Vehicle, sender: FrameSender): void {
    this.vehicle = vehicle
    this.sender = sender
    this.onAttach()
  }

  /** Hook fired after `attach()`.  Override to subscribe to vehicle events,
   *  request initial state, etc. */
  protected onAttach(): void {}

  /**
   * Should this device's `handle()` be called for `message`?
   *
   * Default: yes if the device is `SRC` or `DST`, or the message goes to
   * `GLO`/`LOC`/`ANZV` broadcast/multicast.  Subclasses can override (e.g. a
   * logger device returns `true` always).
   */
  interestedIn(message: IBusMessage): boolean {
    return (
      message.source === this.address ||
      message.destination === this.address ||
      BROADCAST_OR_MULTICAST.has(message.destination)
    )
  }

  /**
   * Parse a frame and update internal state / emit semantic events.
   *
   * Called only when `interestedIn(message)` returned true and the device's
   * mode is not `disabled`.  Subclasses implement the parsing.
   */
  abstract handle(message: IBusMessage): void
}
