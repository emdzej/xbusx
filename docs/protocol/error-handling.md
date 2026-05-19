# Error handling

**Status:** Draft.

This page consolidates the protocol's failure modes — how a malformed frame, a collision, a timeout, or a missed loopback is detected and recovered from. Most of the mechanisms here are mentioned in passing on other pages; here they are gathered with the relevant log markers and recovery paths.

## Failure modes

| Failure | Detection | Log marker | Recovery |
|---|---|---|---|
| **Bad checksum** | Computed XOR ≠ received XOR byte. | (no specific log; frame silently dropped) | Receiver slides one byte and retries frame interpretation. Next valid sync point recovers. |
| **Length-field out of range** | `LEN < 3` or `LEN + 2 > IBUS_MAX_MSG_LENGTH (47)`. | — | Same: drop one byte, retry. |
| **RX idle timeout** | Buffer has bytes; no new byte for `IBUS_RX_BUFFER_TIMEOUT` (71 ms). | `ERR_TMO[<count>]` followed by hex dump. | Buffer flushed. Next bytes start a fresh attempt at synchronisation. |
| **RX overflow** | Buffer reaches `IBUS_RX_BUFFER_SIZE - 1` (254 bytes). | `ERR_TMO[<count>]`. | Buffer flushed. Same recovery. |
| **Collision during TX** | RX line goes busy mid-frame while transmitting. | `ERR_COL`. | TX aborted; receiver continues; sender backs off via `IBUS_TX_FRAME_IDLE_WAIT`. |
| **Missed loopback** | Transmitted frame not echoed back to RX within `IBUS_TX_LOOPBACK_TIMEOUT` (790 ms). | `ERR_RTX[<n>]` where `n` is the retry count. | Retry up to 3 times; then drop frame. |
| **TX buffer overflow** | Sender's ring buffer has all 23 usable slots full. | `IKBus: TX Buffer Overflow.` | Frame discarded by sender; never reaches the wire. |

> *Sources:* BlueBus `ibus.c:1100–1186` for the runtime paths; `ibus.c:1214–1217` for TX buffer-overflow handling.

## Checksum validation

