# DSP (0x6A) — Digital Sound Processor

**Status:** Draft.

**Role:** The audio post-processor — sits downstream of the radio's audio output and adds equalisation, surround / DSP modes, and routing between audio sources. On chassis equipped with DSP, the radio routes its analog audio through the DSP module rather than directly to the amplifier.

**Buses:** K/I.

**Chassis coverage:** Optional across most chassis. Where present, the DSP and radio negotiate the audio source via `0x36`.

**Variants:** None at the protocol layer. A separate **DSP Controller** at `0xEA` (DSPC) exists on E38 — see [`dspc`](dspc.md) *(planned)*.

---

## Address

`0x6A`. *Sources:* BlueBus `ibus.h:27`, Wilhelm `README.md:139`, bimmerz `devices.ts:38` — agreed.

---

## Messages where DSP is `SRC`

Documented coverage is thin. The DSP module emits status / config-acknowledgement frames in response to `0x36` commands, but the exact format is not captured in the surveyed sources.

> *TBC:* Capture and characterise DSP's outbound messages on a chassis with DSP installed (E38 / E39 Premium audio packages).

---

## Messages where DSP is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x36` | Config set | RAD `0x68` | Switch audio input source. Sub-command byte (after `0x36`) selects the source. | BB `ibus.h:117` (`IBUS_DSP_CMD_CONFIG_SET`) |

The radio drives input switching when it changes between its own tuner and an external source (CDC, BlueBus's S/PDIF stream, etc.).

---

## Bit fields and enums

### `0x36` sub-commands

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_DSP_CONFIG_SET_INPUT_RADIO` | `0xA1` | Switch DSP input to the radio's analog stream. |
| `IBUS_DSP_CONFIG_SET_INPUT_SPDIF` | `0xA0` | Switch DSP input to S/PDIF (used by BlueBus to deliver digital Bluetooth audio). |

> *Source:* BlueBus `ibus.h:117–119`.

---

## Per-message detail

### `0x36` — Config set

**Direction:** RAD `0x68` → DSP `0x6A`.

```
68 05 6A 36 <sub_cmd> <param> <xor>
```

BlueBus issues `0x36` with `0xA0` (S/PDIF input) when it starts playing Bluetooth audio and `0xA1` (radio input) when it stops, switching the DSP routing without involving the radio's UI:

> *Source:* BlueBus `handler_ibus.c:474, 536, 621` — three callsites of `IBusCommandDSPSetMode`.

---

## Cross-cutting subsystems

- *subsystems/cdc-emulation (planned)* — BlueBus's emulated CDC drives DSP input switching as part of its play / stop choreography.

---

## Open questions / TBC

- **DSP outbound messages.** What does the DSP send when its config changes, or on power-up? Not documented in any surveyed source.
- **Status / error reporting.** Does the DSP emit fault frames on bus errors, missing-input detection, or temperature events?
- **DSPC (`0xEA`) relationship.** The E38 has a separate DSP Controller at `0xEA`. Is it a parent / coordinator of the `0x6A` audio processor, or a completely independent device? See [`dspc`](dspc.md) *(planned)*.
- **Wilhelm coverage.** Wilhelm `README.md:139` lists the device but no per-command directory exists under `wilhelm-docs/dsp/`. The page header in Wilhelm's command index does not surface DSP commands; treat DSP as an under-documented module.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:27` — address.
- `firmware/application/lib/ibus.h:116–119` — `IBUS_DSP_CMD_CONFIG_SET 0x36`, input-radio / input-SPDIF constants.
- `firmware/application/lib/ibus.c` — `IBusCommandDSPSetMode` encoder.
- `firmware/application/handler/handler_ibus.c:474, 536, 621` — DSP-switch callsites within the CDC handler.

### Wilhelm-docs
- `README.md:139` — device-table entry. No per-command pages.

### bimmerz
- `packages/bus/src/devices.ts:38` — address.
