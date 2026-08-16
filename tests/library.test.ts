import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CanvasIndex } from '../src/lib/types';
import {
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
  createPageMeta,
  renamePage,
  deletePageMeta,
  movePage,
  getFoldersSorted,
  getPagesSorted,
  getFoldersInFolder,
  getPagesInFolder,
  getFolder,
  getPage,
} from '../src/lib/operations/library';

function emptyIndex(): CanvasIndex {
  return { schemaVersion: 1, folders: {}, pages: {} };
}

describe('library operations', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('createFolder returns new index and does not mutate original', () => {
    const idx = emptyIndex();
    const { index: next, folder } = createFolder(idx, 'Medicine', null);
    expect(next).not.toBe(idx);
    expect(idx.folders[folder.id]).toBeUndefined();
    expect(next.folders[folder.id]).toBeDefined();
    expect(folder.name).toBe('Medicine');
    expect(folder.parentId).toBeNull();
  });

  it('renameFolder updates name and updatedAt', async () => {
    let idx = emptyIndex();
    const { index: idx1, folder } = createFolder(idx, 'Medicine');
    idx = idx1;
    const before = folder.updatedAt;
    await new Promise(r => setTimeout(r, 2));
    const next = renameFolder(idx, folder.id, 'Med Updated');
    expect(next.folders[folder.id].name).toBe('Med Updated');
    expect(next.folders[folder.id].updatedAt).toBeGreaterThanOrEqual(before);
    // original unchanged
    expect(idx.folders[folder.id].name).toBe('Medicine');
  });

  it('deleteFolder reparents subfolders and pages upward and never deletes pages', () => {
    let idx = emptyIndex();
    const { index: i1, folder: parent } = createFolder(idx, 'Parent');
    idx = i1;
    const { index: i2, folder: child } = createFolder(idx, 'Child', parent.id);
    idx = i2;
    const { index: i3, folder: grandchild } = createFolder(idx, 'Grandchild', child.id);
    idx = i3;
    const { index: i4, page: p1 } = createPageMeta(idx, 'Page1', child.id);
    idx = i4;
    const { index: i5, page: p2 } = createPageMeta(idx, 'Page2', parent.id);
    idx = i5;

    const next = deleteFolder(idx, child.id);
    // child removed
    expect(next.folders[child.id]).toBeUndefined();
    // parent still exists
    expect(next.folders[parent.id]).toBeDefined();
    // grandchild reparented to parent (deleted folder's parent)
    expect(next.folders[grandchild.id].parentId).toBe(parent.id);
    // p1 reparented to parent
    expect(next.pages[p1.id].folderId).toBe(parent.id);
    // p2 unchanged
    expect(next.pages[p2.id].folderId).toBe(parent.id);
    // pages still exist, never deleted
    expect(Object.keys(next.pages).length).toBe(2);
    // original index unchanged
    expect(idx.folders[child.id]).toBeDefined();
  });

  it('deleteFolder at top-level reparents to root (null)', () => {
    let idx = emptyIndex();
    const { index: i1, folder: top } = createFolder(idx, 'Top', null);
    idx = i1;
    const { index: i2, folder: sub } = createFolder(idx, 'Sub', top.id);
    idx = i2;
    const { index: i3, page: p } = createPageMeta(idx, 'Page', top.id);
    idx = i3;
    const next = deleteFolder(idx, top.id);
    expect(next.folders[top.id]).toBeUndefined();
    expect(next.folders[sub.id].parentId).toBeNull();
    expect(next.pages[p.id].folderId).toBeNull();
  });

  it('moveFolder changes parent and guards unknown ids and cycles', () => {
    let idx = emptyIndex();
    const { index: i1, folder: a } = createFolder(idx, 'A');
    idx = i1;
    const { index: i2, folder: b } = createFolder(idx, 'B');
    idx = i2;
    const { index: i3, folder: c } = createFolder(idx, 'C', a.id);
    idx = i3;

    // move C to B
    let moved = moveFolder(idx, c.id, b.id);
    expect(moved.folders[c.id].parentId).toBe(b.id);
    // guard: moving into descendant should return unchanged
    idx = moved;
    const attemptCycle = moveFolder(idx, b.id, c.id);
    expect(attemptCycle).toBe(idx);
    // guard: unknown folder
    const unknown = moveFolder(idx, 'nope', null);
    expect(unknown).toBe(idx);
    // guard: unknown parent
    const unknownParent = moveFolder(idx, a.id, 'nope');
    expect(unknownParent).toBe(idx);
    // guard: moving to same parent returns unchanged
    const same = moveFolder(idx, a.id, null);
    // a is top-level, so moving to null is same
    expect(same).toBe(idx);
  });

  it('createPageMeta generates unique id and does not collide with default', () => {
    let idx = emptyIndex();
    // add a default page manually
    idx.pages['default'] = { id: 'default', name: 'Default', folderId: null, createdAt: 1, updatedAt: 1 };
    const { index: next, page } = createPageMeta(idx, 'New Page');
    expect(page.id).not.toBe('default');
    expect(page.id).not.toBe('');
    expect(next.pages[page.id]).toBeDefined();
    expect(next.pages['default']).toBeDefined();
    // unique
    const { page: page2 } = createPageMeta(next, 'Another');
    expect(page2.id).not.toBe(page.id);
    expect(page2.id).not.toBe('default');
  });

  it('create/rename/delete/move page metadata', async () => {
    let idx = emptyIndex();
    const { index: i1, folder: f } = createFolder(idx, 'Folder');
    idx = i1;
    const { index: i2, page } = createPageMeta(idx, 'Page', f.id);
    idx = i2;
    expect(idx.pages[page.id].folderId).toBe(f.id);

    // rename
    await new Promise(r => setTimeout(r, 2));
    const renamed = renamePage(idx, page.id, 'Renamed');
    expect(renamed.pages[page.id].name).toBe('Renamed');
    expect(renamed.pages[page.id].updatedAt).toBeGreaterThan(page.updatedAt);

    // move to root
    const moved = movePage(renamed, page.id, null);
    expect(moved.pages[page.id].folderId).toBeNull();

    // move to folder again
    const moved2 = movePage(moved, page.id, f.id);
    expect(moved2.pages[page.id].folderId).toBe(f.id);

    // delete
    const deleted = deletePageMeta(moved2, page.id);
    expect(deleted.pages[page.id]).toBeUndefined();
    expect(moved2.pages[page.id]).toBeDefined(); // original unchanged

    // guard unknown page
    expect(deletePageMeta(deleted, 'unknown')).toBe(deleted);
    expect(renamePage(deleted, 'unknown', 'x')).toBe(deleted);
    expect(movePage(deleted, 'unknown', null)).toBe(deleted);
  });

  it('movePage guards unknown folder', () => {
    let idx = emptyIndex();
    const { index: i1, page } = createPageMeta(idx, 'Page', null);
    idx = i1;
    const moved = movePage(idx, page.id, 'no-folder');
    expect(moved).toBe(idx);
  });

  it('getPagesInFolder / getFoldersInFolder return only expected members sorted by createdAt', async () => {
    let idx = emptyIndex();
    const { index: i1, folder: f1 } = createFolder(idx, 'F1');
    idx = i1;
    await new Promise(r => setTimeout(r, 3));
    const { index: i2, folder: f2 } = createFolder(idx, 'F2', f1.id);
    idx = i2;
    await new Promise(r => setTimeout(r, 3));
    const { index: i3, folder: f3 } = createFolder(idx, 'F3', null);
    idx = i3;

    // f1 and f3 are top-level, f2 inside f1
    expect(getFoldersInFolder(idx, null).map(f => f.id)).toEqual([f1.id, f3.id]); // sorted by createdAt
    expect(getFoldersInFolder(idx, f1.id).map(f => f.id)).toEqual([f2.id]);
    expect(getFoldersInFolder(idx, f2.id)).toEqual([]);

    const { index: i4, page: p1 } = createPageMeta(idx, 'P1', null);
    idx = i4;
    await new Promise(r => setTimeout(r, 3));
    const { index: i5, page: p2 } = createPageMeta(idx, 'P2', f1.id);
    idx = i5;
    await new Promise(r => setTimeout(r, 3));
    const { index: i6, page: p3 } = createPageMeta(idx, 'P3', f1.id);
    idx = i6;

    const unorganized = getPagesInFolder(idx, null);
    expect(unorganized.map(p => p.id)).toEqual([p1.id]);

    const inF1 = getPagesInFolder(idx, f1.id);
    expect(inF1.map(p => p.id)).toEqual([p2.id, p3.id]);

    // sorted checks for getFoldersSorted / getPagesSorted
    const allFolders = getFoldersSorted(idx);
    expect(allFolders.map(f => f.id)).toEqual([f1.id, f2.id, f3.id]);
    const allPages = getPagesSorted(idx);
    // p1 created before p2 before p3
    expect(allPages.map(p => p.id)).toEqual([p1.id, p2.id, p3.id]);
  });

  it('unknown ids return index unchanged and never throw', () => {
    const idx = emptyIndex();
    expect(renameFolder(idx, 'unknown', 'x')).toBe(idx);
    expect(deleteFolder(idx, 'unknown')).toBe(idx);
    expect(moveFolder(idx, 'unknown', null)).toBe(idx);
    expect(moveFolder(idx, 'unknown', 'also-unknown')).toBe(idx);
    expect(renamePage(idx, 'unknown', 'x')).toBe(idx);
    expect(deletePageMeta(idx, 'unknown')).toBe(idx);
    expect(movePage(idx, 'unknown', null)).toBe(idx);
    expect(() => getFolder(idx, 'unknown')).not.toThrow();
    expect(() => getPage(idx, 'unknown')).not.toThrow();
    expect(getFolder(idx, 'unknown')).toBeUndefined();
    expect(getPage(idx, 'unknown')).toBeUndefined();

    // create with unknown parent should not mutate
    const { index: nextFolderIdx } = createFolder(idx, 'Test', 'bad-parent');
    expect(nextFolderIdx).toBe(idx);
    expect(Object.keys(nextFolderIdx.folders).length).toBe(0);

    const { index: nextPageIdx } = createPageMeta(idx, 'Test', 'bad-folder');
    expect(nextPageIdx).toBe(idx);
    expect(Object.keys(nextPageIdx.pages).length).toBe(0);
  });

  it('operations are pure and immutable', () => {
    let idx = emptyIndex();
    const { index: i1, folder: f } = createFolder(idx, 'A');
    idx = i1;
    const original = JSON.parse(JSON.stringify(idx));
    const renamed = renameFolder(idx, f.id, 'B');
    expect(idx).toEqual(original);
    expect(renamed.folders[f.id].name).toBe('B');
    expect(idx.folders[f.id].name).toBe('A');

    const original2 = JSON.parse(JSON.stringify(renamed));
    const { index: i2 } = createPageMeta(renamed, 'Page');
    expect(renamed).toEqual(original2);
    expect(i2).not.toEqual(renamed);
  });
});
