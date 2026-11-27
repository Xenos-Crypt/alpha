// Subtract doorway volumes from axis-aligned facade blocks without touching
// their outside footprint. Each cut produces disjoint boxes, preserving solids.
export function subtractBoxHoles(bounds, holes) {
  let parts = [bounds];
  for (const hole of holes) parts = parts.flatMap(b => {
    const lo = b.min.map((n,i) => Math.max(n,hole.min[i]));
    const hi = b.max.map((n,i) => Math.min(n,hole.max[i]));
    if (lo.some((n,i) => n >= hi[i])) return [b];
    const out = [], remaining = {min:[...b.min],max:[...b.max]};
    for (let axis=0;axis<3;axis++) {
      if (remaining.min[axis]<lo[axis]) {const p={min:[...remaining.min],max:[...remaining.max]};p.max[axis]=lo[axis];out.push(p);remaining.min[axis]=lo[axis];}
      if (remaining.max[axis]>hi[axis]) {const p={min:[...remaining.min],max:[...remaining.max]};p.min[axis]=hi[axis];out.push(p);remaining.max[axis]=hi[axis];}
    }
    return out;
  });
  return parts;
}
