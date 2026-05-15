# Physical layer

**Status:** Draft.

This page covers the electrical signalling layer of the I/K-bus — enough to understand how to tap in, but not a deep electrical reference. The bus is a **single-wire, single-ended, half-duplex** serial line that runs at 9 600 baud with one start bit, eight data bits, even parity, and one stop bit (9 600 8E1).

## Topology

A single shared wire connects every device on a given bus (K or I). All devices receive every frame; arbitration / collision avoidance is handled at the link layer ([`link-and-timing`](link-and-timing.md)) rather than by separate physical channels.

The K-bus and I-bus are physically separate wires; on chassis that carry both (E38, E39, E53 High), the IKE (`0x80`) bridges them — see [`addressing`](addressing.md#the-gateway-ike-bridges-k-bus-and-i-bus).

## Electrical signalling

- **Voltage:** nominal 12 V system; the bus idles at battery voltage (high) and pulls low during transmission.
- **Driver:** open-collector (or open-drain equivalent) — devices pull the line low to transmit but cannot drive it high; the line is pulled high by a single pull-up resistor near the master point.
- **Receivers:** every device on the bus continuously sees every voltage transition.

The single-wire / open-drain arrangement is what makes **wired-OR collisions** possible (and what makes the link-layer collision-detection-during-transmission scheme work) — see [`link-and-timing`](link-and-timing.md#collision-detection-and-arbitration).

> *Source:* BlueBus targets the **Melexis TH3122** I-Bus line driver / receiver IC. The TH3122 datasheet (not folded into this reference) is the canonical authority on voltage levels, fault behaviour, and reverse-polarity protection. BlueBus's hardware references the part at the schematic level; software-side, the chip presents a standard UART interface (`firmware/application/lib/ibus.h:11` includes `uart.h`).

## UART parameters

| Parameter | Value |
|---|---|
| Baud rate | 9 600 bps |
| Data bits | 8 |
| Parity | Even |
| Stop bits | 1 |
| Frame format | LSB-first (UART convention) |

> *Source:* BlueBus `ibus.h:654` comment: "9600 baud = ~1.1 = 1.5 bytes/ms". The 8E1 framing is the BMW-spec default for the I/K-bus; documented externally in the Melexis datasheet and in numerous community sources.

At 9 600 baud with 8E1 framing, each byte takes approximately **1.14 ms** on the wire (10 + 1 parity = 11 bit times, but `1/9600 × 11 ≈ 1.146 ms`). A maximum-length 47-byte frame takes around **54 ms** end-to-end — important context for the link-layer timeouts.

## K-bus vs I-bus electrically

The two buses are **electrically identical** — same baud rate, same framing, same signalling levels, same transceivers can be used on either. What differs is only which devices are wired to which bus.

> *Source:* Wilhelm `README.md:58–60`: "Both of these bus systems are technically identical, the only difference is their use by model."

Software targeting one bus side cannot reach devices on the other without the IKE gateway — see [`addressing`](addressing.md#the-gateway-ike-bridges-k-bus-and-i-bus).

## Tapping in

A passive logger needs only:

1. A UART receiver capable of 9 600 8E1.
2. A level shifter / line-receiver tolerant of 12 V automotive transients. The TH3122 is the easy answer; bare microcontroller UART pins are not safe to wire directly.

An active device additionally needs:

1. An open-drain driver / line transceiver capable of pulling the wire low without back-feeding the battery. The TH3122 handles this too.
2. **TX-monitoring of its own output** (for collision detection — see [`link-and-timing`](link-and-timing.md)). The TH3122 separates RX and TX paths so this is straightforward.

## Things out of scope here

- Connector pinouts on specific chassis.
- Voltage tolerances and ESD ratings.
- Detailed transceiver datasheets.
- Power-management / sleep-wake on the bus wire itself (transitions to / from low-power modes are described in [`link-and-timing`](link-and-timing.md) at the protocol level, but the electrical detail of how the TH3122 enters low-power is in its datasheet).

---

## Open questions / TBC

- **Exact pull-up location.** Is the line's pull-up at a single point (the battery-distribution box) or distributed across multiple devices? Probably the former; not directly documented in surveyed sources.
- **Termination.** Is there a terminating resistor / capacitor anywhere? Not documented.
- **Power-budget per device.** What is the maximum sink current each device may pull? Datasheet question.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:11` — includes `uart.h`; confirms standard UART interface.
- `firmware/application/lib/ibus.h:654` — baud-rate comment.

### Wilhelm-docs
- `README.md:58–60` — K-bus / I-bus electrical equivalence.

### External (not folded in)
- Melexis TH3122 datasheet — authoritative for voltage levels, fault behaviour, line-driver characteristics.
