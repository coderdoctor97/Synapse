import type { CanvasIndex, Folder, PageMeta } from '../types';

function cloneIndex(index: CanvasIndex): CanvasIndex {
  return {
    schemaVersion: 1,
    folders: { ...index.folders },
    pages: { ...index.pages },
  };
}

function sortByCreatedAt<T extends { createdAt: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.createdAt - b.createdAt);
}

// Folders

export function createFolder(
  index: CanvasIndex,
  name: string,
  parentId: string | null = null
): { index: CanvasIndex; folder: Folder } {
  if (parentId !== null && !index.folders[parentId]) {
    // Guard: unknown parent -> return unchanged, create no folder
    // To keep return shape, create a dummy? But spec says return index unchanged for unknown ids.
    // For create with invalid parent, we return index unchanged and a placeholder folder that won't be inserted.
    // Simpler: treat as if we didn't create.
    const dummy: Folder = { id: '', name, parentId, createdAt: 0, updatedAt: 0 };
    return { index, folder: dummy };
  }
  const now = Date.now();
  const id = crypto.randomUUID();
  const folder: Folder = { id, name, parentId, createdAt: now, updatedAt: now };
  const next = cloneIndex(index);
  next.folders[id] = folder;
  return { index: next, folder };
}

export function renameFolder(index: CanvasIndex, folderId: string, name: string): CanvasIndex {
  const existing = index.folders[folderId];
  if (!existing) return index;
  const next = cloneIndex(index);
  next.folders[folderId] = { ...existing, name, updatedAt: Date.now() };
  return next;
}

export function deleteFolder(index: CanvasIndex, folderId: string): CanvasIndex {
  const target = index.folders[folderId];
  if (!target) return index;
  const parentId = target.parentId;
  const next = cloneIndex(index);
  delete next.folders[folderId];
  // Reparent subfolders
  for (const [id, folder] of Object.entries(next.folders)) {
    if (folder.parentId === folderId) {
      next.folders[id] = { ...folder, parentId, updatedAt: Date.now() };
    }
  }
  // Reparent pages
  for (const [id, page] of Object.entries(next.pages)) {
    if (page.folderId === folderId) {
      next.pages[id] = { ...page, folderId: parentId, updatedAt: Date.now() };
    }
  }
  return next;
}

export function moveFolder(
  index: CanvasIndex,
  folderId: string,
  newParentId: string | null
): CanvasIndex {
  const folder = index.folders[folderId];
  if (!folder) return index;
  if (newParentId !== null) {
    if (!index.folders[newParentId]) return index;
    if (newParentId === folderId) return index;
    // Prevent moving into own descendant (cycle)
    let cur: string | null = newParentId;
    while (cur !== null) {
      if (cur === folderId) return index;
      const parentFolder: Folder | undefined = index.folders[cur];
      cur = parentFolder ? parentFolder.parentId : null;
    }
  }
  // No change if same
  if (folder.parentId === newParentId) return index;
  const next = cloneIndex(index);
  next.folders[folderId] = { ...folder, parentId: newParentId, updatedAt: Date.now() };
  return next;
}

// Pages

export function createPageMeta(
  index: CanvasIndex,
  name: string,
  folderId: string | null = null
): { index: CanvasIndex; page: PageMeta } {
  if (folderId !== null && !index.folders[folderId]) {
    const dummy: PageMeta = { id: '', name, folderId, createdAt: 0, updatedAt: 0 };
    return { index, page: dummy };
  }
  const now = Date.now();
  let id: string;
  // Ensure not colliding with existing page ids (especially 'default')
  do {
    id = crypto.randomUUID();
  } while (index.pages[id]);
  const page: PageMeta = { id, name, folderId, createdAt: now, updatedAt: now };
  const next = cloneIndex(index);
  next.pages[id] = page;
  return { index: next, page };
}

export function renamePage(index: CanvasIndex, pageId: string, name: string): CanvasIndex {
  const existing = index.pages[pageId];
  if (!existing) return index;
  const next = cloneIndex(index);
  next.pages[pageId] = { ...existing, name, updatedAt: Date.now() };
  return next;
}

export function deletePageMeta(index: CanvasIndex, pageId: string): CanvasIndex {
  if (!index.pages[pageId]) return index;
  const next = cloneIndex(index);
  delete next.pages[pageId];
  return next;
}

export function movePage(
  index: CanvasIndex,
  pageId: string,
  folderId: string | null
): CanvasIndex {
  const page = index.pages[pageId];
  if (!page) return index;
  if (folderId !== null && !index.folders[folderId]) return index;
  if (page.folderId === folderId) return index;
  const next = cloneIndex(index);
  next.pages[pageId] = { ...page, folderId, updatedAt: Date.now() };
  return next;
}

// Queries

export function getFoldersSorted(index: CanvasIndex): Folder[] {
  return sortByCreatedAt(Object.values(index.folders));
}

export function getPagesSorted(index: CanvasIndex): PageMeta[] {
  return sortByCreatedAt(Object.values(index.pages));
}

export function getFoldersInFolder(index: CanvasIndex, parentId: string | null): Folder[] {
  return sortByCreatedAt(Object.values(index.folders).filter(f => f.parentId === parentId));
}

export function getPagesInFolder(index: CanvasIndex, folderId: string | null): PageMeta[] {
  return sortByCreatedAt(Object.values(index.pages).filter(p => p.folderId === folderId));
}

export function getFolder(index: CanvasIndex, id: string): Folder | undefined {
  return index.folders[id];
}

export function getPage(index: CanvasIndex, id: string): PageMeta | undefined {
  return index.pages[id];
}
