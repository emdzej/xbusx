# Radio ↔ GT arbitration

**Status:** Draft.

The **radio** (`0x68`) and the **graphics terminal** (`0x3B`) share the main on-board monitor on chassis with navigation. Both can write to it — the radio wants to show station / track / EQ; the GT wants to show menus, route guidance, OBC text. The arbitration choreography is how they decide who owns the screen at any moment.

Wilhelm dedicates an 814-line file (`radio/arbitration.md`) to the test cases and state-machine variants of this dance. This page is the protocol-level summary — what bytes move, when, and what they mean. Refer to the Wilhelm file for exhaustive test cases.

## The two messages

| Cmd | Direction | Purpose |
|---|---|---|
| `0x46` | RAD → GT | Radio side: request foreground / relinquish / hide overlays. |
| `0x45` | GT → RAD | GT side: confirm / override the radio's request; tell radio to background. |

Both are single-byte-payload commands. The byte is a bitmask.

## `0x46` bit layout (radio side)

| Mask | Meaning |
|---|---|
| `0x01` | Priority — radio is claiming the foreground (`IBUS_RAD_PRIORITY_RAD`). |
| `0x02` | Priority — radio is relinquishing to GT (`IBUS_RAD_PRIORITY_GT`); also "hide header" in context. |
| `0x04` | Hide body — Select overlay. |
| `0x08` | Hide body — Tone overlay. |
| `0x0C` | Hide body — Menu overlay (`IBUS_RAD_HIDE_BODY`). |

> *Sources:* BlueBus `ibus.h:255–257`; Wilhelm `radio/46.md:23–29`.

## `0x45` bit layout (GT side)

| Value | Meaning |
|---|---|
| `0x00` | Radio foreground, no audio+OBC. |
| `0x01` | Radio background (GT-priority). |
| `0x02` | Radio foreground + audio+OBC mode. |
| `0x10` | New-UI mode (MK3 v40+ / MK4 only). |
| `0x91` | GT background + new-UI + new-UI-hide set (e.g., MENU pressed in new-UI MK3/4). |

> *Sources:* Wilhelm `gt/45.md:15–22`; BlueBus's GT command constant at `ibus.h:180` (`IBUS_CMD_GT_SCREEN_MODE_SET`).

## The basic dance

A simplified normal-operation sequence:

1. **Radio asserts foreground.** Radio emits `0x46 + 0x01` to GT.
2. **GT confirms or overrides.** If the GT has nothing higher-priority active, it replies with `0x45 + 0x00` ("radio foreground, no special mode"). If the GT has a menu open, it might reply with `0x45 + 0x01` ("radio background").
3. **Radio acts on the GT's reply.** If the radio was told to background, it emits a final `0x46 + 0x02` to acknowledge.
4. **Post-arbitration writes.** The radio continues to send `0x23` title-text frames, but the GT renders them in the appropriate (foreground / background) zone per the priority just established.

## Hide-overlay flags

Independently of foreground / background priority, the radio can use the hide-body bits to signal that one of its overlay screens (Tone, Select, Menu) is currently open or closed.

Examples (from Wilhelm `radio/46.md:15–21`):

```
68 04 3B 46 01 10        # radio claiming foreground
68 04 3B 46 02 13        # radio relinquishing to GT
68 04 3B 46 08 19        # hide tone overlay
68 04 3B 46 0C 1D        # hide menu overlay
```

The GT uses these to decide whether to show the radio's Tone / Select / Menu, or its own OBC / nav overlay.

## What can go wrong

### MK3 v20 timing sensitivity

The MK3 v20 GT misses frames if the radio sends faster than the `IBUS_TX_FRAME_IDLE_WAIT 8 ms` (see [`protocol/link-and-timing`](../protocol/link-and-timing.md#wire-idle-time)). BlueBus respects this floor on every TX; software emulating a peer must do the same.

### Menu-release race

The GT does not reliably emit a "menu release" event when the user releases the menu button. BlueBus's `bmbt.c` UI module injects a synthetic `0xB4` (button `0x34` Menu + state `0x80` Release) via a timer to work around this — see [`devices/bmbt.md`](../devices/bmbt.md#open-questions--tbc) (commit `1294a91`).

### `0x46` / `0x45` race during ignition transitions

At ignition transitions (especially `KL-30 → KL-R`), modules wake at slightly different times. A radio that wakes first may assert foreground before the GT is alive. The GT, once up, may then take foreground — leading to a brief flicker on the screen. Treat this as cosmetic; do not implement state machines that try to "win" the race.

## On non-GT chassis

K-only chassis (E46, E83/E85, E87) have no GT. The radio still emits `0x23` title-text frames but addresses them to the MID (`0xC0`) directly. The `0x46`/`0x45` arbitration is **not present** — the radio is the sole owner of the MID's display surface, with only the telephone (`0xC8`) potentially overlaying via `0x27` set-mode + `0x21` / `0x23` writes. See [`devices/mid.md`](../devices/mid.md#cross-cutting-subsystems).

## On IRIS-equipped E39s

The IRIS (`0xE0`) is an integrated radio + display module. With IRIS installed, the conceptual "radio + display" split collapses into one address and there's no arbitration to do. See [`devices/iris.md`](../devices/iris.md).

## On rear-screen chassis (E38 with rear entertainment)

The GTF (`0x43`) is the rear-screen counterpart of the GT. It can also send `0xAA` to the NAV (with reduced scope per Wilhelm `nav/aa.md`), but the rear-screen radio-arbitration choreography is less documented. Assume the GTF behaves like the GT for `0x46` / `0x45` handling on its own screen, but verify with traffic captures.

---

## Open questions / TBC

- **Full state machine.** Wilhelm's `radio/arbitration.md` documents test cases per MK generation × radio variant. The cross-product is large. Fold the most-common (MK3 + BM53, MK4 + BM54) into a per-row state diagram in a future pass.
- **`0x46 + 0x02` priority byte overload.** It's documented both as "radio relinquish" and (in some contexts) as "hide header". Whether one or the other is intended is context-dependent and Wilhelm hedges.
- **Behaviour during nav route-calculation.** Some users report the GT does not respond to radio arbitration while it's computing a route — frames are queued and processed later. Confirm.

---

## Sources

- BlueBus `ibus.h:180, 255–257` — `IBUS_CMD_GT_SCREEN_MODE_SET 0x45`, hide-body and priority constants.
- Wilhelm `radio/46.md` — radio-side `0x46`.
- Wilhelm `gt/45.md` — GT-side `0x45`.
- Wilhelm `radio/arbitration.md` — 814 lines of test cases.
- [`devices/rad.md`](../devices/rad.md), [`devices/gt.md`](../devices/gt.md), [`devices/bmbt.md`](../devices/bmbt.md), [`devices/mid.md`](../devices/mid.md) — per-device documentation that links into this page.
