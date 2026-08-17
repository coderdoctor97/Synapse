'use client';
import { useEffect } from 'react';
import { useCanvasStore } from '@/lib/store';

export default function useHelpShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '?') return;
      const { editingId, helpOpen, setHelpOpen } = useCanvasStore.getState();
      if (editingId !== null) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      if (helpOpen) {
        setHelpOpen(false);
        return;
      }
      if (document.querySelector('[role="dialog"], .modal-overlay')) return;
      setHelpOpen(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