The frame checksum is a single-byte XOR of every preceding byte (see [`framing.md`](framing.md#checksum)). A receiver computes:

```
crc = SRC ^ LEN ^ DST ^ DATA[0] ^ … ^ DATA[N-1]
```

and compares against the last byte of the frame (at index `LEN + 1`). A mismatch means the frame is malformed; the receiver does not signal the sender — it simply slides one byte forward in its RX buffer and retries the interpretation from the new offset.

> *Source:* bimmerz `protocol.ts:114–124` shows the slide-and-retry logic concisely; BlueBus's version is inlined into the frame-parsing pass.

Because the slide-and-retry can land on any byte boundary, a malformed frame will eventually be "consumed" as the receiver advances past it. The risk is that a malformed frame can be interpreted as the start of an unrelated valid-looking frame if it happens to satisfy the `LEN` constraint and have a valid XOR by chance. In practice this is extremely rare given an 8-bit checksum over up to 45 bytes, but it is not impossible — high-noise environments can produce false positives.

## RX timeout (`ERR_TMO`)

If the RX buffer holds bytes but no new byte has arrived within `IBUS_RX_BUFFER_TIMEOUT` (71 ms), the buffer is dumped and cleared. A typical log line:

```
[12345678] ERROR: IKBus: RX Buffer Timeout [4]: 80 04 BF 11
IKBus: ERR_TMO[4]
```

(BlueBus's log format from `ibus.c:1154–1166`.)

The hex dump captures whatever was in the buffer when the timeout fired — useful for debugging "I keep losing frames" complaints. Common causes:

- A frame whose `LEN` byte got corrupted to a much larger value, so the parser keeps waiting for bytes that never come.
- A genuine pause on the bus mid-frame (rare but possible during severe noise).
- Receiver clock drift causing the parser to count too few bytes and time out waiting for the rest.

## Collision (`ERR_COL`)

A sender that has begun transmitting and observes another device's bytes on the shared wire aborts immediately. The full handling:

```c
for (idx = 0; idx < msgLen; idx++) {
    if (IBUS_UART_STATUS != 0) {
        // Bus became active mid-transmission — abort
        txTimeout = IBUS_TX_TIMEOUT_ON;
        ibus->txLastStamp = TimerGetMillis();
        if (idx > 0) {
            LogRaw("IKBus: ERR_COL\r\n");
        }
        break;
    }
    ibus->uart.registers->uxtxreg = ibus->txBuffer[ibus->txBufferReadIdx][idx];
    while ((ibus->uart.registers->uxsta & (1 << 9)) != 0);
    txCount++;
}
```

> *Source:* BlueBus `ibus.c:1111–1128`.

Two observations:

1. **`ERR_COL` is only logged if at least one byte has already been transmitted.** Aborting before the first byte is just polite back-off, not a collision.
2. **The TX timestamp is reset** so that the loop's "8 ms idle wait" gate prevents an immediate retry. The collision-recovery path is implicit in the timing constants — there is no explicit retry-counter manipulation here.

The same TX slot will be re-attempted in the next loop iteration once the bus has been quiet for 8 ms.

## ARQ retry (`ERR_RTX`)

Distinct from collision. ARQ fires when a frame *appears* to have been transmitted (the `idx` loop completed without abort) but never showed up on RX within the loopback window. Causes:

- The frame was transmitted but corrupted in flight (no one accepts it; no one echoes it back; the sender never sees its own bytes either if a hardware path is broken).
- A collision happened in the *last* bit of the last byte — too late to abort, but enough to corrupt the line.
- The bus driver / receiver is faulty.

The retry is **lossless from the sender's API perspective** up to 3 attempts: the same TX slot is re-armed (`txBufferReadIdx = txBufferReadbackIdx`) and the next loop iteration will retransmit. After `IBUS_TX_MAX_RETRIES (3)` failures, the slot is advanced past — the frame is silently dropped.

> *Source:* BlueBus `ibus.c:1172–1186`.

## TX buffer overflow

If the application tries to queue a frame and the ring buffer's used-slot count equals `IBUS_TX_BUFFER_SIZE - 1` (i.e., 23 slots full), the new frame is **silently dropped**:

```c
if (usedSlots >= IBUS_TX_BUFFER_SIZE - 1) {
    LogRaw("[%llu] ERROR: IKBus: TX Buffer Overflow.\r\n", ts);
    return;
}
```

> *Source:* BlueBus `ibus.c:1226–1230`.

This happens at the **application/caller** boundary, not on the wire. The remedy is rate-limiting on the application side (don't queue faster than the bus can drain).

## High-priority bypass

Some commands need to fire before queued frames. BlueBus exposes a high-priority queueing variant that **pushes the new frame to the head of the ring** rather than appending:

```c
} else {
    // Priority message, so queue it first
    if (ibus->txBufferReadIdx == 0) {
        bufferIdx = IBUS_TX_BUFFER_SIZE - 1;
    } else {
        bufferIdx = ibus->txBufferReadIdx - 1;
    }
    ibus->txBufferReadIdx = bufferIdx;
    ibus->txBufferReadbackIdx = bufferIdx;
}
```

> *Source:* BlueBus `ibus.c:1254–1264`. Used for `IBUS_MSG_PRIORITY_HIGH` (`ibus.h:70`) — notably for `0x39` CDC status responses, where the radio re-requests if the response is too slow (see [`devices/cdc.md`](../devices/cdc.md#0x39--cdc-status-response)).

## Unknown / undocumented errors

A receiver may also encounter:

- **Frames addressed to unknown SRC or DST.** Not malformed — just from a device the receiver does not know about. The right response is to ignore them (do **not** assert).
- **Frames with command bytes the receiver does not handle.** Same — ignore.
- **Frames whose `DATA` payload has the wrong length for the given command** (e.g., an unexpectedly short `0x13` IKE sensor frame on a chassis the receiver thought was IKI). Treat as best-effort partial parse; surface a per-device TBC if the variant matters. See [`devices/ike.md`](../devices/ike.md#conflict-block--sensor-frame-length) for an example.

---

## Log-marker quick reference

For grepping a real-vehicle capture or BlueBus debug log:

| Marker | Meaning |
|---|---|
| `ERR_TMO[<count>]` | RX timeout — buffer flushed with `<count>` bytes left over. |
| `ERR_COL` | Collision detected mid-TX after ≥ 1 byte sent. |
| `ERR_RTX[<n>]` | TX retry attempt `<n>` (1, 2, or 3) for the current slot. |
| `IKBus: TX Buffer Overflow` | Application queued too fast; new frame dropped before reaching the wire. |
| `IKBus: Refuse to transmit frame of length <N>` | Application tried to send a frame with `N ≥ IBUS_MAX_MSG_LENGTH`. |

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.c:1100–1170` — RX timeout, collision handling.
- `firmware/application/lib/ibus.c:1172–1186` — ARQ retry path.
- `firmware/application/lib/ibus.c:1214–1230` — TX-size refusal and buffer-overflow handling.
- `firmware/application/lib/ibus.c:1206–1268` — full send path including high-priority queueing.

### bimmerz
- `packages/bus/src/protocol.ts:74–161` — slide-and-retry frame parsing (lighter-weight version, no collision / ARQ).

### Wilhelm-docs
- No dedicated error-handling page; failure modes are implied by the radio↔GT timeout discussion in `radio/arbitration.md`.
