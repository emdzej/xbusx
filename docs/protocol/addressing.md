# Addressing

**Status:** Draft.

The I-Bus and K-Bus share a single, flat **8-bit address space**. Every device on either bus has an address in `0x00..0xFF`. Addresses are statically preassigned by BMW and are almost never reused between models — an address allocated on the E31 typically stays bound to the same device on later chassis, even where that device does not exist.

The full canonical address table is in [`../devices/README.md`](../devices/README.md). This page covers the structural categories and routing rules.

> *Sources:* Wilhelm `README.md:102–110` and `address.md:3–10`. Both state the same allocation rules — agreed.

## Source and destination fields

Every frame carries both `SRC` (originator) and `DST` (intended recipient). A receiver may filter on either:

- Most devices listen for frames where `DST` equals their own address **or** a broadcast/multicast address they belong to.
- Some devices additionally watch for frames addressed to specific peers — e.g., the IKE gateway forwards frames whose `DST` lives on the other bus (see "The gateway" below).

The combination `(SRC, DST, CMD)` is what fully identifies a message's meaning. The same command byte from a different source can carry different semantics — see for example command `0x32` (volume), which is emitted by both the MFL (`0x50`) and the BMBT (`0xF0`) but is interpreted by the radio differently depending on who sent it.

> *Sources:* BlueBus `ibus.h:49–66` defines packet indices and treats both fields as first-class. Wilhelm `guide.md:3–13` ("Senders/Receivers") documents per-command sender/receiver pairs.

## Categories of address

### Unicast

