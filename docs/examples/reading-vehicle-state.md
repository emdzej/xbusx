# Example — reading vehicle state

**Status:** Draft.

A passive logger ([`passive-logger`](passive-logger.md)) tells you what's on the wire. This page tells you **what to do with it** if your goal is reading the vehicle's current state — ignition, speed, gear, fuel temperature, door status, etc. All of this is broadcast by the IKE and GM; you just need to decode it.

## What the bus tells you, and how often

| State variable | Source frame | Frequency | Page |
|---|---|---|---|
| Ignition position | IKE `0x11` | On change + heartbeat | [ike](../devices/ike.md#0x10--ignition-status-request--0x11--ignition-status) |
| Speed, RPM | IKE `0x18` | Frequent during driving | [ike](../devices/ike.md#0x18--speed--rpm-update) |
| Coolant temp, ambient temp | IKE `0x19` | Periodic | [ike](../devices/ike.md#0x19--temperature--0x1d--temperature-request) |
| Odometer | IKE `0x17` | On request (`0x16`) | [ike](../devices/ike.md#0x16--odometer-request--0x17--odometer) |
| Gear, handbrake, doors, oil, brake-pad | IKE `0x13` | Periodic + on change | [ike](../devices/ike.md#0x12--sensors-request--0x13--sensors) |
| Door / window / lid / lock state | GM `0x7A` | On change | [gm](../devices/gm.md#0x7a--door--lid-status-response) |
| Lamp faults | LCM `0x5B` | Periodic | [lcm](../devices/lcm.md#0x5b--cluster-indicators) |
| Light auto-on, twilight / rain | RLS `0x59` | On change | [rls](../devices/rls.md#0x59--light-sensor-status) |
| VIN, chassis-stored mileage | LCM `0x54` | On request (`0x53`) | [lcm](../devices/lcm.md#0x54--redundant-data-response-brief) |

## Simple decoder — ignition + speed

A logger that prints "ignition state changed" and "vehicle is moving at N km/h" needs only two decoders:

```python
def decode_ike(payload):
    cmd = payload[0]
    if cmd == 0x11:
        state = payload[1]
        names = {0x00: "OFF (KL-30)", 0x01: "KL-R", 0x03: "KL-15", 0x07: "KL-50"}
        print(f"Ignition: {names.get(state, f'unknown 0x{state:02x}')}")
    elif cmd == 0x18:
        speed_kmh = payload[1] * 2
        rpm = payload[2] * 100
        print(f"Speed {speed_kmh} km/h, RPM {rpm}")
```

That's literally all you need to see the vehicle's two most common signals.

## Compound decoder — sensor frame (`0x13`)

The IKE sensor frame is denser. Its 3- or 7-byte payload combines multiple binary flags with a 4-bit gear nibble. Variant-aware decoding (IKE vs IKI — see [`devices/ike.md`](../devices/ike.md#conflict-block--sensor-frame-length)):

```python
GEARS = {
    0x00: "—",  0x10: "R",  0x20: "1",  0x60: "2",
    0x70: "N",  0x80: "D",  0xB0: "P",  0xC0: "4",
    0xD0: "3",  0xE0: "5",  0xF0: "6",
}

def decode_sensor(payload):
    # payload[0] is the command byte 0x13
    b1, b2, b3 = payload[1], payload[2], payload[3]
    handbrake = bool(b1 & 0x01)
    oil_fault = bool(b1 & 0x02)
    pads_worn = bool(b1 & 0x04)
    trans_fault = bool(b1 & 0x10)

    engine_on = bool(b2 & 0x01)
    driver_door_open = bool(b2 & 0x02)
    gear = GEARS.get(b2 & 0xF0, f"unknown 0x{b2 & 0xF0:02x}")

    aux_heat = bool(b3 & 0x04)
    aux_vent = bool(b3 & 0x08)

    print(f"gear={gear} engine={engine_on} door={driver_door_open} "
          f"handbrake={handbrake} oil_fault={oil_fault}")

    # If this is an IKI (7-byte payload), more flags available in bytes 4-7
    if len(payload) >= 7:
        b4 = payload[4]
        engine_failsafe = bool(b4 & 0x02)  # gasoline only
        coolant_overheat = bool(b4 & 0x20)
        # …etc.
```

## Doors and locks

The GM's `0x7A` carries everything door / lid / lock related in two bytes:

```python
def decode_doors(payload):
    # payload[0] is 0x7A
    b1, b2 = payload[1], payload[2]
    doors = {
        "driver":    bool(b1 & 0x01),
        "passenger": bool(b1 & 0x02),
        "rear_rh":   bool(b1 & 0x04),
        "rear_lh":   bool(b1 & 0x08),
    }
    lock_bits = b1 & 0x30
    lock_state = {0x10: "unlocked", 0x20: "locked", 0x30: "double-locked"}.get(lock_bits, "unknown")
    interior_lamp = bool(b1 & 0x40)

    windows = {
        "driver":    bool(b2 & 0x01),
        "passenger": bool(b2 & 0x02),
        "rear_rh":   bool(b2 & 0x04),
        "rear_lh":   bool(b2 & 0x08),
    }
    sunroof = bool(b2 & 0x10)
    rear_lid = bool(b2 & 0x20)
    front_lid = bool(b2 & 0x40)
    boot_release = bool(b2 & 0x80)

    print(f"doors {doors} lock={lock_state} windows {windows} sunroof={sunroof}")
```

## Temperature with the sign quirk

Ambient temperature in `0x19` is a **signed** byte; coolant is unsigned. Decode in Python:

```python
def decode_temp(payload):
    # payload = [0x19, ambient, coolant, 0x00]
    ambient_byte = payload[1]
    if ambient_byte >= 0x80:
        ambient_c = ambient_byte - 0x100   # two's complement
    else:
        ambient_c = ambient_byte
    coolant_c = payload[2]
    print(f"ambient {ambient_c} °C, coolant {coolant_c} °C")
```

> *Source:* [`devices/ike.md`](../devices/ike.md#0x19--temperature--0x1d--temperature-request); bimmerz `ike/parsers.ts:81–97` (the only source that gives the exact two's-complement formula).

## Odometer with the 3-byte little-endian quirk

`0x17`'s mileage is a 3-byte little-endian integer:

```python
def decode_odometer(payload):
    # payload = [0x17, m_lo, m_mid, m_hi, ...]
    m_lo, m_mid, m_hi = payload[1], payload[2], payload[3]
    km = (m_hi << 16) | (m_mid << 8) | m_lo
    print(f"odometer {km} km")
```

> *Source:* Wilhelm `ike/17.md:24–43`. **Note:** bimmerz's `parseInstrumentClusterOdometerResponse` has a JS operator-precedence bug — don't copy it.

## Requesting state on demand

The IKE broadcasts most state periodically without prompting. For a logger this is enough — wait for the next broadcast.

For an interactive tool that wants state *now*, you need to transmit (and therefore implement the full link layer — collision detection, ARQ, the lot). The request commands are:

| Request | Direction | Response |
|---|---|---|
| `0x10` Ignition Status Request | any → IKE | `0x11` |
| `0x12` Sensors Request | any → IKE | `0x13` |
| `0x14` Language/Region Request | any → IKE | `0x15` |
| `0x16` Odometer Request | any → IKE | `0x17` |
| `0x1D` Temperature Request | any → IKE | `0x19` |
| `0x79` Door/Lid Status Request | any → GM | `0x7A` |
| `0x53` Redundant Data Request | IKE → LCM | `0x54` |

If you're going to transmit, see [`subsystems/cdc-emulation`](../subsystems/cdc-emulation.md) for the general pattern and [`protocol/link-and-timing`](../protocol/link-and-timing.md) for the timing constraints.

## What you can't easily read

- **VIN** comes only from the IKE↔LCM redundant-data exchange (`0x53`/`0x54`/`0x55`). You can capture a `0x55` broadcast if you happen to be listening at startup, but otherwise need to transmit `0x53` to provoke it.
- **Specific fuel level** is in the IKI 7-byte `0x13` byte 7 — but only on chassis with the IKI cluster (post Oct 2001).
- **Steering angle, ABS state, transmission state.** These live on the D-bus, not the I/K-bus. Out of scope for this reference.

## Cross-cutting links

- [`devices/ike.md`](../devices/ike.md) — primary source for most state.
- [`devices/gm.md`](../devices/gm.md) — door / lid / lock state.
- [`devices/lcm.md`](../devices/lcm.md) — lamp faults, redundant data.
- [`subsystems/obc-display`](../subsystems/obc-display.md) — the OBC menu flow you may want to mimic.
