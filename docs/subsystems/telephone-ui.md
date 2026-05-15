# Telephone UI

**Status:** Draft.

The telephone module (`0xC8`) presents the most elaborate UI surface on the I/K-bus — **16+ distinct display modes** layered onto whatever display is available (GT, MID, or both). The TEL drives the screen via four primary write commands: `0x21` (menu), `0x23` (title), `0x24` (property), `0xA5` (body text). Layered on top of these is a status bitfield (`0x2C`) that controls volume routing and on-call indicators, and an LED bitfield (`0x2B`) for the red / yellow / green call-state lamps.

This page is the choreography. Per-byte detail lives on [`devices/tel.md`](../devices/tel.md).

## Display modes

| # | Mode | Layout byte | Notes |
|---|---|---|---|
| 1 | **Default** | — | Fallback / error screen. Single line; flashing-text support via `0x01` prefix. |
| 2 | **Dial** | `0x42` | Phone-number entry. Digits 0–9, `*`, `#`, backspace. |
| 3 | **Directory** | `0x43` | Contact list with 4-char menu slots, `0x06` delimiters, pagination. |
| 4 | **Last Numbers** | — | Recent-call history. |
| 5 | **Top 8** | `0x80` | Favourite contacts. |
| 6 | **Info** | — | Signal / cost / time properties via `0x24`. |
| 7 | **PIN** | title `0x05` | SIM PIN entry. |
| 8 | **SMS List** | `0xF0` | SMS index. |
| 9 | **SMS Detail** | `0xF1` | SMS message body via `0xA5` (cursor-offset writes). |
| 10 | **SOS / Emergency** | `0xF1` + title `0xC0` | Emergency call. |
| 11 | **Bluetooth pairing** | `0xF0` | BT-device pairing UI. |
| 12–16 | **IKE quick contacts** | title `0x40`–`0x43` | Cluster-rendered call shortcuts on the high-cluster IKE. |
| Overlay | **On-call / Establishing / Voice / Idle** | (none — `0x2C` driven) | Status overlays driven by the telephone status bitfield. |

> *Source:* Wilhelm `telephone/default.md`, `dial.md`, `directory.md`, `last_numbers.md`, `top_8.md`, `info.md`, `pin.md`, `list.md`, `detail.md`, `sms.md`. Per-display detail is per-file.

## The state-bit hierarchy

The telephone's behaviour at any moment is determined by three overlapping state surfaces:

1. **Layout** (which mode is currently rendered): set by `0x21` / `0x23` / `0xA5` with a specific layout byte.
2. **Status** (`0x2C`, broadcast to displays multicast `0xE7`): which call state is in effect (power, establishing, on-call, hands-free).
3. **LED** (`0x2B`, broadcast to `0xE7`): red / yellow / green lamps reflecting the same status.

These three are kept in sync by the TEL emitting all three when state changes — see "Per-event flow" below.

## Per-event flow

### User powers on telephone (KL-R reached)

1. TEL emits announce: `C8 04 FF 02 31 00` (or variant-specific signature).
2. TEL broadcasts initial state: `0x2C 0x00` (power off) → after self-test, `0x2C 0x10` (power on, idle).
3. TEL emits LED `0x2B 0x10` (green on — connected and idle).
4. TEL writes default screen: `0x23 0x00 0x30 <"Telephone">` to GT / MID.

### User presses "TEL" on BMBT or "R/T" on MFL

1. BMBT / MFL emits button event (`0x48 0x08` press, then release; or MFL `0x3B 0x80` TEL press).
2. TEL receives the press and decides which display to open (Dial / Top-8 / Last Numbers based on a session state).
3. TEL emits `0x20` (mode) to GT: `C8 05 FF 20 02 0C EF` (asks GT to switch to TEL mode).
4. GT acknowledges by rendering the layout.
5. TEL writes the mode's content: `0x21` menu text, `0x23` title, `0x24` properties.

### User dials a number

1. BMBT digit press → routes via GT to TEL: `3B 06 C8 31 42 02 07` (DIAL layout `0x42`, DIGIT function `0x02`, digit '7').
2. TEL appends digit to internal buffer.
3. TEL re-renders the title with the new number: `C8 0C 3B 23 63 30 ...` (`DIAL_NUMBER` title layout, UPDATE option, new digits).

### Incoming call

1. Cellular subsystem detects ring.
2. TEL emits `0x2C 0x14` (power + establishing-call): `C8 04 E7 2C 14 ...`
3. TEL emits LED `0x2B 0x30` (green blink).
4. TEL writes `0x23` title with `ON_CALL` layout `0x01`: `C8 07 E7 23 01 00 C7 C8 05` — renders the two-cell "on call" glyph.

### User answers (or call is auto-answered hands-free)

