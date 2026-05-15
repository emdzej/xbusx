# MFL (0x50) — Multifunction Steering Wheel

**Status:** Draft.

**Role:** The steering-wheel-mounted button cluster. Originates button presses (next/prev/voice/R-T) and rotary volume events. Routes commands to either the radio (`0x68`) or the telephone (`0xC8`) depending on a stateful R-T toggle bit.

**Buses:** K/I.

**Chassis coverage:** All chassis listed in [`../overview.md`](../overview.md). Address `0x50` is universal.

**Variants:** None known. The MFL does not distinguish hardware revisions in its on-the-wire behaviour.

---

## Address

`0x50`. *Sources:* BlueBus `ibus.h:23`, Wilhelm `README.md:131`, bimmerz `devices.ts:33` — agreed.

---

## Announce / Pong

The MFL is **not documented to broadcast an announce frame** in Wilhelm's `02.md`. It does answer `0x01` Ping frames with `0x02` Pong:

```
50 03 C8 01 9A          # MFL pings telephone
C8 04 50 02 30 AE       # telephone replies with pong to MFL
```

> *Source:* Wilhelm `02.md:56–73` shows the Pong choreography; MFL appears as the pinger, not as a stand-alone announcer.

The absence of a stand-alone MFL announce suggests the MFL is treated as always-present from ignition KL-R upwards — modules that depend on it (radio, telephone, BlueBus) listen for its events without first checking for its presence.

---

## Messages where MFL is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x32` | Volume control | RAD `0x68` *or* TEL `0xC8` | 1-byte payload: direction bit + step nibble. Routes to TEL if a hands-free call is active. | W `mfl/32.md` · BB `ibus.h:557` (`IBUS_MFL_CMD_VOL_PRESS 0x32`) · bz `mfl/types.ts:3–6` |
| `0x3B` | Button press | RAD `0x68` *or* TEL `0xC8` | 1-byte payload: button-ID nibble + state nibble (press / hold / release). | W `mfl/3b.md` · BB `ibus.h:550` (`IBUS_MFL_CMD_BTN_PRESS 0x3B`) |

---

## Messages where MFL is `DST`

None documented. The MFL is a one-way input device — it sends button events; it does not accept commands.

The only inbound traffic addressed to `0x50` in observed traffic is the `0x01` Ping (from various peers checking the MFL is alive), to which it responds with `0x02` Pong.

---

## Bit fields and enums

### Button mask (`0x3B` byte 1)

The single payload byte combines a button-ID bitfield and a state bitfield.

**Button ID — mask `0b1100_1001` (`0xC9`):**

| Button | Bit | Value |
|---|---|---|
| FORWARD (next-track) | `0b0000_0001` | `0x01` |
| BACK (prev-track) | `0b0000_1000` | `0x08` |
| R/T toggle | `0b0100_0000` | `0x40` |
| TEL (voice / call) | `0b1000_0000` | `0x80` |

**State — mask `0b0011_0000` (`0x30`):**

| State | Bit | Value |
|---|---|---|
| PRESS | `0b0000_0000` | `0x00` |
| HOLD | `0b0001_0000` | `0x10` |
| RELEASE | `0b0010_0000` | `0x20` |

> *Sources:* Wilhelm `mfl/3b.md:31–46`; bimmerz `mfl/types.ts:24–46`. Agreed.

BlueBus uses a slightly different naming convention via constants like `IBUS_MFL_BTN_EVENT_VOICE_PRESS 0x80`, `IBUS_MFL_BTN_EVENT_VOICE_HOLD 0x90`, `IBUS_MFL_BTN_EVENT_VOICE_REL 0xA0` (`ibus.h:553–555`). These are pre-OR'd values (button + state), not separate fields.

#### Voice-button event naming — BlueBus vs Wilhelm

| Source | Claim | Cite |
|---|---|---|
| Wilhelm | TEL button bit = `0x80`; states are independent (`0x00` press, `0x10` hold, `0x20` release). Combined values: press `0x80`, hold `0x90`, release `0xA0`. | `mfl/3b.md:34–46` |
| BlueBus | Single constants for the *pre-OR'd* values: `VOICE_PRESS 0x80`, `VOICE_HOLD 0x90`, `VOICE_REL 0xA0`. | `ibus.h:553–555` |
| bimmerz | Decomposes into button mask + state mask, matches Wilhelm. | `mfl/types.ts:24–46` |

**Resolution:** Both representations describe the same wire bytes. Wilhelm's decomposition is the structurally correct view (each MFL frame has a button field and a state field); BlueBus's flat constants are a convenience for the most-frequently-used events.
**Why:** They are not contradictory — they are two ways of describing the same byte value. Use the decomposed form when emitting frames; use the flat form when matching commonly-seen patterns.

BlueBus also defines `IBUS_MFL_BTN_EVENT_NEXT_REL 0x21` and `IBUS_MFL_BTN_EVENT_PREV_REL 0x28` (`ibus.h:551–552`) — these are the *release* events for the next/prev-track buttons (`0x01 | 0x20` and `0x08 | 0x20` respectively).

### Volume mask (`0x32` byte 1)

