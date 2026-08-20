'use client';
import {useMemo} from 'react';
import {useCanvasStore} from '@/lib/store';
import {NODE_MIN_HEIGHT, NODE_WIDTH} from '@/lib/types';

// Node card dimensions from globals.css (.node-card { width: 280px; min-height: 60px }).
// Card height can grow with content, so wires anchor to the collapsed-height vertical center.
const NODE_W = NODE_WIDTH;       // 280
const NODE_H = NODE_MIN_HEIGHT;  // 60

// Wire color follows the PARENT node: tint > status > neutral.
// Applied via inline style (NOT an SVG attribute) so CSS var() resolves.
const STATUS_COLOR: Record<string, string> = {
  mastered: 'var(--green)',      // #10b981
  review:   'var(--amber)',      // #f59e0b
  failed:   'var(--red)',        // #ef4444
  none:     'var(--wire-color)', // #6b7280 — untagged gray
  default:  'var(--wire-color)', // fallback for null/unknown status
};

export default function Edges() {
  const nodes = useCanvasStore(s => s.canvas?.nodes);

  const paths = useMemo(() => {
    if (!nodes) return [];
    const out: {key: string; d: string; stroke: string}[] = [];

    for (const child of Object.values(nodes)) {
      if (!child.parentId) continue; // root node — no wire
      const parent = nodes[child.parentId];
      if (!parent) continue; // orphan — parent not found in nodes map

      // Parent anchor: RIGHT edge, vertical center.
      const parentX = parent.position.x + NODE_W;
      const parentY = parent.position.y + NODE_H / 2;

      // Child anchor: LEFT edge, vertical center.
      const childX = child.position.x;
      const childY = child.position.y + NODE_H / 2;

      // Smooth S-curve (cubic bezier) from parent to child.
      // Control points always pull outward from their respective
      // endpoints, regardless of whether child is left or right
      // of parent. Minimum 80 px offset prevents flat/looping curves
      // for very short distances.
      const offset = Math.max(Math.abs(childX - parentX) * 0.5, 80);
      const cp1x = parentX + offset;
      const cp1y = parentY;
      const cp2x = childX - offset;
      const cp2y = childY;

      // Precedence: tint > status > neutral.
      const stroke = parent.tint
        ? parent.tint
        : (STATUS_COLOR[parent.status] ?? STATUS_COLOR.default);

      out.push({
        key: `edge-${child.parentId}-${child.id}`,
        d: `M ${parentX} ${parentY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${childX} ${childY}`,
        stroke,
      });
    }
    return out;
  }, [nodes]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      {paths.map(p => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          strokeLinecap="round"
          // Inline style (not attribute) so var() resolves; width ~2 per spec.
          style={{ stroke: p.stroke, strokeWidth: 2 }}
        />
      ))}
    </svg>
  );
}
