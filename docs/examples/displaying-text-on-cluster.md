# Example — displaying text on the cluster

**Status:** Draft.

Writing text to the BMW instrument cluster is the second-most-common reason to send frames on the bus (after CDC emulation). This page covers the practical mechanics: pick the right command, format the string correctly, get the timing right, and handle the variant-specific differences.

## What "the cluster" means

There are several display surfaces, and each takes different write commands. Pick the one your chassis actually has:

| Surface | Address | Write command(s) | Best for |
|---|---|---|---|
| High-cluster OBC area (E38/E39/E53 High) | IKE `0x80` | `0x23` title (when impersonating TEL); `0x24` property; CCM `0x1A` | Persistent text |
| MID (E38/E39/E53 without nav) | MID `0xC0` | `0x23` title from RAD; `0x23` from TEL; `0x21` menu from TEL/RAD | Radio-area / telephone text |
| GT (chassis with nav) | GT `0x3B` | RAD `0x23`, TEL `0x21`/`0x23`/`0xA5`, GT internal writes | Navigation / media text |
| Displays multicast | `0xE7` | `0x24` property (from IKE), `0x2A` boolean (from IKE), `0x2B` LEDs (TEL), `0xA6` SMS icon (TEL) | Updates that should hit *all* displays at once |

The simplest "write some text on the cluster" path: send a **`0x1A` Check Control Message** to the IKE `0x80`. It pops up a 20-character message on the high cluster's check-control panel.

## The `0x1A` approach

Frame:

```
<src> <len> 80 1A <display_type> <options> <20 ASCII bytes> <xor>
```

`<display_type>` controls behaviour:

| Value | Meaning |
|---|---|
| `0x30` | Clear — clears any existing check-control text. |
| `0x35` | Recall — re-shows the last persistent message. |
| `0x36` | Persist — priority 1; stays on until cleared. |
| `0x37` | Alert — priority 2; auto-clears after ~20 s with a gong. |

`<options>` byte:

- Lower nibble: gong (`0x0` none, `0x1` high single, `0x3` high double, `0x4` low single).
- Upper nibble: chevron icon (`0x0` off, `0x1` on, `0x3` blink).

> *Sources:* Wilhelm `lcm/1a.md:29–79`; BlueBus `ibus.h:207–208` for `IBUS_DATA_IKE_CCM_WRITE_CLEAR_TEXT 0x30` and `IBUS_DATA_IKE_CCM_WRITE_PERSIST_TEXT 0x36`.

**Example — display "HELLO WORLD" persistent, no gong:**

```
src = 0x18                       # impersonating CDC
dst = 0x80                       # IKE
cmd = 0x1A
display_type = 0x36              # persist
options = 0x00                   # no gong, no chevron
text = "HELLO WORLD         "    # padded to 20 chars

payload = [cmd, display_type, options] + [ord(c) for c in text]
# payload length = 23; with LEN prefix, total frame = 23 + 4 = 27 bytes
```

The resulting frame (XOR computed last):

```
18 19 80 1A 36 00 48 45 4C 4C 4F 20 57 4F 52 4C 44 20 20 20 20 20 20 20 20 20 <XOR>
```

The cluster shows "HELLO WORLD" on the check-control panel until it receives a `0x36` with empty text or a `0x30` clear.

### Important caveats

- **Maximum 20 characters.** Trailing bytes after the 20-char window are ignored or treated as undefined.
- **High-cluster only.** The `0x1A` CCM mechanism is the IKE / IKI surface. Low clusters (KOMBI) on E46 / E83 / E85 / E87 do not render `0x1A` text the same way; what they do is undocumented in the surveyed sources.
- **No diacritics.** The character set is mostly ASCII; for special characters see [`charset.md`](../charset.md).
- **Don't spam.** Production firmware (BlueBus) sends a CCM at most a couple of times per minute. Faster updates fight with real check-control messages from LCM faults.

## The `0x23 + 0x24` approach (more advanced)

On chassis with navigation, the IKE has an OBC display area that's normally filled with property text — date, temperature, range, etc. — written by the IKE itself to the `0xE7` multicast.

You can drive this same area by:

1. Sending `0x23` title-text to override the displayed property header.
2. Sending `0x24` property-text with a custom property value.

But the IKE will overwrite your `0x24` writes at the next periodic broadcast (it eagerly re-pushes the canonical text), so this approach is **transient** unless you re-write continuously.

For a persistent on-screen message, prefer `0x1A`.

## Writing to the GT (navigation chassis)

The GT exposes a rich write surface — title (`0x23`), indexed lists (`0x60`), zone writes (`0x62`), static screens (`0x63` on MKIV_STATIC). But the GT also enforces UI arbitration with the radio ([`subsystems/radio-gt-arbitration`](../subsystems/radio-gt-arbitration.md)); writes from a non-radio source generally don't show up unless your `SRC` masquerades as something the GT respects.

The pragmatic path is to **masquerade as the radio** (`0x68`) and write `0x23` title text — but doing this with a real radio present on the bus will cause collisions on every frame. So either:

- Ensure no real radio is present (BlueBus's approach — but BlueBus impersonates the CDC, not the radio).
- Use an address that has writeable access to displays — TEL (`0xC8`) for telephone-style writes, or write to `0xE7` multicast.

For most users, writing to the MID's title via the TEL surface is the cleanest route — see [`subsystems/telephone-ui`](../subsystems/telephone-ui.md).

## Writing to the MID (non-nav chassis)

If your chassis has a MID (E38/E39 without nav, or any chassis with only the MID), you can write title text directly:

```python
# Write "PLAYING…" as a title on the MID, sourced from "TEL" (0xC8)
def mid_title(text, src=0xC8, options=0x20):  # 0x20 = UPDATE option
    cmd = 0x23
    layout = 0x00          # DEFAULT title layout (Wilhelm telephone/23.md)
    payload = [cmd, layout, options] + [ord(c) for c in text[:11]]
    return build_frame(src, 0xC0, payload)
```

This appears in the MID's title row immediately. The MID will re-render whenever the next title write arrives.

## What you can't easily do

- **Modify the cluster's primary readouts** (speedometer needle position, RPM gauge). These are driven by the cluster's internal sensors, not by bus traffic.
- **Modify the OBC's stored values** without going through the GT-emulating `0x40` / `0x41` flow. You can write a new value with `0x40`, but the IKE will treat it as user input and behave accordingly.
- **Force a permanent display change.** Even `0x1A` `0x36` (persist) clears at next ignition cycle. There's no "write to flash" path on the bus.

## Cross-cutting links

- [`devices/ike.md`](../devices/ike.md#message-detail) — what the IKE accepts as DST.
- [`devices/mid.md`](../devices/mid.md#per-message-detail) — MID write surface.
- [`devices/gt.md`](../devices/gt.md) — GT write surface (arbitration-mediated).
- [`charset.md`](../charset.md) — special characters.
- [`subsystems/radio-gt-arbitration`](../subsystems/radio-gt-arbitration.md) — why GT writes are constrained.
