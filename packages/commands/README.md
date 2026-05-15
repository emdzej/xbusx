# @emdzej/ibusx-commands

Per-command codecs (parsers and builders) for BMW I/K-bus frames.  Built on top of [`@emdzej/ibusx-protocol`](../protocol); consumed by [`@emdzej/ibusx-devices`](../devices) and apps.

Each codec is pure: a `parse<X>(message)` function takes an `IBusMessage` and returns a typed domain object, and a `build<X>(args)` function does the reverse.  Validation throws typed `CommandError` subclasses.

## What's in here so far

IKE-emitted commands only in this first cut:

| Cmd | Direction | Codec module |
|---|---|---|
| `0x10` / `0x11` | any → IKE / IKE → broadcast | [`ike/ignition`](src/ike/ignition.ts) |
| `0x12` / `0x13` | any → IKE / IKE → broadcast | [`ike/sensors`](src/ike/sensors.ts) — handles both 3-byte IKE and 7-byte IKI payloads |
| `0x16` / `0x17` | any → IKE / IKE → broadcast | [`ike/odometer`](src/ike/odometer.ts) |
| `0x18` | IKE → broadcast | [`ike/speed-rpm`](src/ike/speed-rpm.ts) |
| `0x19` / `0x1d` | IKE → broadcast / any → IKE | [`ike/temperature`](src/ike/temperature.ts) — handles signed ambient |

MFL, GM, CDC, RAD, LCM, GT, TEL codecs to come.

## Quick example

```ts
import { encode, decode } from '@emdzej/ibusx-protocol'
import { parseIgnitionStatus, buildIgnitionStatus } from '@emdzej/ibusx-commands'

// Parse an incoming frame
const message = decode(new Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x03, 0x29]))
const state = parseIgnitionStatus(message)
// → 'KL_15'

// Build the reverse — IKE → broadcast at KL-15
const out = buildIgnitionStatus({ state: 'KL_15' })
// source defaults to IKE, destination to GLO
const bytes = encode(out)
// → Uint8Array([0x80, 0x04, 0xbf, 0x11, 0x03, 0x29])
```
