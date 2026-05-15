# @emdzej/ibusx-core

The runtime framework for `ibusx` — `IBus`, `Vehicle`, `Device`, transports, and the typed-emitter pattern. Built on top of [`@emdzej/ibusx-protocol`](../protocol).

## What's in here

- **`IBus`** — orchestrator: owns a `Transport`, owns a `Vehicle`, registers devices, dispatches parsed frames.
- **`Vehicle`** — shared state object (chassis, buses, ignition, per-device variants) with typed events on change.
- **`Device<TState, TEvents>`** — abstract base for digital twins. Has typed state, typed events, a passive/active/disabled mode, and a reflective `ControlsManifest`.
- **`Transport`** — interface for byte I/O. Concrete implementations live in `@emdzej/ibusx-transport-*` packages.
- **`MemoryTransport`** — an in-process transport for tests and dual-bus scenarios. Supports `pair()` and `loopback`.
- **`TypedEmitter<EventMap>`** — small typed event emitter with `void`-payload support (`emit('open')`).
- **`ControlsManifest`** — descriptor type for device controls (used by CLI / TUI / web to render actions generically).

## Quick example

```ts
import { IBus, Vehicle, MemoryTransport, Device, TypedEmitter } from '@emdzej/ibusx-core'

type SpeedState = { kmh: number; rpm: number }
type SpeedEvents = { update: SpeedState }

class IKE extends Device<SpeedState, SpeedEvents> {
  readonly address = 0x80
  readonly name = 'IKE'
  private _state: SpeedState = { kmh: 0, rpm: 0 }
  get state() { return this._state }
  handle(message) {
    if (message.payload[0] === 0x18) {
      this._state = { kmh: message.payload[1]! * 2, rpm: message.payload[2]! * 100 }
      this.events.emit('update', this._state)
    }
  }
}

const bus = new IBus(new MemoryTransport(), new Vehicle({ chassis: 'E39' }))
const ike = bus.registerDevice(new IKE())
ike.events.on('update', (s) => console.log(`${s.kmh} km/h @ ${s.rpm} rpm`))
await bus.start()
```

## What's not in here (yet)

- **TX timing** — the 8 ms idle-wait / 790 ms loopback / 3-retry ARQ from the link layer is documented in [`docs/protocol/link-and-timing.md`](../../docs/protocol/link-and-timing.md) but not yet implemented; `IBus.send` writes directly to the transport. Real serial transports will need a queue layer added.
- **Active-mode safety arming** — flagged in the architecture; not yet wired in.
- **Per-bus instances on K+I chassis** — supported by design (share a `Vehicle`) but not exercised yet.
