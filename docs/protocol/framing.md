# Frame format

**Status:** Draft.

Every message on the I-Bus or K-Bus is a single contiguous frame transmitted as bytes over a 9600 baud single-wire UART. Frames are atomic at the protocol level — there is no concept of a fragmented or multi-frame transfer.

Timing, arbitration, and collision behaviour are documented separately in [`link-and-timing`](link-and-timing.md). This page covers only the byte-level frame structure.

## Frame structure

```
+-----+-----+-----+---------- ... ----------+-----+
| SRC | LEN | DST |    DATA (1..43 bytes)   | XOR |
+-----+-----+-----+---------- ... ----------+-----+
  1B    1B    1B          n bytes             1B
```

| Byte    | Field | Meaning |
|---------|-------|---------|
| 0       | `SRC` | Source device address (the device that originated the frame). |
| 1       | `LEN` | Frame-length field. See below for semantics. |
| 2       | `DST` | Destination device address. |
| 3 … *n* | `DATA` | Payload bytes. The **first byte (index 3)** is the **command byte**; the remaining bytes are command parameters. Per-message semantics are documented per device under [`devices/`](../devices/README.md). |
| last    | `XOR` | Frame checksum (XOR of every preceding byte). |

The smallest valid frame is **5 bytes** (`SRC LEN DST CMD XOR` — one command byte, no parameters). The largest is **47 bytes**.

## Length field semantics

The `LEN` byte holds the number of bytes that follow it in the frame. That count includes the destination, the entire payload, and the checksum — but **not** `SRC` or `LEN` itself.

The derived relationships are:

- **Total frame length** = `LEN + 2`
- **`DATA` length** = `LEN − 2` (one byte for `DST` plus one for `XOR` accounts for the difference)
- For a payload of length *p* (command byte plus parameters): `LEN = p + 2`

> *Sources:*
> - BlueBus `ibus.c:1235`: `msg[1] = dataSize + 2;` — where `dataSize` is the count of bytes from the command byte through the last parameter.
> - bimmerz `protocol.ts:43`: `result[1] = message.payload.length + 2;` — same semantics; bimmerz's `payload` corresponds to BlueBus's `data`.
> - Wilhelm `guide.md:55`: example frame `80 06 BF 13 03 00 00 29` has `LEN=0x06`, total length 8 bytes, payload `13 03 00 00` (4 bytes) ⇒ `LEN = payload + 2`. Agreed.

This convention contrasts with the **D-Bus** frame, which has no `SRC` byte and whose `LEN` covers the entire frame.

> *Note (out of scope, given for contrast):* bimmerz `protocol.ts:8–10` documents D-Bus as `DST LEN MSG CHK` where `LEN` is the length of the entire packet. Software that handles both protocols must keep their `LEN` definitions strictly separate.

## Checksum

The checksum is a single byte: the **bitwise XOR of every preceding byte** in the frame, including `SRC`, `LEN`, `DST`, and all payload bytes. It is *not* an additive sum, parity bit, CRC-8, or any other checksum scheme.

> *Sources:*
> - BlueBus `ibus.c:1240–1245`: loops from byte 0 through `msgSize−2`, XOR'ing each into a running `crc`, then writes `crc` at the last position.
> - bimmerz `protocol.ts:30–36`: same algorithm. `calculateChecksum` is `^=` over the range `[offset, length)`.
> - Wilhelm refers to it as "the XOR checksum" without further specification; example frames throughout `wilhelm-docs` verify against this algorithm. Agreed.

A receiver should compute the XOR of bytes `0` through `LEN` inclusive, then compare against byte `LEN + 1`. A mismatch means the frame is malformed and should be dropped.

### Worked example

A typical IKE ignition-status frame:

```
80 04 BF 11 00 2A
```

