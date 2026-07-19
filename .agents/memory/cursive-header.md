---
name: Cursive header location
description: Where "My Digital Shoes" Great Vibes cursive header lives and how to remove it
---

Both `wardrobe.tsx` and `generate.tsx` had a cursive "My Digital Shoes" heading inside a `{ready && (...)}` block.

- **wardrobe.tsx**: labelled `{/* Fancy title */}`, a `<div>` with `zIndex: 25` containing `<span style={{ fontFamily: "'Great Vibes', cursive" }}>My Digital Shoes</span>`
- **generate.tsx**: unlabelled `{ready && (<div ...>)}` block with same span, placed just before the shelf carousel block

**Why hard to find:** no obvious JSX label, inside conditional render, overlays native status bar at `top: calc(env(safe-area-inset-top) + 6px)`.

**How to remove:** delete the entire `<div>...</div>` block (and wrapping `{ready && (...)}` if no siblings) from each file.

**Last commit with header present (build 28 state):** `b9e9f5c`
