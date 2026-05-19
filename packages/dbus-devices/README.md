# @emdzej/dbus-devices

D-bus orchestrator + ECU twins for the BMW DS2 diagnostic protocol.

Pairs with [`@emdzej/dbus-protocol`](../dbus-protocol/README.md) for framing
and [`@emdzej/dbus-commands`](../dbus-commands/README.md) for the DS2 codec
catalog.

## Shape

D-bus is request/response (unlike I/K-bus's broadcast/observe pattern), so
ECU twins here are **remote-object proxies** rather than autonomous
observers. They hold a reference to the `DBus` orchestrator and expose
query methods:

```ts
const bus = new DBus(transport)
await bus.start()

const dme = new DME(bus)
const ident = await dme.readIdentification()
console.log(ident.data) // raw bytes following the 0xA0 positive-ACK
console.log(dme.state.identification) // cached on the twin
```

`DBus` serialises requests — D-bus is half-duplex, so only one request is
in flight at a time. Concurrent callers are queued FIFO. Each request has a
configurable timeout (default 1000 ms).

## Currently implemented

- `DBus` — orchestrator (transport + frame stream + request queue).
- `DME` (`0x12`) — engine controller. `readIdentification()` (DS2 `0x00`).

More ECU twins (EGS, IKE-on-D-bus, LCM-on-D-bus, etc.) and more commands
(read DTCs, clear DTCs, read coding) follow as needed.
