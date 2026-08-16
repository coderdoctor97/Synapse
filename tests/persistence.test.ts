import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CanvasData } from '../src/lib/types';

// Simple in-memory localStorage mock for Node
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  length = 0;
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

describe('persistence migration', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    // Mock global localStorage
    (globalThis as any).localStorage = storage;
    vi.useRealTimers();
    storage.clear();
  });

  it('loadIndex creates migrated index from existing default canvas and is idempotent', async () => {
    // Dynamically import after mocking localStorage so module picks up mock
    // Need to reset modules to get fresh import that uses mocked localStorage
    vi.resetModules();
    const persistence = await import('../src/lib/persistence');

    // No index present, no default canvas -> empty index
    let idx = persistence.loadIndex();
    expect(idx.folders).toEqual({});
    expect(idx.pages).toEqual({});
    expect(idx.schemaVersion).toBe(1);
    // Should have persisted empty index
    expect(storage.getItem('synapse:v1:index')).not.toBeNull();

    // Clear and setup: existing default canvas, no index
    storage.clear();
    const now = Date.now();
    const canvas: CanvasData = {
      id: 'default',
      name: 'My Canvas Title',
      nodes: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: now - 1000,
      updatedAt: now - 500,
    };
    storage.setItem('synapse:v1:canvas:default', JSON.stringify({ ...canvas, schemaVersion: 1 }));

    vi.resetModules();
    const persistence2 = await import('../src/lib/persistence');
    const idx2 = persistence2.loadIndex();
    expect(idx2.pages['default']).toBeDefined();
    expect(idx2.pages['default'].id).toBe('default');
    expect(idx2.pages['default'].name).toBe('My Canvas Title');
    expect(idx2.pages['default'].folderId).toBeNull();
    expect(idx2.pages['default'].createdAt).toBe(canvas.createdAt);
    expect(idx2.pages['default'].updatedAt).toBe(canvas.updatedAt);
    expect(idx2.folders).toEqual({});

    // Second call should not duplicate
    const idx3 = persistence2.loadIndex();
    expect(Object.keys(idx3.pages).length).toBe(1);
    expect(idx3.pages['default']).toEqual(idx2.pages['default']);
    // Ensure persisted
    const stored = JSON.parse(storage.getItem('synapse:v1:index')!);
    expect(stored.pages['default']).toBeDefined();
    expect(Object.keys(stored.pages).length).toBe(1);
  });

  it('loadIndex uses fallback name My Canvas when canvas name missing', async () => {
    storage.clear();
    const canvas: any = {
      id: 'default',
      name: '',
      nodes: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.setItem('synapse:v1:canvas:default', JSON.stringify(canvas));
    vi.resetModules();
    const persistence = await import('../src/lib/persistence');
    const idx = persistence.loadIndex();
    expect(idx.pages['default'].name).toBe('My Canvas');
  });

  it('loadIndex handles corrupt index and migrates', async () => {
    storage.clear();
    storage.setItem('synapse:v1:index', 'not json');
    const canvas: CanvasData = {
      id: 'default',
      name: 'Existing',
      nodes: {},
      viewport: { x: 0, y: 0, zoom: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    storage.setItem('synapse:v1:canvas:default', JSON.stringify({ ...canvas, schemaVersion: 1 }));

    vi.resetModules();
    const persistence = await import('../src/lib/persistence');
    const idx = persistence.loadIndex();
    // Should have recovered and contain default page
    expect(idx.pages['default']).toBeDefined();
    expect(idx.pages['default'].name).toBe('Existing');
  });

  it('loadIndex with no default canvas returns empty index', async () => {
    storage.clear();
    vi.resetModules();
    const persistence = await import('../src/lib/persistence');
    const idx = persistence.loadIndex();
    expect(idx.pages).toEqual({});
    expect(idx.folders).toEqual({});
  });

  it('loadIndex returns valid existing index without migration', async () => {
    storage.clear();
    const existing = {
      schemaVersion: 1,
      folders: { f1: { id: 'f1', name: 'Folder', parentId: null, createdAt: 1, updatedAt: 1 } },
      pages: { p1: { id: 'p1', name: 'Page', folderId: 'f1', createdAt: 1, updatedAt: 1 } },
    };
    storage.setItem('synapse:v1:index', JSON.stringify(existing));
    vi.resetModules();
    const persistence = await import('../src/lib/persistence');
    const idx = persistence.loadIndex();
    expect(idx.folders['f1']).toBeDefined();
    expect(idx.pages['p1']).toBeDefined();
    expect(Object.keys(idx.pages).length).toBe(1);
  });

  it('saveIndex and loadIndex round-trip', async () => {
    storage.clear();
    vi.resetModules();
    const persistence = await import('../src/lib/persistence');
    let idx = persistence.loadIndex();
    // Add a folder and page via direct manipulation then save
    idx.folders['f1'] = { id: 'f1', name: 'Test', parentId: null, createdAt: 1, updatedAt: 1 };
    idx.pages['p1'] = { id: 'p1', name: 'Page', folderId: 'f1', createdAt: 1, updatedAt: 1 };
    persistence.saveIndex(idx);
    const loaded = persistence.loadIndex();
    expect(loaded.folders['f1']).toEqual(idx.folders['f1']);
    expect(loaded.pages['p1']).toEqual(idx.pages['p1']);
  });
});
