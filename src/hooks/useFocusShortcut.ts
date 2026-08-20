'use client';
import { useEffect } from 'react';
import { useCanvasStore } from '@/lib/store';

export default function useFocusShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const { editingId, focusMode, setFocusMode, helpOpen } = useCanvasStore.getState();
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      if (document.querySelector('[role="dialog"], .modal-overlay, .theme-manager-overlay, .help-overlay')) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFocusMode(!focusMode);
        return;
      }
      if (e.key === 'Escape' && focusMode && !helpOpen) {
        e.preventDefault();
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}