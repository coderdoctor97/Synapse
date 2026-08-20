import { describe, expect, it } from 'vitest';
import { tidyPositions } from '../src/lib/operations/layout';
import type { Node } from '../src/lib/types';
import { HORIZONTAL_INDENT, NODE_MIN_HEIGHT, VERTICAL_GAP } from '../src/lib/types';

function makeNode(id: string, parentId: string | null, x: number, y: number, createdAt = 0): Node {
  return { id, content: '', parentId, position: { x, y }, status: 'none', isCollapsed: false, createdAt, updatedAt: 0 };
}

describe('tidyPositions', () => {
  it('keeps roots at their current positions', () => {
    const nodes: Record<string, Node> = {
      a: makeNode('a', null, 100, 200),
      b: makeNode('b', null, 500, 50),
    };
    const moves = tidyPositions(nodes);
    expect(moves.some(m => m.id === 'a')).toBe(false);
    expect(moves.some(m => m.id === 'b')).toBe(false);
  });

  it('re-places descendants in createdAt order using cascade rules', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 0, 0),
      c1: makeNode('c1', 'root', 999, 999, 1),
      c2: makeNode('c2', 'root', 999, 999, 2),
      g1: makeNode('g1', 'c1', 999, 999, 1),
    };
    const moves = tidyPositions(nodes);
    const c1 = moves.find(m => m.id === 'c1');
    const c2 = moves.find(m => m.id === 'c2');
    const g1 = moves.find(m => m.id === 'g1');
    expect(c1?.position).toEqual({ x: HORIZONTAL_INDENT, y: 0 });
    expect(c2?.position).toEqual({ x: HORIZONTAL_INDENT, y: NODE_MIN_HEIGHT + VERTICAL_GAP });
    expect(g1?.position).toEqual({ x: HORIZONTAL_INDENT * 2, y: 0 });
  });

  it('is deterministic: same input yields same moves', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 0, 0),
      c1: makeNode('c1', 'root', 999, 999, 1),
      c2: makeNode('c2', 'root', 999, 999, 2),
    };
    const a = tidyPositions(nodes);
    const b = tidyPositions(nodes);
    expect(a).toEqual(b);
  });

  it('returns no moves when already tidy', () => {
    const nodes: Record<string, Node> = {
      root: makeNode('root', null, 0, 0),
      c1: makeNode('c1', 'root', HORIZONTAL_INDENT, 0, 1),
    };
    expect(tidyPositions(nodes)).toEqual([]);
  });
});