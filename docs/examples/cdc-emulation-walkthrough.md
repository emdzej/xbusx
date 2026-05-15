# Example — CDC emulation walkthrough

**Status:** Draft.

A complete worked walkthrough of CDC emulation — the technique BlueBus uses to deliver Bluetooth audio through a BMW radio. By the end of this page you should understand exactly what frames need to flow, in what order, and what the radio's expectations are.

The conceptual overview is on [`subsystems/cdc-emulation`](../subsystems/cdc-emulation.md); this is the byte-level walkthrough.

## Setup

Pre-conditions:

1. The vehicle has a CDC-capable radio (most do — C43, BM53, BM54, BRCD, BRTP, BM24).
2. **No real CDC is on the bus** at `0x18`. (If one is, you collide with it.)
3. Your hardware has a TH3122 or equivalent transceiver, a UART configured 9 600 8E1, and source-of-audio that can be routed to the audio input.

## Step 1 — Announce

On power-up (KL-R or higher), announce yourself as a CDC:

```
18 04 BF 02 01 A0
```

Decoded: `SRC=0x18` (CDC), `LEN=0x04`, `DST=0xBF` (global broadcast), `CMD=0x02` (announce), variant byte `0x01` (announce bit set), `XOR=0xA0`.

Re-emit the announce every time ignition transitions from KL-30 → KL-R, and (less critically) on receipt of a `0x01` Ping addressed to `0x18` (in which case reply with `0x02 0x00`, not `0x02 0x01`).

> *Source:* Wilhelm `02.md:126`; BlueBus `ibus.c:1720–1749`.

## Step 2 — Wait for the radio's poll

The radio polls the CDC every 1–2 seconds with:

```
68 05 18 38 00 00 4D
```

Decoded: `SRC=0x68` (RAD), `DST=0x18` (CDC), `CMD=0x38` (CDC Request), sub-command `0x00` (GET_STATUS), parameter `0x00`.

