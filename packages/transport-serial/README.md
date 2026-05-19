# @emdzej/transport-serial

Node-side serial transport for `@emdzej/ibusx-core`.  Wraps [`serialport`](https://serialport.io) v13 with the I/K-bus defaults (9600 baud, 8 data bits, even parity, 1 stop bit) and exposes the `Transport` interface that `IKBus` consumes.

## Quick start

```ts
import { IKBus, Vehicle } from '@emdzej/ibusx-core'
import { SerialTransport, listSerialPorts } from '@emdzej/transport-serial'

console.log(await listSerialPorts())
// → [ { path: '/dev/ttyUSB0', manufacturer: 'FTDI', ... }, ... ]

const transport = new SerialTransport({ path: '/dev/ttyUSB0' })
const bus = new IKBus(transport, new Vehicle({ chassis: 'E39' }))
await bus.start()
```

The constructor accepts overrides for any of `baudRate` / `dataBits` / `parity` / `stopBits`, but you should rarely need them — the BMW I/K-bus is fixed at 9600 8E1.

## Hardware

You need a transceiver that converts the single-wire 12 V I/K-bus to UART TTL.  The Melexis TH3122 is the canonical chip; many off-the-shelf USB-to-IKBus adapters use it.  Tap point is typically the OBD-II port (chassis-dependent pinout).

See [`docs/protocol/physical.md`](../../docs/protocol/physical.md) for more on the physical layer.

## What's not here (yet)

- **TX timing enforcement.**  This transport writes bytes straight to the serial port.  The 8 ms inter-frame idle wait, 790 ms loopback timeout, and 3-retry ARQ from the protocol's link layer are not yet implemented.  Real bench testing may need them; for passive logging they're not required.
- **Connection-loss handling.**  The transport surfaces `close` and `error` events but does not automatically reconnect.  Callers wrap with their own retry logic.
