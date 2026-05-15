# @emdzej/ibusx-devices

Device twins for the BMW I/K-bus.  Each twin is a subclass of `Device` from [`@emdzej/ibusx-core`](../core), with:

- a **typed `state`** object updated from observed frames
- a **typed `events`** emitter for semantic state changes
- a **`controls` manifest** describing actions a user can invoke (rendered by CLI / TUI / web)
- a **`mode`** field — `passive` (observe only), `active` (also emit), or `disabled`

## What's in here so far

| Class | Address | Role | Mode |
|---|---|---|---|
| `IKE` | `0x80` | Instrument cluster — parses ignition, sensors, speed/RPM, temperature, odometer from IKE broadcasts.  Mirrors ignition into `Vehicle.setIgnition()`. | passive observer |
| `MFL` | `0x50` | Multifunction steering wheel — input-only device with controls for FORWARD / BACK / RT / VOICE buttons (press/hold/release) and volume up/down.  Internal R/T toggle routes button events to RAD or TEL. | active |

GM, LCM, RAD, BMBT, MID, GT, CDC, TEL twins to come.

## Quick example

```ts
import { IBus, Vehicle, MemoryTransport } from '@emdzej/ibusx-core'
import { IKE, MFL, MFLControls } from '@emdzej/ibusx-devices'

const bus = new IBus(new MemoryTransport(), new Vehicle({ chassis: 'E39' }))

const ike = bus.registerDevice(new IKE())
ike.events.on('ignitionChanged', (state) => console.log(`Ignition: ${state}`))
ike.events.on('speedRpmUpdate', ({ kmh, rpm }) => console.log(`${kmh} km/h @ ${rpm} rpm`))

const mfl = bus.registerDevice(new MFL())
mfl.mode = 'active'   // we're going to emit MFL frames

await bus.start()

// Press the volume-up button
await MFLControls.volumeUp.invoke(mfl, {})

// Or call the typed method directly
await mfl.pressButton('FORWARD')
```
