'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCanvasStore } from '@/lib/store';
import { getFoldersInFolder, getPagesInFolder } from '@/lib/operations/library';
import { readCanvasRaw } from '@/lib/persistence';
import { serializeCanvas } from '@/lib/portability';

function sanitize(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'canvas';
}

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
    </svg>
  );
}

const PAGE_DRAG_TYPE = 'text/synapse-page';

function isPageDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes(PAGE_DRAG_TYPE);
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const index = useCanvasStore(s => s.index);
  const sidebarOpen = useCanvasStore(s => s.sidebarOpen);
  const loadIndex = useCanvasStore(s => s.loadIndex);
  const setSidebarOpen = useCanvasStore(s => s.setSidebarOpen);

  const addFolder = useCanvasStore(s => s.addFolder);
  const addPage = useCanvasStore(s => s.addPage);
  const renameFolder = useCanvasStore(s => s.renameFolder);
  const renamePage = useCanvasStore(s => s.renamePage);
  const deletePage = useCanvasStore(s => s.deletePage);
  const deleteFolder = useCanvasStore(s => s.deleteFolder);
  const toggleFolderPin = useCanvasStore(s => s.toggleFolderPin);
  const togglePagePin = useCanvasStore(s => s.togglePagePin);
  const movePageToFolder = useCanvasStore(s => s.movePageToFolder);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmPage, setConfirmPage] = useState<{ id: string; name: string } | null>(null);
  const [confirmFolder, setConfirmFolder] = useState<{ id: string; name: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverQuick, setDragOverQuick] = useState(false);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);

  // Extract active page id from pathname /canvas/[id]
  const activePageId = useMemo(() => {
    if (!pathname) return null;
    const parts = pathname.split('/');
    if (parts.length >= 3 && parts[1] === 'canvas') return parts[2] || null;
    return null;
  }, [pathname]);

  useEffect(() => {
    loadIndex();
  }, [loadIndex]);

  // Auto-expand folder containing active page
  useEffect(() => {
    if (!index || !activePageId) return;
    const page = index.pages[activePageId];
    if (page && page.folderId) {
      setExpanded(prev => {
        if (prev.has(page.folderId!)) return prev;
        const next = new Set(prev);
        next.add(page.folderId!);
        return next;
      });
    }
  }, [index, activePageId]);

  useEffect(() => {
    if (editingFolderId || editingPageId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingFolderId, editingPageId]);

  if (!index) return null;

  const toggleFolder = (folderId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const startRenameFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingPageId(null);
    setDraft(currentName);
  };
  const startRenamePage = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditingFolderId(null);
    setDraft(currentName);
  };
  const cancelRename = () => {
    setEditingFolderId(null);
    setEditingPageId(null);
    setDraft('');
  };
  const saveFolderRename = () => {
    if (editingFolderId) {
      const trimmed = draft.trim();
      const original = index.folders[editingFolderId]?.name ?? '';
      if (trimmed && trimmed !== original) {
        renameFolder(editingFolderId, trimmed);
      }
    }
    cancelRename();
  };
  const savePageRename = () => {
    if (editingPageId) {
      const trimmed = draft.trim();
      const original = index.pages[editingPageId]?.name ?? '';
      if (trimmed && trimmed !== original) {
        renamePage(editingPageId, trimmed);
      }
    }
    cancelRename();
  };

  const handleDeletePageConfirm = () => {
    if (!confirmPage) return;
    const { id, name } = confirmPage;
    // Backup if canvas has >=1 node
    try {
      const canvas = readCanvasRaw(id);
      if (canvas && Object.keys(canvas.nodes).length >= 1) {
        const json = serializeCanvas(canvas);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitize(name)}-backup-${Date.now()}.synapse.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      // ignore backup errors, still delete
    }
    deletePage(id);
    setConfirmPage(null);
    if (activePageId === id) {
      router.replace('/canvas/default');
    }
  };

  const handleDeleteFolderConfirm = () => {
    if (!confirmFolder) return;
    deleteFolder(confirmFolder.id);
    setConfirmFolder(null);
  };

  const topFolders = getFoldersInFolder(index, null);
  const unorganizedPages = getPagesInFolder(index, null);

  if (!sidebarOpen) {
    return (
      <div className="sidebar sidebar-collapsed">
        <button
          className="sidebar-toggle"
          onClick={e => {
            e.stopPropagation();
            setSidebarOpen(true);
          }}
          onPointerDown={e => e.stopPropagation()}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          ☰
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Library</span>
        <button
          className="sidebar-toggle"
          onClick={e => {
            e.stopPropagation();
            setSidebarOpen(false);
          }}
          onPointerDown={e => e.stopPropagation()}
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          «
        </button>
      </div>

      <div className="sidebar-actions">
        <button
          className="sidebar-action-btn"
          onClick={e => {
            e.stopPropagation();
            addFolder('New folder');
          }}
          onPointerDown={e => e.stopPropagation()}
          title="New folder"
          aria-label="New folder"
        >
          ＋ Folder
        </button>
        <button
          className="sidebar-action-btn primary"
          onClick={e => {
            e.stopPropagation();
            const id = addPage('Untitled', null);
            if (id) router.push('/canvas/' + id);
          }}
          onPointerDown={e => e.stopPropagation()}
          title="Quick Note"
          aria-label="Quick Note"
        >
          ＋ Quick Note
        </button>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section">
          <div className="sidebar-section-header">Folders</div>
          {topFolders.length === 0 ? (
            <div className="sidebar-empty">No folders yet</div>
          ) : (
            topFolders.map(folder => {
              const isExpanded = expanded.has(folder.id);
              const pages = getPagesInFolder(index, folder.id);
              const isEditing = editingFolderId === folder.id;
              return (
                <div key={folder.id} className="sidebar-folder">
                  {isEditing ? (
                    <div className="sidebar-folder-row is-editing" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                      <span className={`sidebar-chevron ${isExpanded ? 'open' : ''}`}>›</span>
                      <span className="sidebar-folder-icon">📁</span>
                      <input
                        ref={inputRef}
                        className="sidebar-inline-input"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={saveFolderRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveFolderRename();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                        aria-label="Folder name"
                      />
                    </div>
                  ) : (
                    <div
                      className={`sidebar-folder-row${dragOverFolderId === folder.id ? ' is-drag-over' : ''}`}
                      onDragOver={e => {
                        if (!isPageDrag(e.dataTransfer)) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverFolderId(folder.id);
                      }}
                      onDragLeave={e => {
                        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                        setDragOverFolderId(prev => (prev === folder.id ? null : prev));
                      }}
                      onDrop={e => {
                        if (!isPageDrag(e.dataTransfer)) return;
                        e.preventDefault();
                        const id = e.dataTransfer.getData(PAGE_DRAG_TYPE);
                        setDragOverFolderId(null);
                        setDraggedPageId(null);
                        if (id) movePageToFolder(id, folder.id);
                      }}
                    >
                      <button
                        className="sidebar-folder-main"
                        onClick={e => {
                          e.stopPropagation();
                          toggleFolder(folder.id);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        aria-expanded={isExpanded}
                        aria-label={`Folder ${folder.name}`}
                      >
                        <span className={`sidebar-chevron ${isExpanded ? 'open' : ''}`}>›</span>
                        <span className="sidebar-folder-icon">📁</span>
                        <span className="sidebar-folder-name">{folder.name}</span>
                        <span className="sidebar-count">{pages.length}</span>
                      </button>
                      <div className="sidebar-folder-actions">
                      <button
                        className="sidebar-icon-btn"
                        onClick={e => {
                          e.stopPropagation();
                          const pid = addPage('Untitled', folder.id);
                          if (pid) {
                            setExpanded(prev => {
                              const next = new Set(prev);
                              next.add(folder.id);
                              return next;
                            });
                          }
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        title="Add page"
                        aria-label="Add page"
                      >
                        ＋
                      </button>
                      <button
                        className={`sidebar-icon-btn${folder.pinned ? ' pinned' : ''}`}
                        onClick={e => {
                          e.stopPropagation();
                          toggleFolderPin(folder.id);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        title={folder.pinned ? 'Unpin folder' : 'Pin folder'}
                        aria-label="Pin folder"
                      >
                        <PinIcon filled={!!folder.pinned} />
                      </button>
                      <button
                        className="sidebar-icon-btn"
                        onClick={e => {
                          e.stopPropagation();
                          startRenameFolder(folder.id, folder.name);
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        title="Rename folder"
                        aria-label="Rename folder"
                      >
                        ✎
                      </button>
                      <button
                        className="sidebar-icon-btn danger"
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmFolder({ id: folder.id, name: folder.name });
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        title="Delete folder"
                        aria-label="Delete folder"
                      >
                        🗑
                      </button>
                      </div>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="sidebar-pages">
                      {pages.length === 0 ? (
                        <div className="sidebar-empty">No pages.</div>
                      ) : (
                        pages.map(page => {
                          const isPageEditing = editingPageId === page.id;
                          if (isPageEditing) {
                            return (
                              <div key={page.id} className="sidebar-page is-editing" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                                <span className="sidebar-page-icon">📄</span>
                                <input
                                  ref={inputRef}
                                  className="sidebar-inline-input"
                                  value={draft}
                                  onChange={e => setDraft(e.target.value)}
                                  onBlur={savePageRename}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      savePageRename();
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelRename();
                                    }
                                  }}
                                  onClick={e => e.stopPropagation()}
                                  aria-label="Page name"
                                />
                              </div>
                            );
                          }
                          return (
                            <div
                              key={page.id}
                              draggable
                              onDragStart={e => {
                                e.stopPropagation();
                                e.dataTransfer.setData(PAGE_DRAG_TYPE, page.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggedPageId(page.id);
                              }}
                              onDragEnd={() => {
                                setDraggedPageId(null);
                                setDragOverFolderId(null);
                                setDragOverQuick(false);
                              }}
                              className={`sidebar-page-row ${activePageId === page.id ? 'is-active' : ''}${draggedPageId === page.id ? ' is-dragging' : ''}`}
                            >
                              <button
                                className={`sidebar-page ${activePageId === page.id ? 'is-active' : ''}`}
                                onClick={e => {
                                  e.stopPropagation();
                                  router.push('/canvas/' + page.id);
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                title={page.name}
                              >
                                <span className="sidebar-page-icon">📄</span>
                                <span className="sidebar-page-name">{page.name}</span>
                              </button>
                              <button
                                className={`sidebar-icon-btn${page.pinned ? ' pinned' : ''}`}
                                onClick={e => {
                                  e.stopPropagation();
                                  togglePagePin(page.id);
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                title={page.pinned ? 'Unpin page' : 'Pin page'}
                                aria-label="Pin page"
                              >
                                <PinIcon filled={!!page.pinned} />
                              </button>
                              <button
                                className="sidebar-icon-btn"
                                onClick={e => {
                                  e.stopPropagation();
                                  startRenamePage(page.id, page.name);
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                title="Rename page"
                                aria-label="Rename page"
                              >
                                ✎
                              </button>
                              {page.id !== 'default' && (
                                <button
                                  className="sidebar-icon-btn danger"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setConfirmPage({ id: page.id, name: page.name });
                                  }}
                                  onPointerDown={e => e.stopPropagation()}
                                  title="Delete page"
                                  aria-label="Delete page"
                                >
                                  🗑
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="sidebar-section">
          <div
            className={`sidebar-section-header sidebar-drop-quick${dragOverQuick ? ' is-drag-over' : ''}`}
            onDragOver={e => {
              if (!isPageDrag(e.dataTransfer)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverQuick(true);
            }}
            onDragLeave={e => {
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setDragOverQuick(false);
            }}
            onDrop={e => {
              if (!isPageDrag(e.dataTransfer)) return;
              e.preventDefault();
              const id = e.dataTransfer.getData(PAGE_DRAG_TYPE);
              setDragOverQuick(false);
              setDraggedPageId(null);
              if (id) movePageToFolder(id, null);
            }}
          >
            Quick Notes
          </div>
          {unorganizedPages.length === 0 ? (
            <div className="sidebar-empty subtle">No pages</div>
          ) : (
            <div className="sidebar-pages">
              {unorganizedPages.map(page => {
                const isPageEditing = editingPageId === page.id;
                if (isPageEditing) {
                  return (
                    <div key={page.id} className="sidebar-page is-editing" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                      <span className="sidebar-page-icon">📄</span>
                      <input
                        ref={inputRef}
                        className="sidebar-inline-input"
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={savePageRename}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            savePageRename();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                        aria-label="Page name"
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={e => {
                      e.stopPropagation();
                      e.dataTransfer.setData(PAGE_DRAG_TYPE, page.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedPageId(page.id);
                    }}
                    onDragEnd={() => {
                      setDraggedPageId(null);
                      setDragOverFolderId(null);
                      setDragOverQuick(false);
                    }}
                    className={`sidebar-page-row ${activePageId === page.id ? 'is-active' : ''}${draggedPageId === page.id ? ' is-dragging' : ''}`}
                  >
                    <button
                      className={`sidebar-page ${activePageId === page.id ? 'is-active' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        router.push('/canvas/' + page.id);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      title={page.name}
                    >
                      <span className="sidebar-page-icon">📄</span>
                      <span className="sidebar-page-name">{page.name}</span>
                    </button>
                    <button
                      className={`sidebar-icon-btn${page.pinned ? ' pinned' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        togglePagePin(page.id);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      title={page.pinned ? 'Unpin page' : 'Pin page'}
                      aria-label="Pin page"
                    >
                      <PinIcon filled={!!page.pinned} />
                    </button>
                    <button
                      className="sidebar-icon-btn"
                      onClick={e => {
                        e.stopPropagation();
                        startRenamePage(page.id, page.name);
                      }}
                      onPointerDown={e => e.stopPropagation()}
                      title="Rename page"
                      aria-label="Rename page"
                    >
                      ✎
                    </button>
                    {page.id !== 'default' && (
                      <button
                        className="sidebar-icon-btn danger"
                        onClick={e => {
                          e.stopPropagation();
                          setConfirmPage({ id: page.id, name: page.name });
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        title="Delete page"
                        aria-label="Delete page"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmPage && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-delete-page-title"
          onClick={e => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setConfirmPage(null);
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="modal-card" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div className="modal-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              </svg>
            </div>
            <h3 id="sidebar-delete-page-title">Delete page?</h3>
            <p>
              <strong>{confirmPage.name}</strong> will be permanently deleted. A backup will be downloaded first.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setConfirmPage(null); }} onPointerDown={e => e.stopPropagation()}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={e => { e.stopPropagation(); handleDeletePageConfirm(); }} onPointerDown={e => e.stopPropagation()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFolder && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sidebar-delete-folder-title"
          onClick={e => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setConfirmFolder(null);
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="modal-card" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </div>
            <h3 id="sidebar-delete-folder-title">Delete folder?</h3>
            <p>
              <strong>{confirmFolder.name}</strong> will be deleted. Its pages and subfolders will be moved up, not deleted.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={e => { e.stopPropagation(); setConfirmFolder(null); }} onPointerDown={e => e.stopPropagation()}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={e => { e.stopPropagation(); handleDeleteFolderConfirm(); }} onPointerDown={e => e.stopPropagation()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
