# D-Bus framing

**Status:** Draft. Single-source — reverse-engineered from a Visual Basic 6
binary (`navcoder.exe`) via the [VB Decompiler](https://www.vb-decompiler.org)
output checked into `~/Downloads/NavCoderDecomp/`. Citations are
`NavCoderDecomp/<file>:<line>` against that tree. Cross-checking with
community-source descriptions of BMW DS2 is a follow-up step.

This page covers the **D-Bus** diagnostic protocol used on the OBD-II
connector — sometimes labelled "BMW DS2", historically marked in the
navcoder UI as **OBD (d-bus)**. The reference manual otherwise scopes itself
to I-Bus and K-Bus; D-Bus is documented here because the two protocols share
the same physical wire and the same UART configuration, and navcoder's parser
demultiplexes between them on the basis of a single byte.

For I/K-bus framing, see [`framing.md`](framing.md). For physical-layer notes
that apply to all three buses (single-wire 12 V, transceiver), see
[`physical.md`](physical.md).

## Wire layer — identical to I/K-bus

| Field | Value |
|---|---|
| Baud rate | 9600 |
| Data bits | 8 |
| Parity | Even |
| Stop bits | 1 |
| Flow control | None |
| Wire | Single-wire bidirectional |

navcoder configures one shared `MSComm` OCX with the literal string
`"9600,E,8,1"` for every protocol mode — there is no per-mode reconfiguration
of the UART.

> *Source:* `NavCoderDecomp/NavCoderMainForm.frm:92803` (the `"9600,E,8,1"`
> constant), inside `setComPort(ComPortNumber)` at `:92468` which is invoked
> regardless of the selected bus protocol.

The OBD-II socket is the access point. The label `"OBD (d-bus)"` is the
canonical entry in navcoder's bus-protocol combobox.

> *Source:* `NavCoderDecomp/NavCoderMainForm.frm:113832` (the literal
> `"OBD (d-bus)"` string, populated into the bus-protocol selector).

## Frame structure

```
+-----+-----+---------- ... ----------+-----+
| DST | LEN |    DATA (1..n bytes)    | XOR |
+-----+-----+---------- ... ----------+-----+
  1B    1B          n bytes             1B
```

| Byte    | Field | Meaning |
|---------|-------|---------|
| 0       | `DST` | Destination ECU address. |
| 1       | `LEN` | Frame-length field. Counts **the entire frame**, including `DST`, `LEN`, all `DATA`, and `XOR`. |
| 2 … *n* | `DATA` | Payload bytes. The **first byte (index 2)** is the **command byte**; the remaining bytes are command parameters. |
| last    | `XOR` | Frame checksum (XOR of every preceding byte). |

The smallest valid frame is **4 bytes** (`DST LEN CMD XOR` — one command
byte, no parameters).

There is **no separate source-address byte**. In a D-Bus exchange the tester
(the PC running navcoder) sends a frame to the target ECU's address; the
ECU's response identifies itself implicitly by being the only thing answering
on the wire after that request. This is the central difference from I/K-bus,
where every frame carries an explicit `SRC` field.

> *Sources, navcoder receive path (frame parser):*
>
> - `NavCoderDecomp/NavCoderMainForm.frm:55585–55600` —
>   `comGetNextMsgFrmBuffer(buffer, msgProtocol, …)` branches on the
>   protocol mode and sets the minimum-frame check: `min_bytes = 4` when
>   `msgProtocol == 2` (D-Bus), `min_bytes = 5` otherwise (I/K-bus).
> - `NavCoderDecomp/NavCoderMainForm.frm:55754–55785` — inside the per-byte
>   scan loop, the D-Bus path reads `possibleRxMsgLen = byte_at_offset_1`
>   directly (sanity-checked `≥ 4`). The I/K-bus path reads the same byte
>   but adds 2 to it before sanity-checking.
> - `NavCoderDecomp/NavCoderMainForm.frm:55817–55864` — the candidate frame
>   is `Mid(buffer, i, possibleRxMsgLen)`, then `XOR` is computed over
>   `Left(msg, len-1)` (everything except the last byte) and compared
>   against `Asc(Right(msg, 1))` (the last byte).

> *Sources, navcoder send path (frame builder):*
>
> `NavCoderDecomp/ibus.bas:496–599` — the frame builder (entry point at
> address `0x497240`, called from `comSendTxGetRx(TxAdr, RxAdr, Data, …)`):
>
> - Line **534**: `cmp [00651076h], 0002h` — read protocol-mode global.
> - Line **535**: `jz 00497366h` — jump to the no-source-byte path when
>   mode is 2 (D-Bus).
> - I/K-bus path (default): produces `Chr(TxAdr) & Chr(Len(Data)+2) &
>   Chr(RxAdr) & Data` — i.e. `[SRC LEN DST DATA…]`.
> - D-Bus path (mode 2, lines **600–644**): produces `Chr(RxAdr) &
>   Chr(Len(Data)+3) & Data` — i.e. `[DST LEN DATA…]` with **no source
>   byte**.
> - Both paths then call the XOR helper at `0x496C90` over the built bytes
>   and append the result as the final `XOR` byte.

### Length field semantics

`LEN` is the **total frame length in bytes**, including itself and the
trailing `XOR`. The relationship is therefore:

- **Total frame length** = `LEN`
- **`DATA` length** = `LEN − 3` (one byte each for `DST`, `LEN`, and `XOR`)
- For a payload of length *p* (command byte plus parameters):
  `LEN = p + 3`

This is **a different convention from I/K-bus** — there, `LEN` excludes
`SRC` and itself. Software handling both protocols must keep the two
definitions strictly separated. The same byte-1 reading rule that works for
I/K-bus (length-of-tail) produces an off-by-three result when applied to
D-Bus.

> *Source:* `NavCoderDecomp/ibus.bas:614–615` — D-Bus builder writes
> `Len(Data) + 3` as the length byte. The receive-side parser confirms:
> `NavCoderDecomp/NavCoderMainForm.frm:55781–55785` reads the byte and uses
> its value directly as the total frame length (no offset).

## Checksum

Identical scheme to I/K-bus: the last byte of the frame is the **bitwise
XOR of every preceding byte**, including `DST`, `LEN`, and all `DATA` bytes.

> *Source:* `NavCoderDecomp/ibus.bas:2–74` — the function at address
> `0x496C90` is a simple `For i = 1 To Len(s) : result Xor= Asc(Mid(s,
> i, 1)) : Next` loop that returns a single byte. Both the send and
> receive paths call this same helper, and both protocol modes use it
> unchanged.

A receiver should compute the XOR of bytes `0` through `LEN − 2` inclusive,
then compare against byte `LEN − 1`. A mismatch means the frame is
malformed and should be dropped.

## Worst-case frame size

navcoder enforces an upper bound on plausible D-Bus frame lengths via the
same scan loop that handles I/K-bus, but only the *minimum* check
(`≥ 4`) is D-Bus-specific. No explicit maximum is enforced in the D-Bus
path — frames up to the buffer length are accepted.

> *Source:* `NavCoderDecomp/NavCoderMainForm.frm:55784–55787` — D-Bus
> path: `cmp var_28, 0004h; jge ...; jmp 005B3D12h` (only the lower bound
> is checked).

For I/K-bus, by contrast, the same loop enforces an upper bound of 37 or
57 depending on a runtime flag (`[0065102A]`).

> *Source:* `NavCoderDecomp/NavCoderMainForm.frm:55764–55780` — I/K-bus
> path checks `5 ≤ len ≤ 0x39` (57) when the flag is set, else
> `5 ≤ len ≤ 0x25` (37).

## Init / wake-up sequence

navcoder does **not** perform a 5-baud or fast-init handshake before
talking on the D-Bus. After opening the COM port and configuring it for
9600 8E1, the application transmits D-Bus frames directly.

This is consistent with BMW DS2 (which is not a standard KWP2000 dialect
and does not require the KWP wake-up ritual). It is **inconsistent** with
generic OBD-II protocols like ISO 9141-2 or ISO 14230-4 KWP that *do*
require an init sequence.

> *Source (negative):* `NavCoderDecomp/NavCoderMainForm.frm:51036–51100`
> — `comSendTxGetRx(TxAdr, RxAdr, Data, …)` opens straight into the frame
> builder; there is no preamble write, no timed pulse, no fast-init
> ramp. The flow is: read settings → build frame → write → read
> response.

## Protocol-mode dispatch in navcoder

navcoder identifies the protocol mode via a single integer global at
data address `0x00651076`:

| Internal value | Combobox label | Meaning |
|---:|---|---|
| `0` | `Auto` | Probe both protocols, pick the one that produces valid frames. |
| `1` | `i/k-bus` | I-Bus or K-Bus framing (5-byte minimum, `LEN + 2` total). |
| `2` | `OBD (d-bus)` | D-Bus framing (4-byte minimum, `LEN` total, no `SRC`). |

The combobox-index → numeric-code mapping is non-monotonic (`Auto` and
`OBD (d-bus)` come before `i/k-bus` in the dropdown, but the codes go
`0`, `2`, `1`, `0`). The internal code is what matters for all subsequent
dispatch.

> *Sources:*
>
> - `NavCoderDecomp/NavCoderMainForm.frm:113700–114200` — the combobox-
>   populate loop. Two parallel arrays are built: the visible labels
>   (`Auto`, `OBD (d-bus)`, `i/k-bus`, `Auto`) and the corresponding
>   numeric codes (`0`, `2`, `1`, `0`).
> - `NavCoderDecomp/NavCoderMainForm.frm:42544–42575` —
>   `setBusProtocol(newProtocolSetting)` writes the new value to
>   `[00651076]`.
> - `NavCoderDecomp/NavCoderMainForm.frm:42973`, `:43220`, `:43455` —
>   the three log messages `! Bus protocol set to D-bus`,
>   `! Bus protocol set to I/K-bus`, `! Bus protocol set to Auto`.

When the user selects **Auto**, navcoder runs an auto-detector that probes
the bus and picks one of the two real modes. The detector logs
`! Databus protocol unknown, starting Protocol Detection...` and
`! Detecting protocol via X protocol...` (`:113883`, `:113915`). The
specific probe bytes it emits for each protocol are not documented here
yet — that's a follow-up.

## Response-code byte

When an ECU answers a tester request, the command byte (`DATA[0]`) is one of
a well-known set of DS2 response codes. navcoder maps each byte to a
human-readable string in a single function (`ibus.bas:3600–3680`), which
makes the table easy to extract:

| Byte | Meaning |
|---:|---|
| `0x9F` | Terminate diagnostic mode |
| `0xA0` | Diagnostic command acknowledged (positive ACK) |
| `0xA1` | Diagnostic is busy |
| `0xA2` | Diagnostic command rejected |
| `0xB0` | Diagnostic parameter error |
| `0xB1` | Diagnostic function error |
| `0xB2` | Diagnostic coding error: incorrect coding data |
| `0xFF` | Diagnostic command not acknowledged (negative ACK / unknown command) |

These match the community DS2 description summarised at
[markgardnergibson.com/BMW/protocol.html](https://markgardnergibson.com/BMW/protocol.html)
and used by the `handmade0octopus/ds2` Arduino library — both of those
sources describe `A0 = positive`, `B0 = negative` (loosely; in fact the
binary distinguishes A0 from A2 and B0 from FF). The navcoder table is the
authoritative one here.

> *Source:* `NavCoderDecomp/ibus.bas:3597–3681` — sequential `cmp byte,
> 0x9F/A0/A1/A2/B0/B1/B2/FF; jnz next` branches inside the response-name
> lookup. Each comparison is paired with one of the strings shown in the
> table above (`"Terminate diagnostic mode"`, `"Diagnostic command
> acknowledged"`, etc.).

## Bus overlap with I/K-bus

The two buses **share device address space** but **not command vocabulary**.

navcoder is structurally telling: a single function
(`ibus.bas:895–2094` — the address-name lookup at `0x497670`) walks the
**same** 8-bit address space for both protocols and emits the same
canonical short name (e.g. `IKE`, `DME`, `BMBT`) regardless of which bus
the address came in on. Some addresses only carry traffic on one of the
two buses; others carry traffic on both.

| Class | Examples | Buses where it appears |
|---|---|---|
| Comfort / infotainment | BMBT, GT, RAD, MFL, MID, IRIS, RLS, CDC, PDC, TEL, NAV, IKE, LCM, GM (ZKE) | I-Bus and K-Bus (varies by chassis). Most do **not** answer on D-Bus. |
| Engine / drivetrain / safety | DME, EGS, AB (airbag), ASC (ABS), EKP (fuel pump), LWS (steering angle), AHL (adaptive headlight) | D-Bus only. These ECUs do **not** participate in I/K-bus traffic. |
| Dual-presence | IKE, LCM, GM-equivalent body controllers | I/K-bus for runtime events **and** D-Bus for coding/diagnostic. Same address byte, different command vocabulary on each bus. |

> *Source:* `NavCoderDecomp/ibus.bas:895–2094` — the device-name lookup
> function `Proc_5_3_497670(arg_C, arg_10)`. Selected entries: `0x12 DME
> "Digital motor electronics (ECU)"` (`:977/1546`), `0x14 EGS "Electronic
> transmission control"` (`:1017/1599`), `0xC8 AB "Airbag system"`
> (extracted from the broader table), `0x60 PDC "Park distance control"`
> (`:983/1791`), `0x80 IKE "Integrated instrument cluster electronics"`
> (`:1810/1830`).

**Why this matters for software** — a single byte-stream reader that has
just decoded the address byte does **not yet know which command table to
consult**. The protocol-mode integer is the disambiguator: if mode is `2`,
the second byte is a length field counting the whole frame and the
command byte follows DS2 semantics (read-by-block, write-coding,
terminate-diagnostic, …); if mode is `1`, the second byte is the I/K-bus
length and the command byte follows the I/K-bus semantic table per
[`framing.md`](framing.md) and the per-device pages.

> Empirically: a `0x11` byte after an `IKE 0x80` source on I-Bus is an
> ignition-status broadcast. A `0x11` byte after a `DME 0x12` destination
> on D-Bus is whatever the DME's DS2 command table defines `0x11` to be
> (typically not the same thing). The numeric collision is meaningless
> across buses.

## Worked examples

> *Note:* navcoder does not embed example D-Bus frame dumps in its
> string table the way it does for I/K-bus. The examples below are
> **constructed** by walking the frame builder; they are not snippets
> captured from a real bus.

### Negative-acknowledge response from an ECU

Suppose an ECU at address `0x12` (DME) replies to a tester with a
single-byte status `0xFF` ("diagnostic command not acknowledged") —
the most common terse failure response:

| Byte | Field | Value | Why |
|---:|---|---:|---|
| 0 | `DST` | `0xF1` | Tester address (the PC). |
| 1 | `LEN` | `0x04` | Whole frame is 4 bytes. |
| 2 | `DATA[0]` (cmd) | `0xFF` | Negative-ACK code. |
| 3 | `XOR` | `0xF1 ⊕ 0x04 ⊕ 0xFF = 0x0A` | XOR of bytes 0..2. |

Wire bytes: `F1 04 FF 0A`.

> *Source for the response-code semantic:* `NavCoderDecomp/ibus.bas:3681`
> (the literal string `"Diagnostic command not acknowledged"` paired with
> `cmp 0x000000FFh`).

### ECU-identification request

The community DS2 lore (and the `handmade0octopus/ds2` Arduino library)
gives this as the canonical "read ECU identification" request for a DME
at `0x12`:

| Byte | Field | Value |
|---:|---|---:|
| 0 | `DST` | `0x12` (DME) |
| 1 | `LEN` | `0x04` (4-byte frame) |
| 2 | `DATA[0]` (cmd) | `0x00` (identification request) |
| 3 | `XOR` | `0x12 ⊕ 0x04 ⊕ 0x00 = 0x16` |

Wire bytes: `12 04 00 16`.

> *Source (community):* the `handmade0octopus/ds2` README gives this same
> frame literally as `{0x12, 0x04, 0x00, 0x16}` — an exact framing
> match to what navcoder's builder would produce for `(DST=0x12,
> Data="\x00")`. **navcoder does not embed this specific frame as a
> string constant, but the builder algorithm at `ibus.bas:600–644`
> produces precisely these bytes when invoked with those arguments.**

## What is NOT yet documented here

- **The full D-Bus per-ECU command table.** The decompilation contains
  numerous diagnostic-related strings (`"Reset control unit"`,
  `"Request coding data checksum"`, `"Vehicle Data request"`, `"Date
  request"`, `"Diagnosis software error"`, etc. — `ibus.bas:3329–3671`,
  `ibus_E31.bas:200–800`) but mapping each to its numeric command byte
  requires reading the per-message dispatcher carefully — a larger task
  than this initial framing pass. The DS2 *response* codes (`0x9F`,
  `0xA0–0xA2`, `0xB0–0xB2`, `0xFF`) are already extracted (see
  "Response-code byte" above).
- **The auto-detection probe bytes.** The "Protocol Detector" function
  emits specific bytes on the wire to test each protocol; those bytes
  are not yet extracted.
- **Per-ECU address allocation.** The set of valid `DST` addresses for
  D-Bus is not yet enumerated from navcoder. (Some — DME `0x12`, IKE
  `0x80` — are inferred from the I/K-bus address table; the D-Bus
  superset, if any, is unknown.)
- **Timing rules.** navcoder uses a watchdog timer (`! Protocol
  watchdog timer fired: reverting protcol to Auto` at
  `NavCoderMainForm.frm:4697`) but the specific per-byte and
  per-message timing constants haven't been extracted.
- **Cross-checks against community sources** (BMW DS2 lore from
  EDIABAS / INPA documentation, ddhsoftware.com diagnostic-protocol
  pages, etc.). The framing claims above should be confirmed against
  at least one other source before the page leaves Draft status.
