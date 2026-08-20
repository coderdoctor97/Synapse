import type { Node, Position } from '../types';
import { HORIZONTAL_INDENT, NODE_MIN_HEIGHT, VERTICAL_GAP } from '../types';

/**
 * Pure tidy layout: roots keep their current positions; each root's
 * descendants are re-placed in createdAt order using the existing
 * cascade rules (x = parent.x + HORIZONTAL_INDENT; y = below last
 * sibling or parent.y). Returns only the moves that change a position.
 */
export function tidyPositions(nodes: Record<string, Node>): Array<{ id: string; position: Position }> {
  const moves: Array<{ id: string; position: Position }> = [];
  const positions: Record<string, Position> = {};
  for (const n of Object.values(nodes)) positions[n.id] = { ...n.position };

  const kidsOf = (id: string | null) =>
    Object.values(nodes)
      .filter(n => n.parentId === id)
      .sort((a, b) => a.createdAt - b.createdAt);

  const place = (parentId: string) => {
    const p = positions[parentId];
    const kids = kidsOf(parentId);
    let y = p.y;
    for (const kid of kids) {
      const pos = { x: p.x + HORIZONTAL_INDENT, y };
      const cur = positions[kid.id];
      if (cur.x !== pos.x || cur.y !== pos.y) {
        moves.push({ id: kid.id, position: pos });
        positions[kid.id] = pos;
      }
      y = y + (kid.size?.height ?? NODE_MIN_HEIGHT) + VERTICAL_GAP;
      place(kid.id);
    }
  };

  for (const root of kidsOf(null)) place(root.id);
  return moves;
}