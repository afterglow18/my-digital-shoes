---
name: Cursive header location + shelf label positioning
description: Where the cursive header was, how to remove it, and the finalized shelf label/photo positions
---

## Cursive header (removed)
Both `wardrobe.tsx` and `generate.tsx` had a cursive "My Digital Shoes" heading inside a `{ready && (...)}` block.

- **wardrobe.tsx**: labelled `{/* Fancy title */}`, a `<div>` with `zIndex: 25` containing `<span style={{ fontFamily: "'Great Vibes', cursive" }}>My Digital Shoes</span>`
- **generate.tsx**: unlabelled `{ready && (<div ...>)}` block with same span, placed just before the shelf carousel block

**Why hard to find:** no obvious JSX label, inside conditional render, overlays native status bar at `top: calc(env(safe-area-inset-top) + 6px)`.

**How to remove:** delete the entire `<div>...</div>` block (and wrapping `{ready && (...)}` if no siblings) from each file.

**Last commit with header present (build 28 state):** `b9e9f5c`

---

## Finalized shelf label positions (wardrobe.tsx + generate.tsx)

```
const labelNudge = rowIdx === 0 ? pH(ir, 0.003) : 0;   // negative offsets = up
// ...heading top:
top: rowIdx === 0 ? secTop + labelNudge : secTop
```

- **Heels (row 0):** `secTop + labelNudge` — small positive nudge (currently `pH(ir, 0.003)`, adjust to taste)
- **Sneakers (row 1):** `secTop` — sits on the black shelf edge (sectionTop == previous shelfY here)
- **Boots (row 2):** `secTop` — sits on the black shelf edge (sectionTop is 0.437, slightly below the glow at 0.42)
- **Sandals (row 3):** `secTop` — inside the section, same formula

**Why boots can't use previous-row shelfY:** `LM.rows[1].shelfY = 0.42` but boots `sectionTop = 0.437` — the glow and black edge are offset; using shelfY lands on the glow, not the black rim.

## Finalized carousel (photo) positions

```
top: secTop + labelH + (rowIdx === 0 ? labelNudge : 0) + (rowIdx === 1 || rowIdx === 2 ? pH(ir, 0.02) : 0)
height: rowIdx === 3 ? consistentPhotoH - pH(ir, 0.012) : consistentPhotoH
maxPhotoH: rowIdx === 3 ? consistentPhotoH - pH(ir, 0.012) : consistentPhotoH
```

- Sneakers + boots carousels nudged down `pH(ir, 0.02)` to clear the shelf edge label
- Sandals carousel trimmed by `pH(ir, 0.012)` to prevent overflow past shelf bottom

## Generate page — Spin It white bar

Shrunk from full `barY→barBot` height to 56px centered in the same zone:
```
top: pY(ir, LM.barY) + pH(ir, LM.barBot - LM.barY) / 2 - 28
height: 56
```
Button is 52px tall; bar gives 2px breathing room each side.