| Byte | Hex | Meaning |
|---|---|---|
| 0 | `80` | `SRC` = IKE (Instrument Cluster) |
| 1 | `04` | `LEN` = 4 ⇒ total frame length is 6 bytes |
| 2 | `BF` | `DST` = `GLO` (global broadcast) |
| 3 | `11` | `CMD` = ignition-status response |
| 4 | `00` | parameter = ignition OFF |
| 5 | `2A` | `XOR` = `0x80 ^ 0x04 ^ 0xBF ^ 0x11 ^ 0x00` = `0x2A` ✓ |

Verification: `0x80 ^ 0x04 = 0x84; ^ 0xBF = 0x3B; ^ 0x11 = 0x2A; ^ 0x00 = 0x2A`. ✓

> *Source:* Frame layout from Wilhelm `02.md` and `ike/11.md`; values consistent with BlueBus's `IBUS_CMD_IKE_IGN_STATUS_RESP` (`ibus.h:193`).

## Size bounds

| Bound | Value | Source |
|---|---|---|
| Smallest valid frame | 5 bytes | Implied by frame layout (one-byte command, no parameters). |
| Largest valid frame | **47 bytes** | BlueBus `ibus.h:650` (`IBUS_MAX_MSG_LENGTH 47`) with comment "`Src Len Dest Cmd Data[42 Byte Max] XOR`". |
| Largest `LEN` value | 45 | Derived: 47 − 2. |
| Largest payload (`CMD` + parameters) | 43 bytes | Derived: 47 − 4. |
| Largest parameter count (after `CMD`) | 42 bytes | BlueBus `ibus.h:650` comment "`Data[42 Byte Max]`". |

A frame whose `LEN` field implies a total length greater than 47 bytes should be treated as malformed.

> *Note:* BlueBus's encoder refuses to transmit such a frame (`ibus.c:1214–1217`: "Refuse to transmit frame of length %d"). It is unclear whether all production BMW devices enforce the same cap on receipt; treat the limit as conservative.

Wilhelm and bimmerz do not document a hard upper bound. bimmerz drops chunks larger than 500 bytes (`protocol.ts:155–159`), but as raw-buffer overflow protection, not as a protocol limit.

## On the wire

Frames are not separated by any framing character. They are transmitted back-to-back with whatever inter-frame gap the sender chose, subject to bus arbitration (see [`link-and-timing`](link-and-timing.md)).

A receiver synchronises to frames by:

1. Reading bytes into a buffer.
2. After each byte, attempting to interpret the buffer's leading bytes as a frame:
   - Treat byte 0 as `SRC`, byte 1 as `LEN`.
   - Discard byte 0 and retry from byte 1 if `LEN + 2 > 47` or `LEN < 3` — the buffer is unsynchronised.
   - If the buffer contains at least `LEN + 2` bytes, compute the XOR of bytes 0 through `LEN`; if it equals byte `LEN + 1`, a valid frame has been received.
3. Once a valid frame is dispatched, advance the buffer by `LEN + 2` bytes and continue.
4. If no new byte has arrived for ~71 ms, discard the buffer's contents on the assumption that the sender is no longer mid-frame.

> *Source:* This is the algorithm implemented in BlueBus `ibus.c:1080–1170` and, with slight differences, in bimmerz `protocol.ts:87–161`. Both agree on the core idea; BlueBus uses a 255-byte RX buffer with a 71 ms idle flush (`ibus.h:652, 655`), bimmerz uses a 500-byte overflow cap (`protocol.ts:155–159`).

## What is *not* in the frame

- **No start-of-frame byte.** No `0x55` preamble, no SOM marker. Framing is purely time-based at the link layer.
- **No length validity bit.** A `LEN` byte of `0x00`, `0x01`, or any value making the total length exceed 47 must be detected by the receiver during resynchronisation.
- **No frame-type field.** The command byte (`DATA[0]`) is the closest equivalent; it is interpreted **in the context of `DST` and frequently also `SRC`**, since the same command byte means different things depending on who is sending and who is receiving (see [`../message-index`](../message-index.md)).
- **No fragmentation.** Every frame stands alone. Multi-frame logical exchanges (a menu render on the GT, a CDC handshake) are sequences of independent frames at this layer.
