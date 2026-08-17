import { toPng } from 'html-to-image';
import { useCanvasStore } from './store';
import { visibleOrder } from './operations/hierarchy';
import { NODE_MIN_HEIGHT, NODE_WIDTH } from './types';

function sanitize(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'canvas';
}

export async function exportCanvasPng(): Promise<void> {
  const { canvas, clearSelection } = useCanvasStore.getState();
  if (!canvas) return;
  const worldEl = document.querySelector<HTMLElement>('[data-export-root]');
  if (!worldEl) throw new Error('Export root not found');
  clearSelection();
  // Let React re-render without the selection outline before capturing.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const order = visibleOrder(canvas);
  if (order.length === 0) return;
  const cards = Array.from(worldEl.querySelectorAll<HTMLElement>('.node-card'));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  order.forEach((id, i) => {
    const node = canvas.nodes[id];
    if (!node) return;
    const el = cards[i];
    const w = el?.offsetWidth || NODE_WIDTH;
    const h = el?.offsetHeight || NODE_MIN_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  });
  const width = Math.max(1, Math.ceil(maxX - minX));
  const height = Math.max(1, Math.ceil(maxY - minY));
  const dataUrl = await toPng(worldEl, {
    pixelRatio: 2,
    width,
    height,
    style: { transform: `translate(${-minX}px, ${-minY}px)` },
    filter: el => !(el instanceof HTMLElement && el.classList.contains('lasso-marquee')),
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${sanitize(canvas.name)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
