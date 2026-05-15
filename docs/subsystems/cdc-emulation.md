# CDC emulation

**Status:** Draft.

The CDC (`0x18`) protocol is the simplest way to inject audio into a BMW infotainment system from an external source. By presenting yourself as a CD changer, you can drive the radio's source-selection, get audio routed to the speakers, and use the radio's built-in track / disc navigation buttons.

**BlueBus is built on this idea.** Its `IBUS_DEVICE_BLUEBUS == IBUS_DEVICE_CDC` define (`ibus.h:46`) reuses the CDC address on the assumption that no real CDC will coexist. The full request / response surface is documented at [`devices/cdc.md`](../devices/cdc.md); this page covers the **choreography** — the order of frames, the timing constraints, the DSP-routing side effects, and the practical gotchas.

## The basic loop

1. **Power up.** The emulator announces itself at the CDC address: `18 04 BF 02 01 A0` (`0x02` Pong with announce bit set).
2. **Radio polls.** Periodically (every 1–2 seconds) the radio sends `0x38 0x00` (`GET_STATUS`) to the emulator. If it doesn't get a `0x39` reply quickly enough, it re-polls — and after a few unanswered polls, it disables the CDC source.
3. **Status replies.** The emulator answers each poll with a `0x39` status frame containing current state, function, magazine, disc, and track.
4. **User selects CD source.** The user presses Mode on the BMBT until the radio chooses CDC. The radio sends `0x38 0x03` (`START_PLAYING`); the emulator switches its audio output on and replies with `0x39` reporting `PLAYING`.
5. **Playback controls.** The user presses next/previous track on the BMBT or MFL; the radio forwards those as `0x38 0x0A` (`CHANGE_TRACK`) or `0x38 0x05` (Blaupunkt variant). The emulator advances and replies with updated `0x39`.

## Sub-command reference

