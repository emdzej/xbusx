# @emdzej/ibusx-protocol

The byte-level protocol primitives for BMW I-Bus and K-Bus. Pure functions, no state, no I/O.

## What's in here

- **`encode` / `decode`** — single-frame serialisation and parsing.
- **`FrameStream`** — stateful streaming decoder for chunked byte input.
- **`computeChecksum` / `verifyChecksum`** — the XOR checksum scheme.
- **`DEVICE_ADDRESSES` / `addressName` / `parseAddress`** — canonical address table and helpers.
- **`ProtocolError`** subclasses for structured failure reporting.
- **Wire constants** — `IBUS_MAX_MSG_LENGTH`, `IBUS_RX_BUFFER_TIMEOUT_MS`, etc.

## Frame layout

```
+-----+-----+-----+---------- ... ----------+-----+
| SRC | LEN | DST |    DATA (1..43 bytes)   | XOR |
+-----+-----+-----+---------- ... ----------+-----+
```

`LEN` = bytes after the LEN byte = `DST + DATA + XOR` = `payload.length + 2`.

See [`docs/protocol/framing.md`](../../docs/protocol/framing.md) for the full specification.

## Quick example

```ts
import { encode, decode, FrameStream } from '@emdzej/ibusx-protocol'

// Encode an IKE → broadcast ignition status (KL-30 = off)
const bytes = encode({
  source: 0x80,
  destination: 0xbf,
  payload: new Uint8Array([0x11, 0x00]),
  checksum: 0,
})
// → Uint8Array [0x80, 0x04, 0xbf, 0x11, 0x00, 0x2a]

// Decode a single frame
const msg = decode(bytes)
// → { source: 0x80, destination: 0xbf, payload: Uint8Array([0x11, 0x00]), checksum: 0x2a }

// Or stream bytes as they arrive on the wire
const stream = new FrameStream()
const frames = stream.feed(bytes)
// → [ { source: 0x80, ... } ]
```