**Direction — bit 0:**

| Direction | Value |
|---|---|
| DOWN | `0` |
| UP | `1` |

**Steps — upper nibble** (always `0b0001`, i.e. one step at a time regardless of hold duration).

So every observed `0x32` byte is either `0x10` (down) or `0x11` (up).

> *Sources:* Wilhelm `mfl/32.md:4–7, 20`; bimmerz `mfl/types.ts:3–6`. Agreed.

The MFL does not produce multi-step bytes; if the user holds the volume rocker, the MFL repeats `0x10` / `0x11` frames at the held cadence. The BMBT rotary dial — which does emit multi-step `0x32` bytes (`0x12`, `0x13`, …) — is at `0xF0`, not `0x50`.

---

## Per-message detail

### `0x3B` — Button press

**Direction:** MFL → RAD (`0x68`) *or* MFL → TEL (`0xC8`).

The destination depends on the **R/T toggle** state held inside the MFL. The R/T button (button bit `0x40`) flips an internal latch; subsequent FORWARD/BACK/TEL/voice presses are addressed to TEL while the latch is set and to RAD otherwise.

> *Source:* Wilhelm `mfl/3b.md:50–72` (R/T semantics); bimmerz `mfl/builders.ts:11–23` (encodes the same logic).

**Frame:**

```
50 04 <dst> 3B <button|state> <xor>
```

**Example frames:**

```
50 04 68 3B 08 0F    # BACK,  press,    to RAD
50 04 68 3B 28 2F    # BACK,  release,  to RAD
50 04 68 3B 01 06    # FWD,   press,    to RAD
50 04 C8 3B 00 A7    # TEL,   press,    to TEL  (== voice / answer call)
50 04 C8 3B 80 27    # TEL,   hold,     to TEL
50 04 C8 3B A0 07    # TEL,   release,  to TEL
```

> *Source:* Wilhelm `mfl/3b.md:12–22`.

The `0x00` byte at the fifth position of `50 04 C8 3B 00 A7` is unusual — it has no button bit set but is interpreted as a TEL-press event in context. This appears to be an idle / heartbeat variant the MFL sends to the telephone when in R/T mode without a button physically pressed; behaviour is not fully documented.

### `0x32` — Volume control

**Direction:** MFL → RAD (`0x68`) *or* MFL → TEL (`0xC8`).

The routing rule:

- **Default:** to RAD.
- **If a hands-free call is active:** to TEL.

> *Source:* Wilhelm `mfl/32.md:9`. BlueBus `HandlerIBusMFLButton` (`handler_ibus.c` — line range identified by agent ~1430–1470) implements the same routing.

**Frame:**

```
50 04 <dst> 32 <byte> <xor>
```

where `<byte>` is `0x10` (down) or `0x11` (up).

**Example frames:**

```
50 04 68 32 10 1E    # RAD volume down
50 04 68 32 11 1F    # RAD volume up
50 04 C8 32 10 BE    # TEL volume down (during hands-free call)
50 04 C8 32 11 BF    # TEL volume up
```

> *Source:* Wilhelm `mfl/32.md:24–31`.

---

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — the MFL's `0x32` and `0x3B` arrive at the radio, which integrates them with the GT-driven UI state.
- *subsystems/telephone-ui (planned)* — TEL-routed MFL events (after R/T toggle) drive the telephone UI on chassis with a TEL module.

---

## Open questions / TBC

- **The `0x00` button byte in TEL-routed frames** (e.g., `50 04 C8 3B 00 A7`) — appears to be an idle heartbeat the MFL emits when the R/T toggle is set. No source documents it explicitly. Worth a traffic-capture investigation.
- **R/T toggle persistence across ignition cycles** — does the MFL remember the R/T state across KL-30 → KL-R, or does it default to RAD on every wake? Sources are silent.
- **Hold-event timing thresholds** — what duration does the MFL classify as "hold" vs "press + release"? Not stated.
- **Voice-button → BC127 mapping** — BlueBus's voice constants (`VOICE_PRESS 0x80`, etc.) map to Bluetooth call control (accept, end, voice recognition). See BlueBus `handler_ibus.c:1430–1470` for the live mapping; not folded in here.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:23` — address.
- `firmware/application/lib/ibus.h:169` — `IBUS_CMD_VOLUME_SET 0x32`.
- `firmware/application/lib/ibus.h:550–557` — MFL command and event constants (`IBUS_MFL_CMD_BTN_PRESS`, `IBUS_MFL_CMD_VOL_PRESS`, voice-button events).
- `firmware/application/handler/handler_ibus.c` — `HandlerIBusMFLButton` and related volume-routing logic (identified by survey; line range ~1430–1470).

### Wilhelm-docs
- `mfl/32.md` — volume control bytes.
- `mfl/3b.md` — button mask, state mask, R/T toggle semantics.
- `02.md:56–73` — MFL Pong choreography (in the context of telephone presence).
- `README.md:131` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:33` — address constant.
- `packages/commands/src/devices/mfl/types.ts:3–46` — button and state enums.
- `packages/commands/src/devices/mfl/builders.ts:11–23` — frame construction with R/T-aware destination routing.
