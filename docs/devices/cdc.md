# CDC (0x18) — CD Changer

**Status:** Draft.

**Role:** A multi-disc audio source on the I/K-bus. The CDC presents itself as a media player that the head unit (RAD `0x68`) controls via play / pause / track / disc / scan / random / seek commands, and that periodically reports its state back. The protocol around `0x18` is also the foundation for the **BlueBus** aftermarket integration — BlueBus emulates a CDC on this same address, allowing it to deliver Bluetooth audio through the radio as if it were a real changer.

**Buses:** K/I.

**Chassis coverage:** All. A second CDC-style address `0x76` (CDCD — DIN size) is documented for chassis equipped with a different physical changer (see [`cdcd`](cdcd.md) *(planned)*).

**Variants:** None at announce. The protocol distinguishes a **Blaupunkt** track-change command (`0x05`) from the standard one (`0x0A`) — see [Variants](#variants-1).

---

## Address

`0x18`. *Sources:* BlueBus `ibus.h:15`, Wilhelm `README.md:117`, bimmerz `devices.ts:23` — agreed.

### BlueBus address reuse

```c
#define IBUS_DEVICE_BLUEBUS IBUS_DEVICE_CDC
```

> *Source:* BlueBus `ibus.h:46`.

BlueBus reuses the CDC address on the assumption that **no real CDC will coexist** with the BlueBus retrofit. The comment in `ibus.h:46` makes the assumption explicit: "Reuse CDC Address as we know a CDC will never be present with the BlueBus."

If you are writing software that runs alongside BlueBus, do not also try to emulate a CDC on `0x18` — there will be only one.

---

## Variants

The CDC does not carry a variant byte in its `0x02` announce — Wilhelm `02.md:126` lists it as `0x00` (no variant signature). What does vary is one **track-change subcommand**:

| Constant | Value | Notes |
|---|---|---|
| `IBUS_CDC_CMD_CHANGE_TRACK` | `0x0A` | Standard track-change subcommand. |
| `IBUS_CDC_CMD_CHANGE_TRACK_BLAUPUNKT` | `0x05` | Used when the head unit is a Blaupunkt-branded radio. |

> *Source:* BlueBus `ibus.h:81, 83`.

BlueBus's CDC handler treats the two subcommands identically when *responding* — it advances the track regardless of which subcommand was used (`handler_ibus.c:482–487`).

---

## Announce / Pong

```
18 04 BF 02 01 A0
```

Sent as part of module boot; reused in ping/pong echoes.

> *Source:* Wilhelm `02.md:126`.

BlueBus's emulator sends the announce via `IBusCommandCDCAnnounce()` (`ibus.c:1720–1724`) — payload `{0x02, 0x01}`. It also handles ping (`0x01`) replies via `IBusCommandCDCPollResponse()` (`ibus.c:1735–1749`), which sends `{0x02, 0x00}` (pong without the announce bit).

---

## Messages where CDC is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x02` | Announce / Pong | broadcast | Module presence. | W `02.md:126` · BB `ibus.c:1720–1749` |
| `0x39` | CDC status | RAD `0x68` | Periodic playback-state report. Length varies by chassis: 10 bytes on 1997 models, 14 bytes on 2001+. | W `cdc/39.md` · BB `ibus.h:74` (`IBUS_COMMAND_CDC_RESPONSE`) |

---

## Messages where CDC is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x01` | Ping | any | Liveness probe. CDC replies with `0x02 0x00`. | W `02.md` |
| `0x38` | CDC request | RAD `0x68` | Play / pause / track / disc / scan / random control. Sub-command byte after `0x38` selects the action. | W `cdc/39.md:140–145` · BB `ibus.h:73` (`IBUS_COMMAND_CDC_REQUEST`) |

---

## Bit fields and enums

### `0x38` sub-commands (request)

| Constant | Value | Action |
|---|---|---|
| `IBUS_CDC_CMD_GET_STATUS` | `0x00` | Request status (CDC responds with `0x39`). |
| `IBUS_CDC_CMD_STOP_PLAYING` | `0x01` | Stop playback. |
| `IBUS_CDC_CMD_PAUSE_PLAYING` | `0x02` | Pause. |
| `IBUS_CDC_CMD_START_PLAYING` | `0x03` | Start playback. |
| `IBUS_CDC_CMD_SEEK` | `0x04` | Seek; parameter byte `0x00` = reverse, non-zero = forward. |
| `IBUS_CDC_CMD_CHANGE_TRACK_BLAUPUNKT` | `0x05` | Change track (Blaupunkt-branded radios). |
| `IBUS_CDC_CMD_CD_CHANGE` | `0x06` | Change disc. |
| `IBUS_CDC_CMD_SCAN` | `0x07` | Scan mode. |
| `IBUS_CDC_CMD_RANDOM_MODE` | `0x08` | Random / shuffle mode. |
| `IBUS_CDC_CMD_CHANGE_TRACK` | `0x0A` | Change track (standard). |

> *Source:* BlueBus `ibus.h:77–86`.

### `0x39` status byte values

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_CDC_STAT_STOP` | `0x00` | Stopped. |
| `IBUS_CDC_STAT_PAUSE` | `0x01` | Paused. |
| `IBUS_CDC_STAT_PLAYING` | `0x02` | Playing. |
| `IBUS_CDC_STAT_FAST_FWD` | `0x03` | Fast-forward. |
| `IBUS_CDC_STAT_FAST_REV` | `0x04` | Fast-rewind. |
| (next track) | `0x05` | Wilhelm-only naming: track change in progress (next). |
| (prev track) | `0x06` | Wilhelm-only naming: track change in progress (previous). |
| `IBUS_CDC_STAT_END` | `0x07` | End of CD / pending. |
| `IBUS_CDC_STAT_LOADING` | `0x08` | Magazine / disc loading. |
| (magazine checking) | `0x09` | Wilhelm-only: magazine is being checked. |
| (magazine ejected) | `0x0A` | Wilhelm-only: magazine ejected. |

> *Sources:* BlueBus `ibus.h:88–94`; Wilhelm `cdc/39.md:50–60`.

### `0x39` function byte values

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_CDC_FUNC_NOT_PLAYING` | `0x02` | Audio output disabled. |
| `IBUS_CDC_FUNC_PLAYING` | `0x09` | Audio output enabled. |
| `IBUS_CDC_FUNC_PAUSE` | `0x0C` | Paused (audio off, position held). |
| `IBUS_CDC_FUNC_SCAN_MODE` | `0x19` | Scan mode. |
| `IBUS_CDC_FUNC_RANDOM_MODE` | `0x29` | Random mode. |

> *Source:* BlueBus `ibus.h:96–100`.

On **2001+** chassis the function byte may be OR'd with `0x80` to indicate audio routing — see [Open questions](#open-questions--tbc).

### Disc-count / magazine bitfield

The "disc count" byte in `0x39` is a bitfield indicating which magazine slots are loaded:

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_CDC_DISC_LOADED_1` | `0x01` | Slot 1 loaded. |
| `IBUS_CDC_DISC_LOADED_6` | `0x20` | Slot 6 loaded. |
| `IBUS_CDC_DISC_LOADED_7` | `0x40` | Slot 7 loaded (8-disc magazines). |
| `IBUS_CDC_DISC_LOADED_ALL` | `0x3F` | All six slots loaded (slots 1–6 set). |

> *Source:* BlueBus `ibus.h:102–105`.

---

## Per-message detail

### `0x38` — CDC request

**Direction:** RAD `0x68` → CDC `0x18`.

**Frame:**

```
68 05 18 38 <sub_cmd> <param> <xor>
```

`<param>` is sub-command-specific:

- For `SEEK` (`0x04`): `0x00` = seek reverse, non-zero = seek forward.
- For `CHANGE_TRACK` / `CHANGE_TRACK_BLAUPUNKT`: direction / count.
- For most others: `0x00`.

**Example frames:**

```
68 05 18 38 03 00 4E     # start playing
68 05 18 38 00 00 4D     # get status
68 05 18 38 01 00 4F     # stop playing
68 05 18 38 02 00 4C     # pause playing
68 05 18 38 0A 01 47     # change track forward (standard)
```

> *Source:* Wilhelm `cdc/39.md:140–145`. BlueBus dispatches via `HandlerIBusCDCStatus` (`handler_ibus.c:450–588`).

### `0x39` — CDC status response

**Direction:** CDC `0x18` → RAD `0x68`.

**Frame (1997-era, 10 bytes total = 7-byte payload after CMD):**

```
18 0A 68 39 <status> <function> <error> <magazine> <unknown> <disc> <track> <xor>
```

| Offset | Byte | Field | Notes |
|---|---|---|---|
| 4 | 1 | `status` | See status table above. |
| 5 | 1 | `function` | See function table above. On 2001+ may be OR'd with `0x80`. |
| 6 | 1 | `error flags` | `0x02` = high temp · `0x08` = no disc · `0x10` = no magazine. |
| 7 | 1 | `magazine bitfield` | See disc-count constants. |
| 8 | 1 | `unknown` | Always `0x00` in observed traffic. |
| 9 | 1 | `disc number` | BCD or integer (varies by chassis). |
| 10 | 1 | `track number` | BCD. |

On **2001+** chassis the payload extends to 14 bytes (`LEN = 0x0E`) with extra trailing fields whose semantics are not exhaustively documented.

> *Source:* Wilhelm `cdc/39.md:26–31, 35–46, 62–124`.

**Example frame:**

```
18 0A 68 39 02 09 00 01 00 01 09 41
# status PLAYING (0x02), function PLAYING (0x09), no errors,
# magazine slot 1 loaded (0x01), disc 1, track 9
```

> *Source:* Wilhelm `cdc/39.md:16`.

BlueBus encodes status responses via `IBusCommandCDCStatus()` (`ibus.c:1766–1799`) — sent with **high priority** (`IBUS_MSG_PRIORITY_HIGH`) to ensure the radio sees them promptly. If the CDC fails to reply quickly enough, the radio re-requests; BlueBus replies immediately with the radio's requested state (not the real Bluetooth state) to short-circuit the loop (`handler_ibus.c:443–446`).

---

## Cross-cutting subsystems

- *subsystems/cdc-emulation (planned)* — the primary BlueBus masquerade. The full walkthrough — radio sending `0x38`, BlueBus mapping to Bluetooth commands (`BTCommandPlay`, etc.), reporting `0x39` status, audio routing through the DSP, and the timing constraints — lives in the subsystem page. *[examples/cdc-emulation-walkthrough (planned)](../examples/cdc-emulation-walkthrough.md)* will work through a complete example.
- **DSP integration** — `START_PLAYING` triggers a DSP input switch to S/PDIF if configured (BlueBus `handler_ibus.c:469–475`); `STOP_PLAYING` reverts (`:532–537`). See *[dsp](dsp.md) (planned)*.
- **Ignition** — `START_PLAYING` activates BlueBus's internal `IBUS_IGNITION_KL99 0x08` state (`ibus.h:271`) — a synthetic ignition level used when the radio asks for playback while real ignition is off.

---

## Open questions / TBC

- **Blaupunkt `0x05` vs standard `0x0A` track-change.** When does each apply? BlueBus's handler treats them identically, but the protocol distinguishes them. The Blaupunkt variant is presumably emitted by Blaupunkt-branded head units (BRCD, BRTP — see [`rad.md`](rad.md#variants)) but no source confirms the trigger condition explicitly.
- **2001+ extended `0x39` frames.** The trailing bytes 10–13 (in the 14-byte variant) are not documented in the surveyed sources. Capture and characterise.
- **Function-byte `0x80` audio bit.** Wilhelm `cdc/39.md:62–77` mentions a "possible flag for CDC outputting audio" — duplicates the status bitfield partially. Confirm semantics.
- **CDC announce signature.** Wilhelm `02.md:126` says "All?" for variants — confirm the signature byte is always `0x00` across CDC hardware revisions.
- **bimmerz CDC coverage.** Files exist but contain only stubs (no active builders / parsers). Don't rely on bimmerz here.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:15` — address.
- `firmware/application/lib/ibus.h:46` — `IBUS_DEVICE_BLUEBUS` reuse.
- `firmware/application/lib/ibus.h:73–106` — every CDC constant: request / response commands, sub-commands, status / function codes, disc-count bitfield.
- `firmware/application/lib/ibus.h:271` — `IBUS_IGNITION_KL99 0x08` (synthetic ignition for CDC playback).
- `firmware/application/lib/ibus.c:1720–1799` — encoder functions: `IBusCommandCDCAnnounce`, `IBusCommandCDCPollResponse`, `IBusCommandCDCStatus`.
- `firmware/application/handler/handler_ibus.c:438–588` — `HandlerIBusCDCStatus` (the dispatcher that maps `0x38` sub-commands to Bluetooth playback actions).

### Wilhelm-docs
- `cdc/39.md` — `0x39` status response: status / function / error / magazine / disc / track bytes, examples, request frames.
- `02.md:126` — CDC announce frame.
- `README.md:117` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:23` — address.
- `packages/commands/src/devices/cdc/` — scaffolding only; no active codecs.
