# Documentation conventions

**Status:** Stable.

This page defines the citation and conflict-resolution conventions used throughout the reference. The rules are deliberately small in number and consistently applied.

## Sources

Four sources, in declining precedence:

1. **BlueBus** — actively maintained C firmware (2018–present).
2. **Wilhelm-docs** — curated community Markdown reference (2019–present).
3. **bimmerz** — TypeScript SDK (2023–2025), partly derivative of the first two.
4. **EDIABAS PRG** — BMW diagnostic programs. Out of scope; last resort, ID disambiguation only.

Full source descriptions, paths, and per-source authority: [`sources-and-provenance.md`](sources-and-provenance.md).

## Citation format

### Common case — sources agree

When two or more sources agree, cite them inline on a single line under the claim:

```
**0x80 IKE** — Instrument Cluster Electronics.
*Sources:* BlueBus `ibus.h:32`, Wilhelm `README.md:146`, bimmerz `devices.ts:44` — agreed.
```

The `path:line` form points at the canonical assertion in each source. Use the relative path from the source repo root. Where the assertion spans a range, use `path:start–end`.

If only one source covers a topic, cite it the same way without the "— agreed" tag:

```
*Source:* BlueBus `ibus.h:650` (max frame length).
```

### Conflict case — sources disagree

When sources disagree (or a single source contradicts itself, or a coverage gap matters), surface the disagreement with a **conflict block**:

```
#### IKE sensor frame (cmd `0x13`) — payload length

| Source | Claim | Cite |
|---|---|---|
| Wilhelm | 3 bytes on high cluster (IKE); 7 bytes on later high cluster (IKI) | `ike/13.md` |
| BlueBus | Length-of-payload check, variant-aware parser | `handler_ibus.c:866–1117` |
| bimmerz | Fixed parser, no variant branch | `commands/devices/ike/parsers.ts:26–98` |

**Resolution:** Variant-aware (IKE 3-byte vs. IKI 7-byte).
**Why:** Wilhelm documents the chassis-specific distinction, BlueBus's runtime parser handles both via length check (confirming variants exist on the wire); the bimmerz omission is a coverage gap rather than a contradiction.
```

Rules for the conflict block:

1. **Heading** is `####` (h4) and names the contested fact concisely.
2. **One row per source** that has a claim. Don't include rows for sources that simply don't cover the topic — note coverage gaps in the **Why** line if they matter.
3. **Resolution** is one sentence: the claim that goes in the surrounding prose, written so a reader who skipped the block still has the right answer.
4. **Why** explains the choice. Lean on the source-precedence default where it applies; cite live-traffic evidence (e.g., BlueBus branching on length) where it strengthens the call.
5. **Don't smooth over conflicts silently.** A reader of the surrounding prose should be able to find out why a fact is what it is.

### Within-source conflicts

Some sources contradict themselves. The most prominent example is Wilhelm's two device tables (`README.md` vs. `address.md`). Cite both rows in the conflict block, and treat the more recently maintained or more contextually relevant file as primary unless the older one explicitly says something the newer omits.

## Style

- **Reference-manual, not tutorial.** Terse, complete, table-heavy. Worked examples live in [`examples/`](examples/), not in protocol or device pages.
- **Hex literals lowercase with `0x` prefix** in prose (`0x80`); **uppercase in raw frame dumps** to match the convention in source dumps (`80 06 BF 13 …`).
- **Byte order in frames:** documented MSB-first — left-to-right as transmitted on the wire.
- **Bit numbering:** bit 0 is the LSB. Bit-field tables show MSB on the left.
- **Device names:** four-letter abbreviation in caps (IKE, LCM, GM, RAD) on first reference plus a one-line gloss, then the abbreviation thereafter.

## File naming

- Unprefixed filenames (`framing.md`, not `01-framing.md`). Reading order is given by the README index, not by filename.
- Lowercase, hyphenated.
- One device per file; one cross-cutting subsystem per file.
- Sparse pages are kept as stubs (status: **Stub**) rather than omitted, so the address space stays navigable.

## Status labels

Every page header carries a status:

- **Stable** — sources agree (or conflicts resolved) and the page has been reviewed.
- **Draft** — content present, not fully cross-checked.
- **Stub** — placeholder; address or message ID known but body TBC.

A page may be partially stable; in that case use the lower of the two at the top and label individual sections as needed.
