'use client';
import Button from '../ui/Button';
import { useCanvasStore } from '@/lib/store';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

export default function Toolbar({ onAdd, onAddText, onAddHeading, onCollapse, onExpand }: { onAdd: () => void; onAddText: () => void; onAddHeading: () => void; onCollapse: () => void; onExpand: () => void }) {
  const canvas = useCanvasStore(s => s.canvas);
  const past = useCanvasStore(s => s.past), future = useCanvasStore(s => s.future), undo = useCanvasStore(s => s.undo), redo = useCanvasStore(s => s.redo);
  const canUndo = past.length > 0, canRedo = future.length > 0;

  // Derived collapse/expand state (UI-only — store actions untouched)
  const nodes = canvas?.nodes;
  const parentIds = new Set<string>();
  if (nodes) for (const n of Object.values(nodes)) if (n.parentId) parentIds.add(n.parentId);
  const collapsible = parentIds.size > 0;
  const allCollapsed = collapsible && !!nodes && [...parentIds].every(id => nodes[id].isCollapsed);

  return (
    <header id="toolbar" className="ui-float">
      <div className="brand">
        <div className="brand-logo">✦</div>
        <div>
          <div className="brand-name">Synapse</div>
          <div className="brand-sub">ACTIVE RECALL CANVAS</div>
        </div>
      </div>
      <div className="tb-sep" />
      <Button className="btn-primary" onClick={onAdd}>＋ New topic</Button>
      <Button onClick={onAddText} title="Add a text note" aria-label="Add a text note">Text</Button>
      <Button onClick={onAddHeading} title="Add a heading" aria-label="Add a heading">Heading</Button>
      <Button
        className="tb-icon-btn"
        disabled={!collapsible}
        onClick={allCollapsed ? onExpand : onCollapse}
        title={allCollapsed ? 'Expand all' : 'Collapse all'}
        aria-label={allCollapsed ? 'Expand all' : 'Collapse all'}
      >
        {allCollapsed
          ? <UnfoldMoreIcon sx={{ fontSize: 16 }} aria-hidden="true" />
          : <UnfoldLessIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
      </Button>
      <div className="tb-sep" />
      <Button disabled={!canUndo} onClick={e => { e.stopPropagation(); undo(); }} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)" className={`tb-icon-btn${canUndo ? '' : ' is-disabled'}`}>
        <UndoIcon sx={{ fontSize: 16 }} aria-hidden="true" />
      </Button>
      <Button disabled={!canRedo} onClick={e => { e.stopPropagation(); redo(); }} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)" className={`tb-icon-btn${canRedo ? '' : ' is-disabled'}`}>
        <RedoIcon sx={{ fontSize: 16 }} aria-hidden="true" />
      </Button>
    </header>
  );
}
