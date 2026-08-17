'use client';

import {useEffect,useRef} from 'react';
import {useCanvasStore} from '@/lib/store';

export default function HelpPanel() {
 const open=useCanvasStore(s=>s.helpOpen), setHelpOpen=useCanvasStore(s=>s.setHelpOpen);
 const triggerRef=useRef<HTMLButtonElement>(null), closeRef=useRef<HTMLButtonElement>(null);

 useEffect(()=>{
  if(!open)return;
  closeRef.current?.focus();
  const handleKeyDown=(event:KeyboardEvent)=>{
   if(event.key==='Escape')setHelpOpen(false);
  };
  window.addEventListener('keydown',handleKeyDown);
  return()=>{
   window.removeEventListener('keydown',handleKeyDown);
   triggerRef.current?.focus();
  };
 },[open]);

 return <>
  <button ref={triggerRef} type="button" className="faq-button" aria-label="Help and shortcuts" onClick={event=>{event.stopPropagation();setHelpOpen(true)}} onPointerDown={event=>event.stopPropagation()}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="16" font-weight="800" font-family="Sora, Inter, system-ui, sans-serif" fill="white">?</text></svg>
    <span className="tooltip">Help</span>
  </button>
  {open&&<div className="help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={event=>{event.stopPropagation();if(event.target===event.currentTarget)setHelpOpen(false)}} onPointerDown={event=>event.stopPropagation()}>
   <div className="help-modal" onClick={event=>event.stopPropagation()} onPointerDown={event=>event.stopPropagation()}>
    <div className="help-header">
     <h2 id="help-title">How to use Synapse</h2>
     <button ref={closeRef} type="button" className="help-close" aria-label="Close help" onClick={event=>{event.stopPropagation();setHelpOpen(false)}} onPointerDown={event=>event.stopPropagation()}>×</button>
    </div>
    <div className="help-content">
     <section className="help-section">
      <h3>Edit nodes</h3>
      <ul>
       <li>Click a node&apos;s text to edit it.</li>
       <li><code>Enter</code> saves · <code>Shift + Enter</code> adds a new line · <code>Esc</code> cancels · clicking away saves.</li>
       <li><code>+</code> on a node adds a child. The trash icon deletes (branches ask for confirmation).</li>
       <li>Drag the <code>⣿</code> handle to reposition a node. This never changes the hierarchy.</li>
       <li>Click a node to select it. Click the empty canvas to deselect.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Organize branches</h3>
      <ul>
       <li>Click the chevron <code>›</code> to collapse or expand one branch only.</li>
       <li>The toolbar button with inward chevrons collapses everything; it becomes outward chevrons to expand everything.</li>
       <li>Collapsed branches show summary chips for their hidden children.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Tag your recall</h3>
      <ul>
       <li>Click the status dot to cycle: none → Failed (red) → Review (amber) → Mastered (green).</li>
       <li>Red = couldn&apos;t recall · Amber = partially remembered · Green = solid.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Shortcuts</h3>
      <ul>
       <li>Select a node, then press 1, 2, or 3 to tag it Failed, Review, or Mastered. Press 0 to clear the tag.</li>
       <li>While editing a node, <code>Ctrl+B</code> / <code>Ctrl+I</code> / <code>Ctrl+U</code> (<code>⌘</code> on Mac) make the selected text bold, italic, or underlined.</li>
       <li>Press Esc to deselect.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Undo &amp; Redo</h3>
      <ul>
       <li>Ctrl+Z (Cmd+Z on Mac) undoes a change. Ctrl+Y or Ctrl+Shift+Z redoes it.</li>
       <li>Undo applies to your nodes, not to zooming, panning, or page changes.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Node colors</h3>
      <ul>
       <li>The palette button on a node adds a decorative color to its card and its connecting line.</li>
       <li>Node colors are for organization only. Red / amber / green still mean Failed / Review / Mastered.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Read the heatmap</h3>
      <ul>
       <li>The heatmap panel shows your page-wide stats. Minimize it to a slim bar or hide it with its – and × buttons.</li>
       <li>Collapsed parents show chips counting failed / review / mastered direct children.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Move around</h3>
      <ul>
       <li>Drag the empty canvas to pan. Scroll to zoom.</li>
       <li>View bar: <code>−</code> zoom out · <code>%</code> reset · <code>+</code> zoom in · frame icon fits everything on screen.</li>
       <li>The sun / moon button switches light and dark theme. Your choice is remembered.</li>
       <li>&quot;New topic&quot; creates a root node at the center of your view.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>The recall workflow</h3>
      <ol>
       <li>Build your topic tree.</li>
       <li>Collapse everything.</li>
       <li>Recite from memory.</li>
       <li>Expand to verify.</li>
       <li>Tag what you missed.</li>
       <li>Next session, hunt the reds and ambers first.</li>
      </ol>
     </section>
     <section className="help-section">
      <h3>Themes</h3>
      <ul>
       <li>The palette button opens Themes. Apply light or dark, or create your own.</li>
       <li>Custom themes are JSON files of color variables. Export a theme to share it, or import one to add it.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Import &amp; Export</h3>
      <ul>
       <li>Export downloads your canvas as a .synapse.json file you can keep or share.</li>
       <li>Import loads a .synapse.json file. It replaces the current canvas, so a backup is downloaded first.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Library</h3>
      <ul>
       <li>The sidebar lists your folders and pages. Click a page to open it.</li>
       <li>Use New folder and Quick Note to organize your canvas into pages.</li>
       <li>Quick Note creates a scratch page. Drag it onto a folder to file it, or use + on a folder to add a page directly.</li>
       <li>Drag a page onto Quick Notes to move it back out.</li>
       <li>Pin folders or pages to keep them at the top.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Pages &amp; Folders</h3>
      <ul>
       <li>Rename or delete pages and folders from the sidebar.</li>
       <li>Deleting a page downloads a backup first. Deleting a folder moves its pages up; it never deletes them.</li>
      </ul>
     </section>
     <section className="help-section">
      <h3>Your data</h3>
      <ul>
       <li>Everything auto-saves to this browser. Local-first: no account, no cloud.</li>
       <li>Clearing browser data erases your canvases. Export regularly once export is available.</li>
      </ul>
     </section>
    </div>
   </div>
  </div>}
 </>;
}