`0x00..0xFF` minus the broadcast and multicast addresses listed below. Each unicast address identifies a single device — or, across different chassis, the same device *family* (e.g., `0x80` is always the instrument cluster, whether it's a low-cluster KOMBI, a high-cluster IKE, or a later high-cluster IKI).

### Broadcast

Two destinations are broadcast — every device listens, regardless of bus side:

| Address | Name | Notes |
|---|---|---|
| `0xBF` | **GLO** / Global | Used for most state announcements (e.g., IKE ignition status, IKE temperature, GM door state, telephone announce). |
| `0xFF` | **LOC** / Local | Used in some module-announce (Pong) frames and other broadcasts. |

> *Sources:* BlueBus `ibus.h:35` (`IBUS_DEVICE_GLO 0xBF`), `ibus.h:44` (`IBUS_DEVICE_LOC 0xFF`). Wilhelm `README.md:159, 173` lists both as broadcast (`📣`). bimmerz `devices.ts:49, 63`. Agreed on addresses, divergent on semantics — see the conflict block.

#### `0xBF` vs `0xFF` — distinct or interchangeable?

| Source | Claim | Cite |
|---|---|---|
| BlueBus | Two distinct constants named GLO ("Global") and LOC ("Local"). No differential routing or reception logic in firmware. | `ibus.h:35, 44` |
| Wilhelm | Both marked broadcast (`📣`) without distinguishing them. | `README.md:159, 173` |
| bimmerz | `GLO: 0xBF`, `LOC: 0xFF` — no semantic comment. | `devices.ts:49, 63` |

**Resolution:** In practice both function as broadcast — every device listens to both, and no source implements differential gateway routing or differential reception. Observed-traffic convention: `0xBF` is more common for state announcements and cross-bus broadcasts; `0xFF` appears in some module-announce frames (e.g., telephone Pong `C8 04 FF 02 31 00`, Wilhelm `02.md:14`). Use `0xBF` unless replicating a specific traffic pattern.
**Why:** No source documents a formal rule. BlueBus's naming convention ("Global" vs "Local") suggests an intended scope distinction, but neither BlueBus nor any other source enforces it. Treat the choice as a stylistic convention rather than a routing primitive.

### Multicast

| Address | Name | Notes |
|---|---|---|
| `0xE7` | **ANZV** / Displays multicast | Group address for display modules; targets MID, BMBT, and the IKE display when relevant. |

> *Sources:* Wilhelm `README.md:166`, BlueBus `ibus.h:41` (`IBUS_DEVICE_ANZV 0xE7`), bimmerz `devices.ts:55`. Agreed.

#### Is `0x53` a multicast address?

| Source | Claim | Cite |
|---|---|---|
| Wilhelm `README.md` | "Unconfirmed: Multicast 📣" | `README.md:133` |
| Wilhelm `address.md` | Not listed as an address. | n/a |
| BlueBus | Not declared as an address; declared as the command byte `IBUS_CMD_LCM_REQ_REDUNDANT_DATA` (`0x53`). | `ibus.h:218` |
| bimmerz | Not in address table. | n/a |

**Resolution:** `0x53` is **not** an address. The Wilhelm `README.md` entry conflates the *command byte* `0x53` (used in the IKE↔LCM redundant-data choreography — see [`../subsystems/obc-display`](../subsystems/obc-display.md)) with an address.
**Why:** BlueBus's runtime treats `0x53` purely as a command byte. Wilhelm marks the entry "unconfirmed", which is consistent with a misclassification. No observed frame uses `0x53` as `DST`.

### Reserved / unused

A handful of byte values are not assigned in any source surveyed here. The address `0x23` is left blank in Wilhelm's `address.md:28`. Treat unassigned addresses as reserved; software should ignore frames whose `SRC` or `DST` is unknown rather than asserting on them.

## The gateway: IKE bridges K-Bus and I-Bus

On chassis that carry **both** K-Bus and I-Bus (E38, E39, E53 High), the **IKE (`0x80`) acts as the gateway** between them. A frame whose `DST` lives on the other bus appears on the originating bus first, and then — after gateway forwarding — on the destination bus.

The gateway determines forwarding from `DST`:

- **`DST` on the same bus** as the sender ⇒ no forwarding.
- **`DST` on the other bus** ⇒ the IKE re-emits the frame on the other bus.
- **`DST` = `0xBF` (broadcast)** ⇒ the IKE re-emits on the other bus so recipients on both sides see the frame.

> *Source:* Wilhelm `README.md:72–76`:
>
> > "On vehicles equipped with an I-Bus (E38, E39, E53 High) messages to be sent back and forth between the K-Bus and I-Bus have to be transferred via a Gateway. This Gateway is the IKE. The IKE determines by the address of the message recipient whether the message needs to be passed along to the other bus."
>
> BlueBus does not implement gateway behaviour (it sits on the I-Bus only), but its addressing of cross-bus messages is consistent with this rule. bimmerz does not describe the gateway.

Software operating on only one bus side of a gateway-equipped vehicle will see both bus-local frames and gateway-forwarded frames; it cannot reliably distinguish them from the frame contents alone. A bus-side-aware logger needs to know which physical bus it is tapped onto.

## Chassis × bus matrix

A reminder of which chassis carry which buses — see [`../overview.md`](../overview.md) for the full table.

- **K-Bus only:** E46, E52, E83, E85, E86, E87, R50 — no gateway, no I-Bus traffic.
- **I-Bus only:** E31 — body electronics ride on the I-Bus.
- **K + I with IKE gateway:** E38, E39, E53 (High variants).

The chassis split affects software in two ways:

1. **Which devices to expect.** A K-only chassis has no GT (`0x3B`), no BMBT (`0xF0`), no NAV (`0x7F`) — these are I-Bus inhabitants.
2. **Whether to expect gateway-forwarded traffic.** Logging on the K-Bus side of an E38 includes I-Bus broadcasts the IKE forwarded; logging on either side of an E46 does not.

## Practical implications for implementers

- A **passive logger** does not need its own address; if it never transmits, none is required.
- An **active device** must choose a `SRC` address. The conventional retrofit choice is to reuse an address whose original device is not installed — e.g., BlueBus uses `0x18` (CDC) on the assumption that no real CD changer is present (BlueBus `ibus.h:46`: `#define IBUS_DEVICE_BLUEBUS IBUS_DEVICE_CDC`).
- A **passive monitor on the I-Bus side** of an E38/E39/E53 will see both I-Bus-native traffic *and* gateway-forwarded K-Bus traffic, including frames whose `SRC` is a K-Bus-only device (e.g., GM `0x00`). This is expected behaviour; do not treat such frames as anomalous.
