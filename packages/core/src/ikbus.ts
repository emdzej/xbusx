import { type DeviceAddress, encode, FrameStream, type IBusMessage } from '@emdzej/ibusx-protocol'
import type { Device } from './device.js'
import { TypedEmitter } from './emitter.js'
import { DuplicateDeviceError } from './errors.js'
import type { FrameSender } from './sender.js'
import type { Transport } from './transport.js'
import { Vehicle } from './vehicle.js'

export type IBusEvents = {
  /** Every successfully-parsed inbound frame. */
  frame: IBusMessage
  /** Every frame this IBus emitted (after enqueue, before transport.write). */
  txFrame: IBusMessage
  /** Transport, parser, or handler errors.  IBus catches handler exceptions
   *  so a single bad device can't crash the dispatch loop. */
  error: Error
}

/**
 * The orchestrator.  Reads bytes from a `Transport`, parses them via
 * `FrameStream`, dispatches frames to registered devices, and provides the
 * `FrameSender` they use to emit frames back.  Owns a `Vehicle` for shared
 * cross-device state.
 *
 * One `IBus` instance per physical bus.  On K+I chassis, create two and pass
 * them the same `Vehicle`.
 */
export class IBus implements FrameSender {
  readonly transport: Transport
  readonly vehicle: Vehicle
  readonly events: TypedEmitter<IBusEvents>

  private readonly devicesByAddress = new Map<DeviceAddress, Device>()
  private readonly devicesList: Device[] = []
  private readonly stream = new FrameStream()
  private timeoutTimer: ReturnType<typeof setInterval> | undefined
  private started = false

  constructor(transport: Transport, vehicle: Vehicle = new Vehicle()) {
    this.transport = transport
    this.vehicle = vehicle
    this.events = new TypedEmitter<IBusEvents>()

    transport.events.on('data', this.onData)
    transport.events.on('error', this.onTransportError)
  }

  registerDevice<D extends Device>(device: D): D {
    if (this.devicesByAddress.has(device.address)) {
      throw new DuplicateDeviceError(device.address)
    }
    device.attach(this.vehicle, this)
    this.devicesByAddress.set(device.address, device)
    this.devicesList.push(device)
    return device
  }

  /** Look up a registered device by address.  Returns `undefined` if absent. */
  device<D extends Device = Device>(address: DeviceAddress): D | undefined {
    return this.devicesByAddress.get(address) as D | undefined
  }

  /** All registered devices in registration order. */
  get devices(): readonly Device[] {
    return this.devicesList
  }

  /**
   * Send a frame.  Implements `FrameSender`.
   *
   * The current implementation writes directly to the transport — there is no
   * TX queue yet.  Real serial transports will need a queue layer added (see
   * `docs/protocol/link-and-timing.md` for the 8 ms idle wait / ARQ rules).
   */
  async send(message: IBusMessage): Promise<void> {
    this.events.emit('txFrame', message)
    await this.transport.write(encode(message))
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.transport.open()
    // Periodic idle-timeout check so partial buffers are flushed when the
    // wire goes quiet mid-frame.  25 ms is well under the 71 ms timeout.
    this.timeoutTimer = setInterval(() => this.stream.tickTimeout(), 25)
    this.started = true
  }

  async stop(): Promise<void> {
    if (!this.started) return
    if (this.timeoutTimer !== undefined) {
      clearInterval(this.timeoutTimer)
      this.timeoutTimer = undefined
    }
    await this.transport.close()
    this.started = false
  }

  private onData = (chunk: Uint8Array): void => {
    const frames = this.stream.feed(chunk)
    for (const message of frames) {
      this.dispatchFrame(message)
    }
  }

  private onTransportError = (err: Error): void => {
    this.events.emit('error', err)
  }

  private dispatchFrame(message: IBusMessage): void {
    this.events.emit('frame', message)
    for (const device of this.devicesList) {
      if (device.mode === 'disabled') continue
      if (!device.interestedIn(message)) continue
      try {
        device.handle(message)
      } catch (err) {
        this.events.emit('error', err instanceof Error ? err : new Error(String(err)))
      }
    }
  }
}
