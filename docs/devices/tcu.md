# TCU (0xCA) — Telematics Control Unit (BMW Assist)

**Status:** Stub.

**Role:** The telematics module — BMW Assist / Connected Drive. Couples cellular connectivity with the navigation system to deliver assistance services (emergency call, concierge, vehicle tracking).

**Buses:** K/I.

**Chassis coverage:** Optional across chassis equipped with the BMW Assist option. Distinct from the regular telephone module **TEL** at `0xC8` (see [`tel`](tel.md)) — though the two are functionally related and may interoperate on the bus.

**Variants:** None known.

---

## Address

`0xCA`. *Sources:* BlueBus `ibus.h:38`, bimmerz `devices.ts:61` — agreed. Wilhelm `README.md` and `address.md` do not list `0xCA` explicitly in the K/I-bus device table; the address is identified only by BlueBus.

---

## Known constants

The TCU's single-line UI on the multi-info display has a fixed character limit:

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TCU_SINGLE_LINE_UI_MAX_LEN` | `11` | Max characters per single-line UI write. |

> *Source:* BlueBus `ibus.h:591`.

This matches the standard MID title-line length (`IBUS_MID_TITLE_MAX_CHARS 11`) and the TEL single-line write convention, suggesting the TCU shares text-writing primitives with the telephone stack.

---

## Messages

No per-command documentation exists in the surveyed sources. The TCU appears as a passive component referenced for length constants only.

---

## Cross-cutting subsystems

- The TCU likely participates in the **telematics flow** that connects NAV `0x7F` → TEL `0xC8` / TCU `0xCA` via `0xA2` (coordinates) and `0xA4` (location). The GT is also in the loop. See [`gt.md`](gt.md#0xa2--telematics-coordinates-forwarded) and the planned `subsystems/telephone-ui.md` page.

---

## Open questions / TBC

- **Per-command catalogue.** Wilhelm has no `tcu/` directory. BlueBus exposes only the length constant. EDIABAS may have richer detail on the TCU's diagnostic surface, but the diagnostic protocol is out of scope here.
- **Relationship to TEL `0xC8`.** On chassis with both modules, do they cooperate (TCU sub-leases UI to TEL) or operate independently? The protocol-level boundary is unclear.
- **Variant identification.** BMW Assist has gone through generations (Assist 1, Assist 2, Assist 3 with full telematics). No variant byte is documented.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:38` — address.
- `firmware/application/lib/ibus.h:591` — `IBUS_TCU_SINGLE_LINE_UI_MAX_LEN`.

### bimmerz
- `packages/bus/src/devices.ts:61` — address.

### Wilhelm-docs
- Not present in the K/I-bus device table at surveyed time. (`README.md:113–174` does not list `0xCA`.)
