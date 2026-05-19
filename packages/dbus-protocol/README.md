# @emdzej/dbus-protocol

Framing primitives for the BMW **D-bus** (DS2) diagnostic protocol — the
half-duplex tester ↔ ECU protocol that shares the OBD-II connector and the
same 9600 8E1 UART as the I/K-bus, but uses different framing and a
different command vocabulary.

See [`docs/protocol/dbus.md`](../../docs/protocol/dbus.md) for the
reverse-engineered spec (sourced from navcoder).

## Frame structure

```
+-----+-----+---------- ... ----------+-----+
| DST | LEN |    DATA (1..n bytes)    | XOR |
+-----+-----+---------- ... ----------+-----+
  1B    1B          n bytes             1B
```

- `LEN` is the **total frame length** (including itself and the XOR byte).
- There is **no source byte** — direction is inferred from `DST` relative
  to the tester address (`0xF1`).
- XOR scheme is identical to I/K-bus (XOR of every preceding byte).

## Exports

- `encode(message)` / `decode(bytes)` — single-frame round-trip.
- `DBusFrameStream` — streaming decoder with resync + idle-timeout watchdog.
- `DBUS_ADDRESSES`, `addressName`, `parseAddress` — ECU address registry.
- `DBusMessage` — the parsed-frame type.

## Why a separate package from `ikbus-protocol`

The two protocols overlap on UART configuration and XOR checksum but
diverge on:
1. Frame structure (`SRC | LEN | DST | … | XOR` vs `DST | LEN | … | XOR`).
2. Length semantics (`LEN + 2` vs `LEN` for total).
3. Command vocabulary (disjoint).

Keeping them in separate packages prevents accidental cross-pollination
and lets each bus iterate independently.
