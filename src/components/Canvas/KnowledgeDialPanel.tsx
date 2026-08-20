'use client';
import { useCanvasStore } from '@/lib/store';
import { STATUS_META, type CanvasData, type Node, type Status } from '@/lib/types';

const ORDER: Status[] = ['failed', 'review', 'mastered', 'none'];

interface Segment {
  key: Status;
  color: string;
  value: number;
  proportion: number;  // fraction of total circumference this segment occupies (0-1, includes gap reserved space)
}

function buildSegments(counts: Record<Status, number>, total: number): Segment[] {
  let cumulative = 0;
  return ORDER.map(k => {
    const proportion = total > 0 ? counts[k] / total : 0;
    const seg: Segment = { key: k, color: STATUS_META[k].color, value: counts[k], proportion };
    cumulative += proportion;
    return seg;
  });
}

/**
 * Shared donut arc renderer. Produces SVG <circle> elements whose
 * stroke-dasharray / stroke-dashoffset produce correct arcs at any radius.
 *
 * Formula (reference from prompt improvement.md):
 *   dash_i      = (value_i / T) * C
 *   dashoffset  = -acc   (where acc = sum of prior dash lengths, clockwise from 12 o'clock)
 *
 * The outer <g transform="rotate(-90 cx cy)"> rotates the start to 12 o'clock.
 * dashoffset is NOT a rotation — it is the "where along the circle does this stroke begin".
 * A negative offset moves the dash start clockwise past the 12 o'clock point.
 */
function renderArcs(segments: Segment[], radius: number, strokeWidth: number, circ: number, cx: number, cy: number) {
  let acc = 0;
  return segments.map((s, i) => {
    const dash = s.proportion * circ;
    if (dash <= 0) return null;
    const offset = -acc;            // clockwise from 12 o'clock
    acc += dash;
    return (
      <circle key={s.key} cx={cx} cy={cy} r={radius} fill="none"
        stroke={s.color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={offset}
        strokeLinecap="butt"
        className="dial-seg"
        style={{ animationDelay: `${i * 60}ms` }}
      />
    );
  });
}

export default function KnowledgeDialPanel() {
  const canvas = useCanvasStore(s => s.canvas as CanvasData | null);
  const heatmapMode = useCanvasStore(s => s.heatmapMode as 'full' | 'mini' | 'hidden');
  const setHeatmapMode = useCanvasStore(s => s.setHeatmapMode as (m: 'full' | 'mini' | 'hidden') => void);
  const sidebarOpen = useCanvasStore(s => s.sidebarOpen as boolean);

  if (!canvas) return null;

  // Normalize legacy 'hidden' → 'mini' so the old value stops circulating
  if (heatmapMode === 'hidden') {
    setHeatmapMode('mini');
    return null;
  }

  const counts: Record<Status, number> = { none: 0, failed: 0, review: 0, mastered: 0 };
  Object.values(canvas.nodes).forEach((n: Node) => { counts[n.status]++; });
  const total = ORDER.reduce((s, k) => s + counts[k], 0);
  const segments = buildSegments(counts, total);

  // Validate proportions sum to ~1 (dev safety, no runtime cost)
  const propSum = segments.reduce((s, seg) => s + seg.proportion, 0);
  if (propSum > 0 && Math.abs(propSum - 1) >= 0.0001) {
    console.error('[Dial] Proportions do not sum to 1:', propSum, segments);
  }

  // Log for verification (matches prompt §6 check)
  // With Failed=1, Review=1, Mastered=1, Untagged=2: T=5, C≈289.03
  // dashes = 57.81, 57.81, 57.81, 115.62 → sum = 289.05 ≈ C

  const left = sidebarOpen ? '276px' : '56px';

  // ── Mini donut ──────────────────────────────────────────────
  if (heatmapMode === 'mini') {
    const miniR = 35;
    const miniStroke = 18;
    const miniCirc = 2 * Math.PI * miniR;
    const miniCx = 50, miniCy = 50;

    return (
      <div
        className="dial-mini ui-float"
        role="button"
        tabIndex={0}
        aria-label="Expand knowledge dial"
        title="Double-click to expand"
        onClick={e => { e.stopPropagation(); setHeatmapMode('full'); }}
        onDoubleClick={e => { e.stopPropagation(); setHeatmapMode('full'); }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHeatmapMode('full'); } }}
        onPointerDown={e => e.stopPropagation()}
        style={{ left }}
      >
        <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
          <g transform={`rotate(-90 ${miniCx} ${miniCy})`}>
            <circle cx={miniCx} cy={miniCy} r={miniR} fill="none"
              stroke="var(--health-bg)" strokeWidth={miniStroke}
              strokeDasharray={`${miniCirc} ${miniCirc}`}
              strokeDashoffset="0"
            />
            {renderArcs(segments, miniR, miniStroke, miniCirc, miniCx, miniCy)}
          </g>
        </svg>
        <button className="heatmap-icon-btn dial-mini-hide" aria-label="Hide knowledge dial" title="Hide"
          onClick={e => { e.stopPropagation(); setHeatmapMode('mini'); }}
          onPointerDown={e => e.stopPropagation()}>×</button>
      </div>
    );
  }

  // ── Expanded donut + legend ─────────────────────────────────
  const fullR = 46;
  const fullStroke = 18;
  const fullCirc = 2 * Math.PI * fullR;
  const fullCx = 65, fullCy = 65;

  return (
    <aside
      id="legend"
      className="dial-card ui-float"
      onDoubleClick={e => { e.stopPropagation(); setHeatmapMode('mini'); }}
      style={{ left }}
    >
      <div className="dial-grid">
        <div className="dial-ring-wrap" title="Knowledge DIAL">
          <svg width="130" height="130" viewBox="0 0 130 130" className="dial-ring">
            <g transform={`rotate(-90 ${fullCx} ${fullCy})`}>
              <circle cx={fullCx} cy={fullCy} r={fullR} fill="none"
                stroke="var(--health-bg)" strokeWidth={fullStroke}
                strokeDasharray={`${fullCirc} ${fullCirc}`}
                strokeDashoffset="0"
              />
              {renderArcs(segments, fullR, fullStroke, fullCirc, fullCx, fullCy)}
            </g>
          </svg>
        </div>
        <div className="dial-legend">
          {ORDER.map(k => (
            <div className="dial-legend-row" key={k}>
              <span className="dial-legend-sw" style={{ background: STATUS_META[k].color }}/>
              <span className="dial-legend-label">
                {STATUS_META[k].label}{k === 'failed' ? ' — restudy' : ''}
              </span>
              <span className="dial-legend-val">{counts[k]}</span>
            </div>
          ))}
          {total === 0 && (
            <p className="dial-empty">No nodes yet — create your first topic.</p>
          )}
        </div>
      </div>
      <div className="dial-header-actions">
        <button className="heatmap-icon-btn" aria-label="Minimize dial" title="Minimize"
          onClick={e => { e.stopPropagation(); setHeatmapMode('mini'); }}
          onPointerDown={e => e.stopPropagation()}>–</button>
        <button className="heatmap-icon-btn" aria-label="Hide dial" title="Hide"
          onClick={e => { e.stopPropagation(); setHeatmapMode('mini'); }}
          onPointerDown={e => e.stopPropagation()}>×</button>
      </div>
    </aside>
  );
}
