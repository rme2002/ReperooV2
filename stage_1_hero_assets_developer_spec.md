# Stage 1 Hero Assets – Developer Spec

This document describes how to implement the **Stage 1 mascot hero** on the Home screen using the provided assets.

---

## Asset names (fixed)

Use **exactly** these filenames:

- `mascotV1.png` → Stage 1 mascot (transparent)
- `ground.png` → Small ground patch (transparent)
- `sparkle.png` → Sparkle FX (transparent, reusable)
- `ring.png` → Semi-circular hero ring / arc (transparent)

---

## 1. Purpose of the hero

- Create a **friendly, gamified focal point** at the top of the Home screen.
- The hero should feel **light, calm, and modern**.
- Assets must **layer cleanly** and disappear smoothly as the user scrolls.
- The hero must never compete visually with content cards.

---

## 2. Layering order (bottom → top)

1. Page background / gradient
2. `ring.png`
3. `mascotV1.png`
4. `ground.png`
5. `sparkle.png` (temporary, animated)

> Note: `ground.png` visually belongs under the mascot’s feet, but can be rendered after the mascot if needed for alignment.

---

## 3. Placement rules

### `mascotV1.png`
- Centered horizontally in the hero container.
- Anchored visually in the middle of the hero.
- Primary focal point.

### `ground.png`
- Centered horizontally.
- Positioned directly under the mascot’s feet / pouch.
- Slightly wider than the mascot’s stance.
- Must **not** touch screen edges.

### `ring.png`
- Centered behind the mascot.
- Decorative only.
- Must not overlap content cards.

### `sparkle.png`
- Spawned around mascot or ring only.
- Small offsets (±20–40px).
- Must never block text or buttons.

---

## 4. Scroll behavior (collapsing hero)

Drive animations using a normalized scroll progress value (`0 → 1`).

### Scale & movement

| Asset | Scale (top → collapsed) | TranslateY |
|------|--------------------------|------------|
| `mascotV1.png` | `1.0 → 0.75` | Upwards |
| `ground.png` | `0.95 → 0.70` | Upwards |
| `ring.png` | `1.0 → 0.85` | Minimal |

### Opacity

- `ring.png`: fades out first (`progress 0.2 → 0.6`)
- `ground.png`: fades out second (`progress 0.4 → 0.8`)
- `mascotV1.png`: remains visible the longest

When fully collapsed:
- `ring.png` → hidden
- `ground.png` → hidden
- `mascotV1.png` → optional small badge or hidden

---

## 5. Animation rules

- No constant looping animations.
- Sparkles are shown only:
  - On streak milestones
  - On first load (once, very subtle)
- Sparkles auto-remove after ~1 second.
- No bouncing or wobbling animations.

---

## 6. Interaction

- Tapping `mascotV1.png` opens a **Progress / Level sheet**:
  - Level
  - XP
  - Streak explanation
- `ground.png` and `ring.png` have **no interaction**.

---

## 7. Performance & quality guidelines

- All assets must have **fully transparent backgrounds**.
- Do not stretch assets beyond their natural aspect ratio.
- Prefer `opacity` + `transform` animations.
- Avoid runtime blur, shadows, or filters.

---

## 8. Reusability & future stages

- Asset naming is **versioned by stage**:
  - `mascotV2.png`, `groundV2.png`, etc.
- Logic and layout stay the same; only assets change.
- Future stages may introduce more advanced ground or ring visuals.

---

## 9. Quick developer checklist

- [ ] Assets loaded with transparency
- [ ] Correct z-index / layering order
- [ ] Ground fades out before mascot
- [ ] Ring never visible in collapsed state
- [ ] Sparkles used sparingly

---

**End of spec**