The full request sub-command list is on [`devices/cdc.md`](../devices/cdc.md#0x38-sub-commands-request). The most-frequently-seen are:

| Sub-cmd | Action | Typical context |
|---|---|---|
| `0x00` | `GET_STATUS` | Radio's periodic poll. |
| `0x01` | `STOP_PLAYING` | Radio switches away from CDC source. |
| `0x02` | `PAUSE_PLAYING` | User pauses. |
| `0x03` | `START_PLAYING` | User selects CDC source. |
| `0x04` | `SEEK` | Hold next/prev: param byte `0x00` = reverse, non-zero = forward. |
| `0x0A` | `CHANGE_TRACK` | Track skip (standard). |
| `0x05` | `CHANGE_TRACK_BLAUPUNKT` | Track skip (Blaupunkt-branded head units). |
| `0x06` | `CD_CHANGE` | Change disc. |
| `0x07` | `SCAN` | Scan mode. |
| `0x08` | `RANDOM_MODE` | Shuffle mode. |

## `0x39` status response (layout)

A 10-byte frame on 1997-era chassis, 14-byte on 2001+. The first 10 bytes are the same on both:

```
18 0A 68 39 <status> <function> <error> <magazine> <unknown> <disc> <track> <xor>
```

- **`status`** — see [CDC status table](../devices/cdc.md#0x39-status-byte-values).
- **`function`** — playing / paused / scanning / random — see [function table](../devices/cdc.md#0x39-function-byte-values).
- **`error`** — error flags: `0x02` high temp, `0x08` no disc, `0x10` no magazine.
- **`magazine`** — bitfield of loaded slots. `0x3F` = all six.
- **`disc`** / **`track`** — current values.

BlueBus emits this frame with **high priority** (`IBUS_MSG_PRIORITY_HIGH`, `ibus.c:1766–1799`) — pushed to the head of the TX ring so the radio sees the reply before it re-polls. See [`protocol/error-handling`](../protocol/error-handling.md#high-priority-bypass).

## Timing requirement

The radio expects a status reply within ~200 ms of a request (exact threshold varies by radio variant). Without a reply, it re-polls. After ~3 unanswered polls, the radio disables the CDC source and falls back to FM.

A working emulator must therefore:

- Reply to every `0x38` immediately, on the same loop tick if possible.
- Use the **TX-buffer-high-priority** path if the regular ring is backed up.
- Treat the radio's "what's the status" as a heartbeat rather than a query that needs accurate state.

BlueBus's pragmatic approach: **reply with the requested state, not the actual Bluetooth state**. If the radio asks the emulator to start playing, the emulator immediately replies `0x39` with `status = PLAYING` even before the Bluetooth audio link is fully up. This avoids re-polling loops.

> *Source:* BlueBus `handler_ibus.c:443–446` and `ibus.c:1766–1799`.

## Audio routing side effects

The CDC source is **acoustically distinct** from the radio's own tuner. On chassis with DSP (`0x6A`), the DSP needs to be told which input to use:

- `IBUS_DSP_CMD_CONFIG_SET 0x36` + `IBUS_DSP_CONFIG_SET_INPUT_RADIO 0xA1` — DSP listens to the radio's analog output.
- `IBUS_DSP_CMD_CONFIG_SET 0x36` + `IBUS_DSP_CONFIG_SET_INPUT_SPDIF 0xA0` — DSP listens to the BlueBus's S/PDIF digital stream.

BlueBus switches the DSP to S/PDIF on `START_PLAYING` and back to radio on `STOP_PLAYING`:

> *Source:* BlueBus `handler_ibus.c:474, 536, 621`.

On chassis without a DSP, the analog audio path from the CDC-position connector is routed straight to the amplifier — no protocol-level routing needed.

## Ignition coupling

CDC playback at engine-off needs special handling. The radio may request `START_PLAYING` while ignition is at `KL-30`. BlueBus introduces a synthetic ignition state `IBUS_IGNITION_KL99 0x08` (`ibus.h:271`) for this case — see [`subsystems/ignition-state`](ignition-state.md#bluebuss-synthetic-kl-99).

The synthetic state is internal to BlueBus; it is not transmitted on the bus.

## Magazine emulation

Real CDCs have a 6-disc magazine; some have 7- or 8-disc variants. BlueBus emulates **single-disc** by default (`magazine = IBUS_CDC_DISC_LOADED_1 0x01`) — see [`devices/cdc.md`](../devices/cdc.md#disc-count--magazine-bitfield). Some UI modes report "all 6 discs loaded" (`0x3F`) instead, which the radio renders as a 6-track menu where each "disc" is mapped to a virtual Bluetooth source.

> *Source:* BlueBus `handler_ibus.c:547–554`.

## Variant-specific quirks

### Blaupunkt track-change (`0x05` vs `0x0A`)

A Blaupunkt-branded head unit sends `0x38 0x05` for track change; everyone else sends `0x38 0x0A`. BlueBus treats them identically — both advance the track regardless of which sub-cmd was sent. See [`devices/cdc.md`](../devices/cdc.md#variants).

### C43 vs newer radios

The C43 radio (the earliest "Business" variant) has a slightly different status-frame expectation — see [`devices/rad.md`](../devices/rad.md#variants). BlueBus's UI module emulates this via the `ui/cd53.c` code path.

### 1997 vs 2001+ status-frame length

The 2001+ extended frame (14 bytes) is **never broken by sending a 10-byte one** — the radio accepts both. BlueBus always emits the 10-byte form. Software targeting only post-2001 chassis can use the extended form, but there's no obligation.

## Cross-cutting links

- [`devices/cdc.md`](../devices/cdc.md) — per-command detail.
- [`devices/rad.md`](../devices/rad.md) — radio side: how the user's source-select drives the `0x38` flow.
- [`devices/dsp.md`](../devices/dsp.md) — DSP input switching.
- [`subsystems/ignition-state`](ignition-state.md#bluebuss-synthetic-kl-99) — the synthetic `KL-99` engine-off-playback case.

## Open questions / TBC

- **Exact re-poll thresholds per radio variant.** BlueBus tunes for the common case; the precise ms thresholds per radio type are not numerically documented.
- **Disc-change protocol on multi-disc emulation.** When BlueBus reports a 6-disc magazine and the user selects disc 3 via the radio, the `CD_CHANGE` sub-cmd carries a parameter — but the parameter byte's semantics for multi-disc emulation aren't fully documented in the surveyed sources.
- **What the radio does with `0x39` status changes that aren't poll-driven.** Some BlueBus-emitted status frames are sent on track change, pause, etc., not just in response to `0x38`. The radio appears to accept these too.

## Sources

- BlueBus `ibus.h:46, 73–106` — CDC constants.
- BlueBus `ibus.c:1720–1799` — encoder bodies.
- BlueBus `handler_ibus.c:438–588` — the `HandlerIBusCDCStatus` dispatcher and the per-sub-command branching.
- BlueBus `ui/cd53.c` — UI emulation that drives the radio side.
- Wilhelm `cdc/39.md` — `0x39` status detail.
- Wilhelm `02.md:126` — CDC announce.