1. TEL transitions state to on-call: `0x2C 0x35` (`ACTIVE_POWER_CALL_HANDSFREE` = power + establishing + hands-free + on-call).
2. LED stays green (`0x2B 0x10`) — call is established.
3. **Volume routing flips.** From this moment, MFL and BMBT `0x32` (volume) frames are addressed to TEL `0xC8` instead of RAD `0x68`. See [`devices/mfl.md`](../devices/mfl.md#cross-cutting-subsystems).
4. TEL writes the call-active title and starts a call-timer.

### Call timer updates

Once per second (or per minute, depending on display):

1. TEL emits `0x24` with property `0x96` (minutes) or `0x97` (seconds): `C8 08 3B 24 96 00 20 20 30 79` → "00".
2. Display updates the call-time field in-place.

### Hang-up

1. User presses the TEL button on BMBT / MFL.
2. TEL ends the call.
3. TEL emits `0x2C 0x10` (back to power-idle).
4. LED back to `0x2B 0x10` (green steady).
5. **Volume routing reverts to radio.**
6. TEL writes the default / pre-call display layout.

## SMS message handling

SMS messages can exceed the per-frame body capacity. The TEL handles this by:

1. Writing the header with `0x23` title.
2. Writing the body with `0xA5` (body text with cursor offset). Each `0xA5` frame carries a chunk plus a cursor-offset byte indicating where in the detail layout the chunk goes.
3. Setting the SMS icon bit via `0xA6`.

The detail layout has six text lines (`IBUS_TEL_DETAIL_LINE_0..5` = `0x40..0x45`) and four buttons (back / left / centre / right at `0x50..0x53`). The TEL fills each line independently with separate `0xA5` writes.

> *Source:* Wilhelm `telephone/a5.md`, `telephone/detail.md`. BlueBus `ibus.h:426–437` for the detail-index constants.

## Bluetooth pairing UI (BlueBus-specific)

When BlueBus is impersonating an Everest variant (`0x38` signature), it uses the standard TEL UI to render Bluetooth-device pairing:

1. Layout `0xF0` (LIST) for the pairing list.
2. Each device gets a row, with the BT MAC / name as the label.
3. Selection drives a BlueBus-internal pair-with-this-device action via callbacks.

> *Source:* Wilhelm `telephone/list.md`; BlueBus impersonation logic in `handler_ibus.c`.

## IKE quick contacts

On the high cluster, the IKE itself can render a tiny "now calling X" tile in the OBC area. The TEL writes to it via `0x23` with title layout values `0x40`–`0x43`:

```
C0 0B 80 23 42 20 4A 65 72 72 79 ...    # "Jerry" — IKE quick contact
```

Note the destination: `0x80` (IKE) not `0xC0` (MID). The IKE itself renders this in a dedicated OBC slot.

> *Source:* Wilhelm `telephone/23.md:53–58, 102`.

## Display vs status separation

A subtle but important pattern: **status** (`0x2C`, `0x2B`, `0xA6`) goes to the multicast `0xE7` (every display catches it and updates its icons / LEDs). **Layout / content** (`0x20`, `0x21`, `0x23`, `0x24`, `0xA5`) goes to the specific display (GT `0x3B` or MID `0xC0`).

This means a chassis with both a GT and a MID will have both displays' icons in sync (because both consume `0xE7`), but only one display will have the active TEL layout at a time.

## Cross-cutting links

- [`devices/tel.md`](../devices/tel.md) — per-byte detail for every command above.
- [`devices/mid.md`](../devices/mid.md) — display side of TEL writes.
- [`devices/gt.md`](../devices/gt.md) — display side on chassis with navigation.
- [`devices/ike.md`](../devices/ike.md) — IKE quick-contact rendering.
- [`devices/mfl.md`](../devices/mfl.md#bit-fields-and-enums) — voice / TEL button events from the steering wheel.

## Open questions / TBC

- **Last Numbers exit behaviour.** Wilhelm `telephone/last_numbers.md` notes the TEL doesn't emit a `0x31` close event when the user navigates away — the last-written number persists on display until the next `0x21`. Unclear if this is by design or a bug.
- **Direct dial `0x2D` compatibility.** Restricted to Motorola HW 06+ and BIT HW 02+. Whether the Everest / Bluetooth variant supports it is undocumented.
- **MK3 v40+ Top-8 redesign.** MK3 with the new UI (v40+) replaces Top-8 as the home screen with a redesigned Dial layout. The TEL session-state across this change is fragile; Wilhelm `telephone/20.md:12–26` flags it.
- **MID divergence.** MID treats some byte positions in `0x21` differently from GT — 3 MSBs reserved for clear / buffer flags on MID per Wilhelm `telephone/2c.md:37–45`. Not exhaustively documented.

## Sources

- [`devices/tel.md`](../devices/tel.md) — primary source.
- Wilhelm `telephone/*.md` — per-mode pages.
- Wilhelm `02.md:100–105` — telephone variant signatures.
- BlueBus `ibus.h:405–507` — TEL constant block.
- BlueBus `handler_ibus.c` — `HandlerSetIBusTELStatus`, MFL volume routing, the Everest impersonation.
