# GTF (0x43) — Rear Graphics Stage

**Status:** Stub.

**Role:** A second graphics terminal for rear-seat entertainment — the rear-screen counterpart to the GT (`0x3B`). Renders nav / video / DVD on a screen mounted behind the front headrests.

**Buses:** I. **Chassis coverage:** E38 with the rear-entertainment package.

## Address

`0x43`. *Sources:* BlueBus `ibus.h:20`, Wilhelm `README.md:125`, bimmerz `devices.ts:27` — agreed. Wilhelm `address.md` does not list `0x43`.

## Messages

No per-command documentation specific to the GTF in surveyed sources. The GTF likely mirrors the GT's command surface on a parallel address.

Wilhelm `nav/aa.md` notes that **GTF can also send `0xAA` to NAV** but with reduced scope ("focus navigation applet only"). See [`gt.md`](gt.md#0xaa--navigation-control).

## Cross-cutting subsystems

- Rear-screen analogue of the GT — participates in radio↔GT arbitration and OBC display on its own screen.

## Open questions / TBC

- **Differences from GT.** Beyond Wilhelm's note that GTF's `0xAA` is more limited, what else differs between the two? Are write commands directed at `0x43` instead of `0x3B`, or are they broadcast?
- **Audio routing.** Does the rear-seat passenger get separate audio (different from the front)? If so, where is the routing protocol?

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:20` — address (`IBUS_DEVICE_GTF`).

### Wilhelm-docs
- `README.md:125` — device-table entry.
- `nav/aa.md` — `0xAA` navigation control (with GTF reduced-scope note).

### bimmerz
- `packages/bus/src/devices.ts:27` — address.
