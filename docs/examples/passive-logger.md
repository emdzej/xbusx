# Example — passive logger

**Status:** Draft.

A passive logger listens to the bus and dumps decoded frames without ever transmitting. It's the simplest useful piece of I/K-bus software — and a great place to start because **a passive logger needs only the framing layer**, not addressing, not collision detection, not arbitration.

## Hardware

Minimum:

- A 12 V-tolerant line receiver. The simplest is the Melexis TH3122 (the same chip BlueBus uses); cheaper alternatives like the optocoupler-fronted designs in some commercial loggers also work.
- A microcontroller with a UART configured for **9 600 baud, 8 data bits, even parity, 1 stop bit (9 600 8E1)**.
- A connector tapping into the K-bus or I-bus wire. On most chassis the easiest tap point is the OBD-II port (pin 1 = K-bus on E36/E38/E39/E46, pin 8 = I-bus on chassis that have it). Verify with a chassis-specific pinout — they vary.

The microcontroller can be anything from a 1980s 8-bit MCU upward; the bandwidth is trivial (~1 kB/s peak). For a desktop logger, a USB-to-serial adapter behind a TH3122 board is the easiest path.

## Software skeleton

The logger's main loop runs continuously, consuming UART bytes and assembling them into frames. In pseudocode:

```
buffer = []
last_byte_time = now()

loop forever:
    if uart has bytes:
        byte = uart.read()
        buffer.append(byte)
        last_byte_time = now()

    elif len(buffer) > 0:
        if now() - last_byte_time > 71 ms:
            # RX idle timeout — drop the buffer
            log_error("ERR_TMO", buffer)
            buffer = []
            continue

    if len(buffer) >= 5:
        # Try to parse a frame
        src = buffer[0]
        len_byte = buffer[1]
        if len_byte < 3 or len_byte + 2 > 47:
            # Unsynchronised — slide one byte
            buffer.pop(0)
            continue

        if len(buffer) >= len_byte + 2:
            dst = buffer[2]
            payload = buffer[3 : len_byte + 1]
            xor_observed = buffer[len_byte + 1]
            xor_computed = 0
            for b in buffer[0 : len_byte + 1]:
                xor_computed ^= b
            if xor_observed == xor_computed:
                dispatch(src, dst, payload)
                buffer = buffer[len_byte + 2 :]
            else:
                # Bad XOR — slide one byte
                buffer.pop(0)
```

This algorithm matches BlueBus's `ibus.c:1080–1170` and bimmerz's `protocol.ts:74–161` — see [`protocol/framing`](../protocol/framing.md) for the canonical reference.

## Decoding what you see

Given `(src, dst, payload)`, the decoded log line is roughly:

```
SRC=<src_name> DST=<dst_name> CMD=<cmd_byte> <decoded_meaning>
```

Where `<src_name>` and `<dst_name>` come from the canonical address table ([`devices/`](../devices/README.md)) and `<cmd_byte>` is `payload[0]`. For `<decoded_meaning>`, look up the `(SRC, DST, CMD)` triple in [`message-index`](../message-index.md) and follow the link to the per-device page.

### Worked example

A capture line that arrives as raw bytes:

```
80 04 BF 11 00 2A
```

The logger parses it as:

- `SRC = 0x80` → IKE (Instrument Cluster).
- `LEN = 0x04` → 4 bytes after LEN ⇒ total frame is 6 bytes.
- `DST = 0xBF` → GLO (global broadcast).
- `payload = [0x11, 0x00]`.
- `XOR = 0x2A`. Verify: `0x80 ^ 0x04 ^ 0xBF ^ 0x11 ^ 0x00 = 0x2A`. ✓.

Look up: `CMD = 0x11` from IKE to GLO is the ignition broadcast (see [`devices/ike.md`](../devices/ike.md#0x10--ignition-status-request--0x11--ignition-status)). The payload byte after `0x11` is the ignition state — `0x00 = KL-30 (off)`.

Decoded log line:

```
SRC=IKE DST=GLO CMD=0x11 IGNITION=KL-30 (off)
```

## Practical refinements

### Synchronisation on startup

When the logger first powers up, it has no idea where on the byte stream it is. The `len_byte + 2 ≤ 47` check ensures the parser doesn't accept impossible-length frames; combined with the XOR check, false-positive frame detection is rare but possible. The first few seconds of capture should be treated with skepticism — by then the buffer has resynchronised.

### Handling noise

Brief noise that corrupts one byte will cause the parser to fail the XOR check at the affected frame; it slides one byte forward and resyncs at the next valid frame boundary. Worst case: one or two adjacent frames are lost; recovery is automatic.

### Per-source filtering

For most use cases you want to filter the log to specific source devices — e.g., only IKE traffic if you're debugging cluster behaviour. Filter on `src` before invoking the per-device decoder.

### Time-stamping

Add a high-resolution timestamp (millisecond precision is sufficient) to every dispatched frame. The intervals between frames are diagnostic: a missing IKE `0x11` for >10 s while the engine is running, for example, suggests the cluster has gone dark.

## Don't transmit

A passive logger should **never** transmit. Specifically:

- Don't respond to `0x01` Ping with `0x02` Pong, even though it's tempting. A real device would; you are not a real device.
- Don't request status (`0x10`, `0x12`, `0x16`, `0x1D`). Wait for the broadcast.

If you do transmit, you risk both:

1. Causing real modules to react in unintended ways.
2. Colliding with legitimate traffic; without implementing the full collision-detection / ARQ stack ([`protocol/link-and-timing`](../protocol/link-and-timing.md)), your transmissions can crash valid frames.

## Useful frames to watch

The richest single source for understanding a vehicle's state is the **IKE**:

- `0x11` ignition state — every state change, plus periodic heartbeat.
- `0x13` sensor frame — handbrake, oil, brake-pads, gear position, doors.
- `0x17` odometer — once per request.
- `0x18` speed and RPM — frequent during driving.
- `0x19` ambient and coolant temperature — periodic.

The **LCM** at `0x5B` gives you the lamp / fault picture; the **GM** at `0x7A` gives you the door / lock state.

See [`examples/reading-vehicle-state`](reading-vehicle-state.md) for a focused worked example.

## Cross-cutting links

- [`protocol/framing`](../protocol/framing.md) — the byte layout.
- [`protocol/error-handling`](../protocol/error-handling.md) — what to do on bad XOR / timeout.
- [`message-index`](../message-index.md) — `(SRC, DST, CMD)` → device page.
- [`devices/`](../devices/README.md) — per-device decoding.
