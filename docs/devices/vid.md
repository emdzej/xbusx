# VID / VM (0xED) — Video Module

**Status:** Draft.

**Role:** The video module — TV tuner and / or auxiliary video-source manager on chassis equipped with rear-seat entertainment or in-cabin TV. Drives the on-board monitor over `0x4F` (monitor control) when its video source is active, and identifies itself for source-selection coordination with the BMBT and GT.

**Buses:** I.

**Chassis coverage:** E38, E39 (with TV / rear-entertainment options). Optional.

**Variants:** MK1 VM and "MK3" VM listed in Wilhelm `02.md:134` as `0x00` — no variant signature byte distinguishes them at announce.

---

## Address

`0xED`. *Sources:* BlueBus `ibus.h:42` (`IBUS_DEVICE_VM`), Wilhelm `README.md:169`, bimmerz `devices.ts:57` (`VID`) — agreed on address. Wilhelm and bimmerz use the name **VID** / "Video Module"; BlueBus uses **VM** ("Video Module"). Same device.

Wilhelm `README.md:169` marks the bus as `I`; Wilhelm `address.md:77` marks it `K`. Resolution: **I** (video module is part of the I-bus nav / entertainment stack on E38/E39).

---

## Announce / Pong

```
ED 04 FF 02 01 15
```

> *Source:* Wilhelm `02.md:134`.

`0xFF` destination (LOC / bus-local broadcast). Pong response (per Wilhelm `02.md:68–72`):

```
ED 04 3B 02 00 D0
```

(VM replies to BMBT's ping with announce-bit clear.)

---

## Messages where VID is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x02` | Announce / Pong | broadcast / BMBT | Module presence — broadcast at power-up, also pong to pings. | W `02.md:68–72, 134` |
| `0x4F` | Monitor control | BMBT `0xF0` | Power, video source, encoding, aspect — drives the BMBT screen when the VM is the active source. | W `bmbt/4f.md` (example `ED 05 F0 4F 11 12 54`) |

> *Source:* Wilhelm `bmbt/4f.md` shows the VM-originated example explicitly: `ED 05 F0 4F 11 12 54` = TV source, 16:9, NTSC.

---

## Messages where VID is `DST`

Not exhaustively documented. The VM consumes BMBT button presses (`0x47` / `0x48`) when its source is active, and likely receives configuration frames from the GT when the user selects TV mode.

> *TBC:* Catalogue VID-bound traffic from a real E38 TV-equipped vehicle.

---

## Bit fields and enums

The VM uses the **video-source enum** shared with BMBT (`ibus.h:108–110`):

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_VIDEO_SOURCE_NAV_GT` | `0` | NAV / GT graphics. |
| `IBUS_VIDEO_SOURCE_TV` | `1` | TV tuner. |
| `IBUS_VIDEO_SOURCE_VM_GT` | `2` | VM-routed GT graphics (for picture-in-picture or rear). |

> *Source:* BlueBus `ibus.h:108–110`.

The `0x4F` byte format (power / source in byte 1; encoding / aspect in byte 2) is documented on [`bmbt.md`](bmbt.md#0x4f--monitor-control).

---

## Per-message detail

### `0x4F` — Monitor control (VM-driven)

**Direction:** VM `0xED` → BMBT `0xF0`.

**Example frame:**

```
ED 05 F0 4F 11 12 54
# byte 1 = 0x11 → power ON (0x10) + TV source (0x01)
# byte 2 = 0x12 → NTSC (0x02) + 16:9 (0x10)
```

> *Source:* Wilhelm `bmbt/4f.md`.

When the BMBT or GT switches to a non-VM source, the VM stops emitting `0x4F` and the GT takes over driving the monitor.

---

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — the VM participates by setting the BMBT's video source when it claims the screen for TV.
- BMBT monitor control (see [`bmbt.md`](bmbt.md#0x4f--monitor-control)) — VM and GT are both legitimate sources of `0x4F`.

---

## Open questions / TBC

- **VM control surface.** How does the VM receive channel-change, mute, and aspect-override commands from the user? Likely BMBT `0x48` button presses routed by destination, but the routing rules aren't documented in the surveyed sources.
- **MK1 vs MK3 VM differences.** Wilhelm lists both at `0x00` signature — they presumably differ in supported encodings or aspect modes, but the protocol-level difference is not documented.
- **TV tuner channel-list protocol.** Whether the VM exposes the channel list to the GT (analogous to the NG-Radio `0xD4`) is unknown.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:42` — address (`IBUS_DEVICE_VM`).
- `firmware/application/lib/ibus.h:107–110` — video-source enum.
- `firmware/application/handler/handler_ibus.c` — `HandlerIBusVMIdentResp` (variant ident — minimal).

### Wilhelm-docs
- `02.md:68–72, 134` — announce frame and pong choreography example.
- `bmbt/4f.md` — VM-driven monitor-control example frame.
- `README.md:169` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:57` — address (`VID`).