You must reply within ~200 ms, or the radio will re-poll and eventually disable the CDC source. **Reply with a status frame** ([Step 3](#step-3--status-reply)).

## Step 3 — Status reply

A status reply is a `0x39` frame:

```
18 0A 68 39 <status> <function> <error> <magazine> <unknown> <disc> <track> <xor>
```

For an idle "ready but not playing" state:

```
18 0A 68 39 00 02 00 3F 00 01 01 <XOR>
```

Decoded:

| Field | Value | Meaning |
|---|---|---|
| `status` | `0x00` | STOP |
| `function` | `0x02` | NOT_PLAYING |
| `error` | `0x00` | no errors |
| `magazine` | `0x3F` | all 6 discs loaded |
| `unknown` | `0x00` | (always 0) |
| `disc` | `0x01` | disc 1 |
| `track` | `0x01` | track 1 |

Send this **with high priority** so the TX ring pushes it to the head — the radio needs the reply fast. See [`protocol/error-handling`](../protocol/error-handling.md#high-priority-bypass).

> *Source:* [`devices/cdc.md`](../devices/cdc.md#0x39--cdc-status-response).

## Step 4 — User selects CDC source

The user pushes "Mode" on the BMBT until the radio's display reads "CD 1-01" (or similar). The radio sends:

```
68 05 18 38 03 00 4E    # START_PLAYING
```

Reply *immediately* with a status reflecting the user's request — `status = 0x02 PLAYING`, `function = 0x09 PLAYING`:

```
18 0A 68 39 02 09 00 3F 00 01 01 <XOR>
```

Note: **don't wait for the audio to actually start.** BlueBus's pragmatic rule is "reply with the requested state, not the actual state" — the radio sees PLAYING and stops re-polling; the audio path catches up in the background.

> *Source:* BlueBus `handler_ibus.c:443–446`.

## Step 5 — Switch the DSP input (if applicable)

On chassis with a DSP module (`0x6A`), the DSP needs to route to your audio input. If your audio is a digital S/PDIF stream coming from the BlueBus hardware:

```
68 05 6A 36 A0 00 <XOR>    # IBUS_DSP_CONFIG_SET_INPUT_SPDIF
```

If your audio is on the analog CDC-position connector, no DSP switch is needed (the analog path goes straight to the amp).

> *Source:* BlueBus `ibus.h:117–119`; `handler_ibus.c:474, 536, 621`.

## Step 6 — Periodic status updates

While playing, send updated `0x39` status frames every time something changes:

- Track change (you advanced to the next song).
- Pause / resume.
- Disc change (if emulating multi-disc).

You don't need to send status on every audio sample — the radio doesn't care that fine-grained. Send on actual state transitions.

## Step 7 — Handle the radio's commands

Beyond `START_PLAYING`, the radio will send various commands while the CDC is active:

| Cmd | Action | Suggested reply |
|---|---|---|
| `0x38 0x00` | GET_STATUS | Current status |
| `0x38 0x01` | STOP_PLAYING | Status with `status = 0x00, function = 0x02` |
| `0x38 0x02` | PAUSE_PLAYING | Status with `status = 0x01, function = 0x0C` |
| `0x38 0x03` | START_PLAYING | Status with `status = 0x02, function = 0x09` |
| `0x38 0x04 <p>` | SEEK | Status with `status = 0x03` (FF) or `0x04` (REV); param byte: `0x00` reverse, else forward |
| `0x38 0x06 <d>` | CD_CHANGE | Status with the new disc number |
| `0x38 0x07` | SCAN | Status with `function = 0x19` |
| `0x38 0x08` | RANDOM_MODE | Status with `function = 0x29` |
| `0x38 0x0A <d>` | CHANGE_TRACK | Status with the new track number |
| `0x38 0x05 <d>` | CHANGE_TRACK_BLAUPUNKT | Same as `0x0A` |

> *Source:* [`devices/cdc.md`](../devices/cdc.md#0x38-sub-commands-request).

## Step 8 — User switches away

When the user selects another source (FM, AM, tape, etc.), the radio sends `STOP_PLAYING`. Reply with idle status:

```
18 0A 68 39 00 02 00 3F 00 01 01 <XOR>
```

Then switch the DSP input back to radio (`0x36 0xA1`) and stop your audio output.

## Step 9 — Ignition off

At the next `0x11` ignition broadcast showing `KL-30 (off)`, stop responding to any further `0x38` polls. The radio will be powered off shortly.

BlueBus uses a synthetic `IBUS_IGNITION_KL99` to handle the edge case where the radio asks for playback at `KL-30` (the user has the engine off but the radio on for accessory listening) — see [`subsystems/ignition-state`](../subsystems/ignition-state.md#bluebuss-synthetic-kl-99).

## A complete sample exchange

Annotated trace of an "idle → user-starts-CD → user-skips-track → user-stops" sequence:

```
T+0    ←  18 04 BF 02 01 A0                                  # we announce
T+0    ↺                                                      # radio receives, registers us
T+1500 ←  68 05 18 38 00 00 4D                                # radio polls
T+1500 →  18 0A 68 39 00 02 00 3F 00 01 01 <XOR>              # we reply: STOP+NOT_PLAYING

T+3000 ←  68 05 18 38 00 00 4D                                # radio polls
T+3000 →  18 0A 68 39 00 02 00 3F 00 01 01 <XOR>              # same idle status

T+5200 ←  68 05 18 38 03 00 4E                                # user presses MODE → START
T+5200 →  18 0A 68 39 02 09 00 3F 00 01 01 <XOR>              # we reply: PLAYING
T+5200 →  68 05 6A 36 A0 00 <XOR>                             # switch DSP to S/PDIF
T+5200 ↺                                                      # we start audio output

T+5800 ←  68 05 18 38 00 00 4D                                # radio polls
T+5800 →  18 0A 68 39 02 09 00 3F 00 01 01 <XOR>              # still playing

T+9100 ←  68 05 18 38 0A 01 47                                # user presses NEXT
T+9100 ↺                                                      # we advance track
T+9100 →  18 0A 68 39 02 09 00 3F 00 01 02 <XOR>              # PLAYING, track 2 now

T+12500 ←  68 05 18 38 01 00 4F                               # user presses MODE → STOP
T+12500 →  18 0A 68 39 00 02 00 3F 00 01 02 <XOR>             # we reply: STOP+NOT_PLAYING
T+12500 →  68 05 6A 36 A1 00 <XOR>                            # switch DSP back to radio
T+12500 ↺                                                      # we stop audio
```

Notes on the trace:

- The `←` / `→` arrows indicate frame direction from our perspective: `←` means received, `→` means transmitted.
- Times in milliseconds; the radio's exact polling cadence varies (1–2 s typical).
- `<XOR>` is the per-frame XOR — computed at emission time.

## Going further

- **Multi-disc emulation:** report `disc` and `track` corresponding to different Bluetooth devices or playlist contexts. The radio's "disc" buttons then switch between these contexts.
- **CCM messages while playing:** send `0x1A` to the IKE to display the current track title on the check-control area. See [`examples/displaying-text-on-cluster`](displaying-text-on-cluster.md).
- **Volume control:** the radio's volume goes to the audio output; the radio adjusts it. You don't need to handle volume yourself unless you're routing audio through a hands-free / TEL path (in which case the MFL / BMBT `0x32` reaches you instead, see [`devices/tel.md`](../devices/tel.md)).

## Cross-cutting links

- [`subsystems/cdc-emulation`](../subsystems/cdc-emulation.md) — conceptual overview, audio routing, ignition coupling.
- [`devices/cdc.md`](../devices/cdc.md) — every byte of every frame.
- [`devices/rad.md`](../devices/rad.md) — what the radio expects.
- [`devices/dsp.md`](../devices/dsp.md) — DSP input switching.
- [`protocol/error-handling`](../protocol/error-handling.md#high-priority-bypass) — high-priority TX path for the time-sensitive `0x39` reply.
