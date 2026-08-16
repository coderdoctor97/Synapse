'use client';
import { useEffect } from 'react';
import { useCanvasStore } from '@/lib/store';
import type { Status } from '@/lib/types';

export default function useStatusShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { selectedNodeIds, editingId, setNodeStatus, clearSelection } = useCanvasStore.getState();
      if (editingId !== null) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      if (document.querySelector('[role="dialog"], .modal-overlay')) return;
      if (e.key === 'Escape') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }
      const map: Record<string, Status> = { '1': 'failed', '2': 'review', '3': 'mastered', '0': 'none' };
      const status = map[e.key];
      if (!status) return;
      if (selectedNodeIds.length === 0) return;
      e.preventDefault();
      selectedNodeIds.forEach(id => setNodeStatus(id, status));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
