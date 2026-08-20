import { describe, it, expect, vi } from 'vitest';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  length = 0;
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

async function freshEmptyStore() {
  const storage = new MemoryStorage();
  (globalThis as any).localStorage = storage;
  vi.useRealTimers();
  storage.clear();
  const now = Date.now();
  storage.setItem('synapse:v1:canvas:test', JSON.stringify({
    id: 'test', name: 'Test', nodes: {}, viewport: { x: 0, y: 0, zoom: 1 }, createdAt: now, updatedAt: now,
  }));
  vi.resetModules();
  const mod = await import('../src/lib/store');
  mod.useCanvasStore.getState().init('test', { x: 800, y: 600 });
  return mod.useCanvasStore;
}

describe('undo/redo reproduction', () => {
  it('update() -> undo -> redo restores content', async () => {
    const store = await freshEmptyStore();
    const s = store.getState();

    s.createRoot({ x: 400, y: 300 });
    const nodeId = Object.keys(store.getState().canvas!.nodes)[0];

    // Before any change, past should be empty (init resets it)
    expect(s.past.length).toBe(0);

    // Update content
    store.getState().update(c => { c.nodes[nodeId].content = 'updated'; });
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('updated');

    // Undo
    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('');

    // Redo
    store.getState().redo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('updated');
  });

  it('setNodeStatus -> undo -> redo restores status', async () => {
    const store = await freshEmptyStore();

    store.getState().createRoot({ x: 400, y: 300 });
    const nodeId = Object.keys(store.getState().canvas!.nodes)[0];

    store.getState().setNodeStatus(nodeId, 'mastered');
    expect(store.getState().canvas!.nodes[nodeId].status).toBe('mastered');

    // setNodeStatus uses update() internally — should have history
    expect(store.getState().past.length).toBeGreaterThan(0);

    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].status).toBe('none');

    store.getState().redo();
    expect(store.getState().canvas!.nodes[nodeId].status).toBe('mastered');
  });

  it('createChild -> undo removes the child, redo adds it back', async () => {
    const store = await freshEmptyStore();

    store.getState().createRoot({ x: 400, y: 300 });
    const parentId = Object.keys(store.getState().canvas!.nodes)[0];
    const beforeCount = Object.keys(store.getState().canvas!.nodes).length;

    store.getState().createChild(parentId);
    const afterCount = Object.keys(store.getState().canvas!.nodes).length;
    expect(afterCount).toBe(beforeCount + 1);

    expect(store.getState().past.length).toBeGreaterThan(0);

    // Undo
    store.getState().undo();
    expect(Object.keys(store.getState().canvas!.nodes).length).toBe(beforeCount);

    // Redo
    store.getState().redo();
    expect(Object.keys(store.getState().canvas!.nodes).length).toBe(afterCount);
  });

  it('multiple undo/redo steps trace through edit history', async () => {
    const store = await freshEmptyStore();

    store.getState().createRoot({ x: 400, y: 300 });
    const nodeId = Object.keys(store.getState().canvas!.nodes)[0];

    store.getState().update(c => { c.nodes[nodeId].content = 'first'; });
    store.getState().update(c => { c.nodes[nodeId].content = 'second'; });
    store.getState().update(c => { c.nodes[nodeId].content = 'third'; });

    const s = store.getState();
    // createRoot + 3 updates = 4 entries (the pre-createRoot empty canvas + 3 content snapshots)
    expect(s.past.length).toBe(4);

    s.undo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('second');

    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('first');

    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('');

    store.getState().redo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('first');

    // Future should be cleared on new edit after undo
    store.getState().update(c => { c.nodes[nodeId].content = 'overwritten'; });
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('overwritten');
    expect(store.getState().future.length).toBe(0);

    // Undo again
    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].content).toBe('first');
  });

  it('toggleNode (collapse/expand) pushes to history', async () => {
    const store = await freshEmptyStore();

    store.getState().createRoot({ x: 400, y: 300 });
    const nodeId = Object.keys(store.getState().canvas!.nodes)[0];

    // Toggle collapse
    store.getState().toggleNode(nodeId);
    const afterToggle = store.getState().past.length;
    expect(afterToggle).toBeGreaterThan(0, 'toggleNode should record history');

    // Undo
    store.getState().undo();
    expect(store.getState().canvas!.nodes[nodeId].isCollapsed).toBe(false);
  });

  it('remove node -> undo restores the node', async () => {
    const store = await freshEmptyStore();

    store.getState().createRoot({ x: 400, y: 300 });
    store.getState().createChild(Object.keys(store.getState().canvas!.nodes)[0]);

    const nodeCountBefore = Object.keys(store.getState().canvas!.nodes).length;
    const childId = Object.keys(store.getState().canvas!.nodes)[1];

    store.getState().remove(childId);
    expect(Object.keys(store.getState().canvas!.nodes).length).toBeLessThan(nodeCountBefore);

    expect(store.getState().past.length).toBeGreaterThan(0);

    store.getState().undo();
    expect(Object.keys(store.getState().canvas!.nodes).length).toBe(nodeCountBefore);
    expect(store.getState().canvas!.nodes[childId]).toBeDefined();
  });
});
