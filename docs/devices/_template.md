# <ABBR> (0x<addr>) — <Full Name>

**Status:** Stable / Draft / Stub *(pick one)*

**Role:** *(one-line summary — what this device does in the vehicle, not on the bus)*

**Buses:** K / I / K/I

**Chassis coverage:** *(e.g., E38, E39, E46, E53 — list the chassis on which this device address is known to be populated)*

**Variants:** *(hardware/software variants of this device that change its on-the-wire behaviour — e.g., LCM has LME38 / LCM / LCM_A / LCM_II / LCM_III / LCM_IV / LSZ / LSZ_2; GT has MKI through MKIV_STATIC. Omit the section if there are no variants.)*

---

## Address

*One paragraph confirming the address with sources, plus any provenance notes. Cite using the standard format from [`../conventions.md`](../conventions.md).*

Example:

> `0x80`. *Sources:* BlueBus `ibus.h:32`, Wilhelm `README.md:146`, bimmerz `devices.ts:44` — agreed.

If sources disagree on the address, use a conflict block.

---

## Announce / Pong

*How this device identifies itself on the bus at power-up (cmd `0x02`). Variant signature byte if applicable. Cross-reference Wilhelm `02.md` if it documents this device.*

Example:

> **Announce frame:** `80 04 BF 02 01 38` — IKE announces to global broadcast with variant signature `0x01`.
>
> *Source:* Wilhelm `02.md:131`.
>
> The IKE does not distinguish high vs. low cluster in its announce signature; both use `0x01`.

If the device has no announce behaviour or the Pong is not documented, write *"Not documented."* and move on.

---

## Messages where this device is `SRC`

A table of every command this device originates. Sort by command byte.

| Cmd | Name | Typical `DST` | Direction | Brief | Source |
|---|---|---|---|---|---|
| `0xXX` | <message name> | `<addr>` <abbr> | broadcast / unicast | one-line summary | BB `path:line` · W `path:section` · bz `path:line` |

Link out to the message-detail section (below) or to a cross-cutting subsystem page where appropriate.

---

## Messages where this device is `DST`

A table of every command this device accepts. Sort by command byte.

| Cmd | Name | Typical `SRC` | Brief | Source |
|---|---|---|---|---|
| `0xXX` | <message name> | `<addr>` <abbr> | one-line summary of how this device reacts | BB `path:line` · W `path:section` · bz `path:line` |

---

## Message detail

One subsection per non-trivial message. Trivial messages (e.g., a one-byte ack) may be left to the tables above without their own subsection. Subsection title is `### 0xXX — <Message Name>`.

The subsection body should cover:

1. **Direction(s).** SRC → DST pairs (there may be more than one). Cite via Wilhelm's per-command page where available.
2. **Frame format.** Show the raw byte layout. Use a small frame-layout table for non-trivial payloads:

   | Offset | Bytes | Field | Meaning |
   |---|---|---|---|
   | 3 | 1 | `CMD` | `0xXX` |
   | 4 | 1 | <field> | bit-field / enum / numeric. Decode below. |

3. **Bit fields / enums.** If a parameter byte is a bit field, give the bit layout in a separate table. If it's an enum, give the value table. Cite the source's bit definitions.
4. **Example frames.** Two or three real frames from observed traffic, ideally from Wilhelm or BlueBus comments. Show the decoded interpretation alongside.
5. **Source agreement / conflict.** Inline citation if agreed; conflict block if not.

---

## Bit fields and enums

For bit fields that apply across multiple messages (e.g., the IKE ignition-state byte appears in `0x11`, `0x53`, and possibly elsewhere), centralise them here and reference from the message subsections above. Avoid duplication.

---

## Cross-cutting subsystems

Link to any [`../subsystems/`](../subsystems/) pages that this device participates in. Brief one-line description of its role.

Example:

> - [obc-display](../subsystems/obc-display.md) — IKE displays the OBC menu and accepts updates from the radio and BMBT.
> - [ignition-state](../subsystems/ignition-state.md) — IKE is the canonical source of ignition state on the bus.

---

## Variants and chassis differences

If this device has variants that change its on-the-wire behaviour, describe them here. Use a table:

| Variant | Identifier | Chassis | Differences from baseline |
|---|---|---|---|
| <name> | `<id-byte>` or context | <chassis> | <difference summary> |

If variant detection requires a diagnostic query (e.g., LCM's diagnostic identity byte), reference the runtime detection logic in BlueBus or wherever it's implemented.

---

## Open questions / TBC

A short bulleted list of things the sources don't agree on, don't cover, or where observed traffic disagrees with documentation. Each item should be a question or a "TBC".

Example:

> - **TBC:** Whether the IKE OBC text command `0x24` accepts the full 11-character display width on the low cluster, or only 9 characters as on some early variants.
> - **Conflict pending:** bimmerz's gear nibble values (`0xB0` for PARK, etc.) appear byte-swapped from BlueBus's `IBUS_IKE_GEAR_PARK 0x0B`. Likely a bimmerz parser bug — needs traffic-capture verification.

---

## Sources

A consolidated provenance footer. Three subsections corresponding to the three primary sources:

### BlueBus

*Key files and what they contain for this device.*

- `firmware/application/lib/ibus.h:<range>` — command constants, status enums.
- `firmware/application/lib/ibus.c:<range>` — encoder functions.
- `firmware/application/handler/handler_ibus.c:<range>` — message handlers.

### Wilhelm-docs

*Key files and what they contain.*

- `<device>/<cmd>.md` — per-command pages applicable to this device.
- Per-message page links if more granular.

### bimmerz

*Key files and what they contain.*

- `packages/commands/src/devices/<dev>/types.ts` — type definitions.
- `packages/commands/src/devices/<dev>/parsers.ts` — payload parsers.
- `packages/commands/src/devices/<dev>/builders.ts` — payload builders.

### Other

EDIABAS PRG citations only if needed; mark with the date of decompilation.

---

## Maintainer notes (delete when filling)

- Replace `<ABBR>`, `<addr>`, `<Full Name>`, and all `<…>` placeholders.
- Trim sections that don't apply (e.g., a stub page can drop everything below "Announce / Pong").
- Status must reflect the lowest-confidence section. A page with one Draft section is Draft overall.
- Don't duplicate content that belongs in cross-cutting subsystem pages — link to them instead.
- If you add a new conflict, also surface it in the devices-table page's "Notes on specific rows" if it changes the canonical address row.
