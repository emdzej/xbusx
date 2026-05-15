# Sources and provenance

**Status:** Stable.

Four sources are cited throughout the reference. This page describes each one — what it is, where it sits, what it is authoritative for, and where its limitations lie. The citation format itself is defined in [`conventions.md`](conventions.md).

## Precedence (default)

For any contested fact, the default precedence is:

1. **BlueBus** — firmware ground truth, very current.
2. **Wilhelm-docs** — semantics, UI choreography, model variants.
3. **bimmerz** — modern parser patterns; partly derivative.
4. **EDIABAS PRG** — last resort, ID disambiguation only.

This is a default, not a hard rule. Specific topics override it; see the per-source notes below.

## 1. BlueBus

- **What:** Aftermarket Bluetooth/A2DP/HFP integration firmware that masquerades as a CD changer on the I-Bus.
- **Path (local):** `/Users/mjaskols/Projects/my/ext-BlueBus`
- **Upstream:** [github.com/blueBusProject/BlueBus](https://github.com/blueBusProject/BlueBus)
- **Language/platform:** C, PIC24FJ1024GA606 MCU, Melexis TH3122 I-Bus transceiver.
- **Activity:** First commit 2018-06, recent commits in 2026. Actively maintained.

### Key files

| Path | What it gives you |
|---|---|
| `firmware/application/lib/ibus.h` | Device address table (13–44); packet indices (49–66); priority levels (68–70); 518 `#define`s for command IDs, status codes, button codes, masks, variant constants; framing/timing constants (650–667). |
| `firmware/application/lib/ibus.c` | Frame encoder/decoder, collision detection, ARQ retry, XOR checksum, ~79 command-encoder function bodies, 30+ message-decoder handlers. |
| `firmware/application/handler/handler_ibus.c` | Per-message handlers wired into the firmware event bus (IKE ignition/speed/RPM/vehicle-config, LM ident/light-status, PDC sensor updates, etc.). |
| `firmware/application/ui/{bmbt,mid,cd53}.c` | UI-side protocol use — useful for how a real device responds to incoming traffic. |

### Authoritative for

- Frame timing — idle wait, RX timeout, loopback timeout, retry count, max length.
- Collision detection (RX-during-TX monitoring) and ARQ logic.
- Vehicle-type detection (`0x01` E38/E39/E52/E53 · `0x02` E46 · `0x03` E8X · `0x04` R50).
- Light-module variants (LME38, LCM, LCM_A, LCM_II, LCM_III, LCM_IV, LSZ, LSZ_2) and their byte-offset differences.
- Graphics-terminal generations (MKI through MKIV_STATIC).
- ZKE3 vs. ZKE5 door-lock command differences.

### Limitations

- No prose documentation — protocol knowledge is embedded in code and inline comments.
- Scope is what a Bluetooth retrofit needs; some devices have only ident-level coverage (DSP, EWS, VM, IRIS, SES).
- Single physical-layer target (TH3122). No K-bus distinction in firmware (treated as I-Bus throughout).

## 2. Wilhelm-docs

- **What:** A community-curated Markdown reference for the I/K-bus protocol.
- **Path (local):** `/Users/mjaskols/Projects/my/ext-wilhelm-docs`
- **Upstream:** [github.com/piersholt/wilhelm-docs](https://github.com/piersholt/wilhelm-docs)
- **Activity:** First commit 2019-12, recent commits in 2026.

### Structure

- `README.md` — top-level index, chassis matrix, glossary, device table (111–173), command index (211–305), feature groupings.
- `address.md` — older alternative device table (minor differences from `README.md` — see [`devices/README.md`](devices/README.md)).
- `guide.md` — the doc-format template the project uses for its own per-command pages.
- Per-device subdirectories: `bmbt/`, `cdc/`, `gm/`, `gt/`, `ike/`, `lcm/`, `mfl/`, `nav/`, `radio/`, `rls/`, `telephone/`. Each known command has its own `<hex>.md` page.
- `radio/arbitration.md` — 814-line treatment of radio ↔ GT UI contention.
- `ike/charset/` — I-Bus character encoding.

### Authoritative for

- Layer-2 semantics (addressing space, multicast, broadcast, gateway routing).
- Chassis × bus applicability matrix.
- Cluster variants (KOMBI / IKE / IKI) and their on-the-wire differences.
- Radio ↔ GT UI arbitration choreography.
- Telephone UI state machine (16 distinct display modes).
- Real-frame examples for many commands.

### Limitations

- "This documentation should not be considered authoritative" — the project's own disclaimer (`README.md:13–16`). Treat numeric claims with the same scrutiny applied to any other source.
- Internal contradictions between `README.md` and `address.md`. The README is more recent and more contextual; prefer it unless `address.md` says something the README omits.
- ~66 commands documented against an estimated 150+ in observed traffic. Many entries marked "TBC" in the README index.
- Sparse on timing, retry, and collision behaviour.
- D-Bus device table present (`README.md:175–209`) but out of scope for this reference.

## 3. bimmerz

- **What:** A TypeScript monorepo SDK for building applications that talk to the bus.
- **Path (local):** `/Users/mjaskols/Projects/my/bimmerz`
- **Activity:** 2023-06 to 2025-01.

### Structure

- `packages/bus/src/protocol.ts` — frame encoder/decoder reference implementation.
- `packages/bus/src/devices.ts` — 65 device address constants + human-readable names.
- `packages/commands/src/types/commands.ts` — ~50 command IDs.
- `packages/commands/src/devices/<dev>/{types,parsers,builders}.ts` — per-device codecs for IKE, LCM, CDC, MFL, PDC, RLS, RAD, DIA.
- `ref/` — vendored snapshots of BlueBus, Wilhelm-docs, node-bmw-*. **Do not cite from `ref/`** — go to the upstream repo, which is more current.

### Authoritative for

- OBC property IDs (TIME, RANGE, TEMPERATURE, etc., encoded as command codes).
- Modern TypeScript parser/builder patterns useful in worked examples.

### Limitations

- Address table mixes K/I-Bus and D-Bus entries without distinguishing — error-prone if used as the canonical address source.
- Partly derivative — its address and command definitions trace back to BlueBus and Wilhelm. When it agrees with both, that's not three independent confirmations but one source repeated.
- IKE gear values appear to be byte-swapped vs. BlueBus's `IBUS_IKE_GEAR_*` constants (`ibus.h:567–576`). See conflict block in [`devices/ike.md`](devices/ike.md).
- No coverage of timing, ARQ, or collision behaviour.

## 4. EDIABAS PRG

- **What:** Binary BMW diagnostic programs in the INPA / DIS toolchain.
- **Path (local):** `/Users/mjaskols/Downloads/inpa/EDIABAS/Ecu/*.prg`
- **Format:** Compiled BMW Best/2 script files.
- **Tooling:** `/Users/mjaskols/Projects/my/ediabasx` provides decompilation capability.

### Authoritative for

- The **D-Bus diagnostic protocol** — but that is out of scope for this reference.
- Device-ID disambiguation when a numerically valid address appears in observed traffic but no I/K-bus source can name it. Even then, EDIABAS may name the *diagnostic-side* device, which can but need not be the same as the bus-side device at that address.

### Use only when

The three primary sources cannot resolve a question. Cite as `EDIABAS/Ecu/<filename>.prg (decompiled <yyyy-mm-dd>)` with a note explaining the inference.

## On meta-sources: node-bmw-*, imBMW, etc.

Several earlier Node.js and .NET projects (`node-bmw-*`, `imBMW`) appear vendored inside bimmerz's `ref/`. They are **not cited directly** in this reference because:

1. They are not currently maintained upstream.
2. Their content is downstream of BlueBus and Wilhelm in turn.
3. Treating them as independent sources would inflate apparent agreement.

If a fact is uniquely sourced to one of these projects, it goes in a conflict block with a note explaining the lineage.
