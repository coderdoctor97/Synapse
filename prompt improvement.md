*Fix the status "dial" (the donut/gauge widget in the bottom‑left of the canvas, the one with the legend Failed / Needs review / Mastered / Untagged). It is rendering incorrectly: the ring is mostly empty and the colored arcs appear as tiny slivers at the top, in **both** the expanded and the collapsed/minimized state. The legend counts are correct, so **do not** change the data‑counting logic — the bug is purely in the donut's SVG arc math.*

---

## 1. Locate the component

Find the React component that renders this donut. Search for:

- The legend labels `Failed`, `Needs review`, `Mastered`, `Untagged`
- `stroke-dasharray` / `stroke-dashoffset`
- An `<svg>` with a circular track near the canvas overlay

**Important:** The component is shared by both the expanded card and the collapsed mini‑dial — fix the math in **one** place.

---

## 2. The correct SVG stroke‑dasharray math

For a circle of radius `r` (the radius of the **stroke centerline**):


| Step                | Formula                                      | Note                                                                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Circumference       | `C = 2 * Math.PI * r`                        | `r` must be the **exact same value** used in the `<circle r={...}>` markup. If the SVG is scaled via `viewBox`, `width`, `height`, or CSS `transform: scale()`, the `r` in the formula must still be the user‑space `r` from the markup — not a pixel measurement. |
| Total value         | `T = sum of all segment values`              | Here: `1 + 1 + 1 + 2 = 5`                                                                                                                                                                                                                                          |
| Segment dash length | `dash_i = (v_i / T) * C`                     | Convert the raw count into a fraction of the circumference.                                                                                                                                                                                                        |
| Dash array          | `stroke-dasharray = ${dash_i} ${C - dash_i}` | &nbsp;                                                                                                                                                                                                                                                             |
| Dash offset         | `stroke-dashoffset = C/4 - accumulated`      | `accumulated` is the running sum of `dash` for all **previous** segments. The `+C/4` (or equivalently `transform: rotate(-90deg)`) rotates the start to 12 o'clock.                                                                                                |


**Invariant to assert:** `sum(dash_i) === C` (within float epsilon). If it doesn't, the ring will have a gap or overflow — which is exactly the symptom we see.

---

## 3. Check these in order (most likely → least likely)

1. **Raw count used as the dash length.** Code like `strokeDasharray={`${value} ${C - value}`}` (using `value` directly) instead of `(value/T)*C`. With values 1,1,1,2 this draws 1px, 1px, 1px, 2px slivers at the top — the exact bug. **Fix:** multiply by `C/T`.
2. **Wrong circumference constant.** `C` computed from a different `r` than the markup — e.g. using the outer radius, the diameter, a hardcoded `100`, or `r` while the markup uses `r + strokeWidth/2`. The drawn arcs then cover only a fraction of the ring. **Fix:** make `C` and the markup `r` identical.
3. `**stroke-dashoffset` not accumulating.** If every segment uses the same offset (e.g. always `C/4`), they all start at 12 o'clock and stack on top of each other, so only the last/longest is visible and the rest of the ring is empty. **Fix:** each segment's offset must subtract the cumulative length of all prior segments.
4. **Wrong `total`.** `T` is `4` (number of categories) instead of `5` (sum of values), or it counts only tagged nodes, or it's `0`/`undefined` (→ `NaN` dashes → nothing draws). **Fix:** `T` must be the sum of the values you actually render.
5. **Degrees/radians or path‑arc flag error** (only if drawing with `<path d="... A ...">` instead of `<circle>`). The sweep angle must be `(v_i/T) * 360`, converted to radians only where `Math.sin`/`Math.cos` is used, and the large‑arc flag must be `angle > 180 ? 1 : 0`.

---

## 4. Reference implementation

Replace the body of your donut renderer with this pattern (keep your colors/labels):

```
type Seg = { label: string; color: string; value: number };
function Donut({ segments, size = 120, thickness = 14 }: { segments: Seg[]; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2;          // stroke centerline radius
  const C = 2 * Math.PI * r;                  // MUST match the <circle r> below
  const T = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke="#e5e7eb" strokeWidth={thickness} />          {/* track */}
        {segments.map((s) => {
          const dash = (s.value / T) * C;
          const offset = -acc;            // negative = clockwise from 12 o'clock
          acc += dash;
          return (
            <circle key={s.label} cx={size/2} cy={size/2} r={r} fill="none"
                    stroke={s.color} strokeWidth={thickness}
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt" />
          );
        })}
      </g>
    </svg>
  );
}
```

> If you prefer the `C/4` rotation trick instead of the `<g transform>` group, use `strokeDashoffset={C/4 - acc}` and drop the `<g transform>`. **Do not use both.**

---

## 5. If using a charting library (Recharts, Nivo, etc.)

The bug is in the **props**, not the library. You're likely:

- Passing raw counts where the lib expects fractions
- Setting a `max`/`total`/`innerRadius`/`outerRadius` prop that doesn't match the data
- Providing a data array whose order or keys don't line up with the colors

**Fix:** feed it `[{ name, value, color }]` with `value` = the count and let the lib compute fractions. Remove any manual `total` override.

---

## 6. Verify before declaring done

For the current canvas state the values are `Failed=1`, `Review=1`, `Mastered=1`, `Untagged=2`, so `T=5`. The four dashes must be `0.2C, 0.2C, 0.2C, 0.4C` — e.g. for `r=53`, `C≈333` → `66.6, 66.6, 66.6, 133.2`.

**Temporarily add this to confirm:**

```
console.log(C, T, segments.map(s => (s.value/T)*C))
```

All four numbers must sum to `C`. Visually, the ring must now be **fully filled** with no empty gap: red 20% → orange 20% → green 20% → gray 40% clockwise from 12 o'clock.

> If the design intends untagged to be the background track rather than a drawn segment, then red + orange + green must still total **60%** of the ring and the light track shows the remaining 40% — either way the colored part is currently far too small.

Confirm it looks right in **both** the expanded card and the collapsed mini‑dial, since they share this code.

---

## Out of scope — do not touch

- The node‑status counting that feeds the legend (it's correct)
- The canvas edges
- The color‑picker popovers
- The zoom controls

&nbsp;