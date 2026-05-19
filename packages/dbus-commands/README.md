# @emdzej/dbus-commands

DS2 command catalog for the D-bus diagnostic protocol. Builders that
produce request frames and parsers that interpret responses.

Pairs with [`@emdzej/dbus-protocol`](../dbus-protocol/README.md) for the
framing layer and [`@emdzej/dbus-devices`](../dbus-devices/README.md) for
the per-ECU twins.

## Pattern

Each command exports two halves:

- `buildXRequest(args): Uint8Array` — returns wire bytes ready to write to
  the transport.
- `parseXResponse(message: DBusMessage): X` — interprets a positive ACK
  response into a typed object. Throws on negative responses; callers that
  need to handle both branches should use `parseResponse()` from `./responses`
  first.

## Currently implemented

- `general/identification` — `0x00` read-identification request + response.
- `responses` — generic DS2 response classifier (`0xA0` positive, the
  various `0xA1..0xB2` and `0xFF` negatives).

The catalog deliberately starts narrow — see [`docs/protocol/dbus.md`](../../docs/protocol/dbus.md#command-byte-table)
for the full DS2 command table and add codecs as ECU support lands.
