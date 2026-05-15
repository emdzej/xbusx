# Link layer and timing

**Status:** Draft.

This page covers what sits between the [physical layer](physical.md) (raw 9 600 8E1 UART) and the [frame layer](framing.md) (`SRC | LEN | DST | DATA | XOR`): how devices arbitrate access to a shared wire, how collisions are detected, when retries fire, and what timeouts bound the protocol's worst-case behaviour. All numeric values are sourced from BlueBus's firmware constants — they are the authoritative ground truth for any software implementing a peer.

## Key timing constants

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_RX_BUFFER_TIMEOUT` | **71 ms** | If the RX buffer has held bytes for longer than this without new bytes arriving, the buffer is flushed on the assumption that the sender is no longer mid-frame (probable malformed frame, or pause between frames longer than expected). |
| `IBUS_TX_FRAME_IDLE_WAIT` | **8 ms** | Minimum quiet-time on the wire before this device may begin transmitting. Faster than this and at least one production receiver (the MKIII v20 GT) drops frames. |
| `IBUS_TX_TIMEOUT_WAIT` | **79 ms** (= 71 + 8) | Used as the per-byte upper bound during a transmission. |
| `IBUS_TX_MAX_RETRIES` | **3** | Retry attempts after a transmit failure (no loopback observed within the loopback timeout). |
| `IBUS_TX_LOOPBACK_TIMEOUT` | **790 ms** (= 79 × 10) | If a transmitted frame has not been observed coming back on RX within this window, treat the transmit as lost and retry. |
| `IBUS_RX_BUFFER_SIZE` | **255 bytes** | Maximum holding capacity for the RX byte stream. Overflows trigger flush + error. |
| `IBUS_TX_BUFFER_SIZE` | **24 slots** | Ring-buffer depth for outbound frames. One slot must always remain empty to distinguish full from empty. |
| `IBUS_MAX_MSG_LENGTH` | **47 bytes** | Maximum frame size. See [framing](framing.md#size-bounds). |

> *Source:* BlueBus `ibus.h:650–667`.

## Wire idle time

A device may not transmit until the bus has been quiet for at least `IBUS_TX_FRAME_IDLE_WAIT` (8 ms). This is enforced in BlueBus by comparing `TimerGetMillis() - ibus->rxLastStamp` against the constant before any TX work begins:

```c
} else if (
    ibus->rxBufferIdx == 0 &&
    ibus->txBufferWriteIdx != ibus->txBufferReadIdx &&
    (TimerGetMillis() - ibus->rxLastStamp) >= IBUS_TX_FRAME_IDLE_WAIT
) {
    // Flush the transmit buffer out to the bus
    …
}
```

> *Source:* BlueBus `ibus.c:1087–1091`. The inline comment at `ibus.h:656–658` notes: "This is the time we wait before transmitting. Any faster than this, and the MKIII v20 based GT will miss frames."

The 8 ms figure is therefore an empirically-tuned floor; some receivers tolerate less, but at least one production module does not.

## Collision detection and arbitration

The bus has **no formal arbitration scheme** — no master, no token, no priority encoding. Instead, every transmitter is responsible for **monitoring its own RX while it transmits**:

1. Before sending each byte, check `IBUS_UART_STATUS` for activity. If the line is busy, abort.
2. While transmitting a byte, check `IBUS_UART_STATUS` between bit times. If the line goes busy mid-byte, abort, log `ERR_COL`, and reset the TX timestamp to avoid an immediate retry.
3. Pre-flight check: if the RX queue holds more frames than this device has transmitted (`CharQueueGetSize(&ibus->uart.rxQueue) > txCount`), abort — more frames have been received than the device has emitted, which is a confused state.

> *Source:* BlueBus `ibus.c:1100–1145`. The abort path at lines 1112–1123 is the canonical collision handler; the inline comment at line 1117 notes: "It is not a collision unless we already transmitted a byte. Only alarm in these instances" — i.e., the `ERR_COL` log fires only if `idx > 0`.

### Practical implications

- **Two devices that start transmitting simultaneously** will both detect the collision (each sees the other on its RX before completing its own frame), both abort, and both back off via the post-collision idle-wait.
- **Back-off is implicit** — after a collision, both devices need `IBUS_TX_FRAME_IDLE_WAIT` of bus quiet before either retries. There is no exponential back-off, no randomised wait. If both devices observe quiet at the same moment they will collide again. In practice, the asymmetric processing latency between them tends to break the symmetry.

## ARQ — automatic retransmission

BlueBus uses TX-loopback as its acknowledgement signal: an emitted frame should appear on RX (because the device sees its own transmission on the shared wire). If a frame has been emitted but `IBUS_TX_LOOPBACK_TIMEOUT` (790 ms) passes without seeing it on RX, the frame is presumed lost.

```c
if (
    ibus->txBufferReadbackIdx != ibus->txBufferReadIdx &&
    ibus->txBufferReadIdx == ibus->txBufferWriteIdx &&
    ibus->txLastStamp > 0 &&
    (TimerGetMillis() - ibus->txLastStamp) > IBUS_TX_LOOPBACK_TIMEOUT
) {
    if (ibus->txRetries < IBUS_TX_MAX_RETRIES) {
        ibus->txRetries++;
        LogRaw("IBus: ERR_RTX[%d]\r\n", ibus->txRetries);
        ibus->txBufferReadIdx = ibus->txBufferReadbackIdx;
    } else {
        ibus->txBufferReadbackIdx = ibus->txBufferReadIdx;
        ibus->txRetries = 0;
    }
}
```

> *Source:* BlueBus `ibus.c:1172–1186`.

The retry count is hard-capped at **3** (`IBUS_TX_MAX_RETRIES`). After three failed attempts, BlueBus advances past the failed slot — the frame is silently dropped.

`ERR_RTX[N]` log lines indicate that a retransmission attempt has been triggered.

## RX buffer flushing

If the RX buffer holds at least one byte and either:

- `IBUS_RX_BUFFER_TIMEOUT` (71 ms) has elapsed since the last RX byte, **or**
- the buffer is about to overflow (`rxBufferIdx + 1 == IBUS_RX_BUFFER_SIZE`),

…the buffer's contents are logged as a hex dump (with an `ERR_TMO[N]` log line where `N` is the partial buffer length) and discarded.

> *Source:* BlueBus `ibus.c:1147–1170`.

This timeout has two practical effects:

1. **Self-synchronisation.** A receiver that starts in the middle of someone else's frame, or that misses bytes due to noise, recovers within 71 ms of the noise event.
2. **Frame-spacing budget.** A sender that pauses for more than 71 ms between bytes of the same frame will see its frame discarded by every receiver. In practice no device pauses mid-frame — the entire frame is sent as one UART burst.

## Wake / sleep behaviour

Modules sleep when the bus is quiet for a long time (chassis-dependent, but on the order of 30 s after KL-30). The wake mechanism is **bus traffic itself** — any frame on the wire is enough to bring a module out of sleep.

There is **no formal sleep request frame** in the surveyed sources. Some devices broadcast a status / heartbeat frame periodically while awake (e.g., IKE's `0x11` ignition status, LCM's `0x5B` cluster indicators); the absence of these frames is one signal a downstream module uses to decide it can sleep.

> *TBC:* characterise the exact "everyone sleep" pattern on a real vehicle. Likely involves the GM and the IKE coordinating after a delayed KL-30 transition.

## A complete TX path, end to end

Putting it all together — a single frame transmitted by a BlueBus-style peer:

1. **Caller queues frame** via `IBusSendCommand(ibus, src, dst, data, dataSize)` (`ibus.c:1283–1291`). The frame is constructed (XOR computed) and placed into the TX ring at `txBufferWriteIdx`.
2. **Main loop tick** calls into `IBusProcessHandler` (or equivalent). On each tick:
    - If RX has new bytes, append them to the RX buffer; if a complete valid frame is present, dispatch it.
    - If at least one TX slot is non-empty and the bus has been quiet for `IBUS_TX_FRAME_IDLE_WAIT`, attempt to transmit.
3. **Transmit attempt:**
    - Check `IBUS_UART_STATUS == 0` (bus quiet) and `CharQueueGetSize(&ibus->uart.rxQueue) <= txCount` (no overrun condition).
    - Stream bytes out one at a time. After each byte, re-check `IBUS_UART_STATUS`. If the line goes busy mid-frame, abort (collision).
    - On successful emission, advance `txBufferReadIdx`.
4. **Loopback observation:** within `IBUS_TX_LOOPBACK_TIMEOUT` (790 ms) the transmitted bytes should appear on RX. If they do, advance `txBufferReadbackIdx` past the slot.
5. **Retry on timeout:** if the loopback never arrives within the timeout window, increment `txRetries` and re-arm the same slot. After 3 failures, drop the slot.

The whole pipeline therefore has a worst-case latency of **3 × 790 ms ≈ 2.4 s** before a frame is permanently dropped — which is the floor for application-level "the bus is unresponsive" detection.

---

## Things sources disagree on (or don't say)

### Wilhelm's timing coverage

Wilhelm offers very little on timing. The radio↔GT arbitration page (`radio/arbitration.md`) mentions an "~8-second timeout" in one place, but in a UI-state-machine context rather than a wire-level one. None of the numeric values above appear in Wilhelm.

> *Source:* Wilhelm `radio/46.md` and `radio/arbitration.md` (referenced; not quoted here).

**Resolution:** Use the BlueBus numbers. They're sourced from a working firmware that interoperates with production BMW devices.

### bimmerz

bimmerz uses a 500-byte overflow protection (`protocol.ts:155–159`) but otherwise does not implement collision detection or ARQ — it's a pure software parser, not a transceiver. Don't take it as a model for the link layer.

---

## Open questions / TBC

- **Wake from deep sleep.** What is the wake-up latency for a sleeping module on the first bus byte? Likely chassis-dependent; not surveyed.
- **Whether the gateway IKE has special timing.** The gateway has to receive a frame from one bus and re-emit on the other — does it use the same 8 ms idle-wait, or something tighter / looser?
- **Real-traffic collision rate.** In observed traffic, how often does `ERR_COL` actually fire? BlueBus logs are the answer — not folded in here.
- **MFL R/T toggle persistence across sleep.** See [`mfl.md`](../devices/mfl.md#open-questions--tbc).

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:649–667` — every timing constant in one block, with inline comments.
- `firmware/application/lib/ibus.c:1080–1186` — the canonical TX path, collision handling, RX timeout, and ARQ retry. This is ~100 lines of dense C; the snippets quoted above are the load-bearing ones.

### Wilhelm-docs
- `radio/46.md`, `radio/arbitration.md` — UI-state-machine arbitration; the underlying wire-level timing is not described.

### bimmerz
- `packages/bus/src/protocol.ts:74–161` — RX-side state machine. No collision detection, no ARQ.
