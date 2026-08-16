'use client';
import { useCanvasStore } from '@/lib/store';

export default function SelectionHint() {
  const selectedNodeIds = useCanvasStore(s => s.selectedNodeIds);
  const editingId = useCanvasStore(s => s.editingId);
  if (selectedNodeIds.length === 0 || editingId !== null) return null;
  return (
    <div className="selection-hint" aria-live="polite" aria-atomic="true">
      <span className="selection-hint-item"><b>1</b> Failed</span>
      <span className="selection-hint-sep">·</span>
      <span className="selection-hint-item"><b>2</b> Review</span>
      <span className="selection-hint-sep">·</span>
      <span className="selection-hint-item"><b>3</b> Mastered</span>
      <span className="selection-hint-sep">·</span>
      <span className="selection-hint-item"><b>0</b> Clear</span>
      <span className="selection-hint-sep">·</span>
      <span className="selection-hint-item"><b>Esc</b> Deselect</span>
    </div>
  );
}
