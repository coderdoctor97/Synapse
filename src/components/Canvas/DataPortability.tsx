'use client';
import { useRef, useState } from 'react';
import { useCanvasStore } from '@/lib/store';
import type { Annotation } from '@/lib/types';
import { parseImportedCanvas, serializeCanvas } from '@/lib/portability';
import { visibleOrder } from '@/lib/operations/hierarchy';
import { exportCanvasPng } from '@/lib/exportPng';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageIcon from '@mui/icons-material/Image';

function sanitize(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return s || 'canvas';
}

export default function DataPortability() {
  const canvas = useCanvasStore(s => s.canvas);
  const replaceCanvasContents = useCanvasStore(s => s.replaceCanvasContents);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; nodes: Record<string, any>; viewport: { x: number; y: number; zoom: number }; annotations?: Annotation[] } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Import failed');

  const onExportPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await exportCanvasPng();
      setError(null);
    } catch {
      setErrorTitle('Export failed');
      setError('PNG export failed. Please try again.');
    }
  };

  const onExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;
    const json = serializeCanvas(canvas);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitize(canvas.name)}.synapse.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const onImportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError('Not valid JSON.');
      return;
    }
    const result = parseImportedCanvas(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPending(result);
    setConfirmOpen(true);
    setError(null);
  };

  const onConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pending || !canvas) return;
    // Backup current canvas if it has >=1 node
    const nodeCount = Object.keys(canvas.nodes).length;
    if (nodeCount >= 1) {
      try {
        const backupJson = serializeCanvas(canvas);
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitize(canvas.name)}-backup-${Date.now()}.synapse.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        // ignore backup errors, still proceed to replace
      }
    }
    replaceCanvasContents(pending.name, pending.nodes, pending.viewport, pending.annotations);
    setConfirmOpen(false);
    setPending(null);
  };

  const onCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmOpen(false);
    setPending(null);
  };

  const closeError = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
  };

  return (
    <>
      <div
        className="portability-bar ui-float"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <button
          className="portability-btn"
          onClick={onExport}
          title="Export canvas"
          aria-label="Export canvas"
        >
          <FileUploadIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          Export
        </button>
        <button
          className="portability-btn"
          onClick={onExportPng}
          disabled={!canvas || visibleOrder(canvas).length === 0}
          title="Export PNG (transparent)"
          aria-label="Export PNG (transparent)"
        >
          <ImageIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          PNG
        </button>
        <button
          className="portability-btn"
          onClick={onImportClick}
          title="Import canvas"
          aria-label="Import canvas"
        >
          <DownloadIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="portability-file"
          onChange={onFileChange}
          onClick={e => e.stopPropagation()}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {confirmOpen && pending && (
        <div
          className="modal-overlay portability-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portability-confirm-title"
          onClick={e => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setConfirmOpen(false);
              setPending(null);
            }
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="modal-card portability-modal-card" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div className="modal-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <DownloadIcon aria-hidden="true" />
            </div>
            <h3 id="portability-confirm-title">Import canvas?</h3>
            <p>
              <strong>{pending.name}</strong> — {Object.keys(pending.nodes).length} node{Object.keys(pending.nodes).length === 1 ? '' : 's'}.<br />
              This will <strong>replace the current canvas</strong>. A backup of the current canvas will be downloaded first.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onCancel} onPointerDown={e => e.stopPropagation()}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onConfirm} onPointerDown={e => e.stopPropagation()}>
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className="modal-overlay portability-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portability-error-title"
          onClick={e => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setError(null);
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="modal-card portability-modal-card" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <div className="modal-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h3 id="portability-error-title">{errorTitle}</h3>
            <p>{error}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={closeError} onPointerDown={e => e.stopPropagation()}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
