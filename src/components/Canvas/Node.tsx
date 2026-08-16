'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {Node as NodeType} from '@/lib/types';
import {NODE_TINTS,STATUS_META,STATUS_ORDER} from '@/lib/types';
import {children} from '@/lib/operations/hierarchy';
import {statusSummary} from '@/lib/operations/status';
import StatusBadge from '../ui/StatusBadge';
import {useCanvasStore} from '@/lib/store';

export default function Node({node,onDrag}:{node:NodeType;onDrag:(e:PointerEvent,id:string)=>void}) {
 const canvas=useCanvasStore(s=>s.canvas)!; const editing=useCanvasStore(s=>s.editingId); const just=useCanvasStore(s=>s.justCreatedId);
 const selectedNodeIds=useCanvasStore(s=>s.selectedNodeIds); const selectNode=useCanvasStore(s=>s.selectNode);
 const update=useCanvasStore(s=>s.update), setEditing=useCanvasStore(s=>s.setEditing), createChild=useCanvasStore(s=>s.createChild), remove=useCanvasStore(s=>s.remove), setNodeTint=useCanvasStore(s=>s.setNodeTint);
 const [draft,setDraft]=useState(node.content); const input=useRef<HTMLTextAreaElement>(null); const kids=children(canvas,node.id); const summary=statusSummary(kids);
 const [paletteOpen,setPaletteOpen]=useState(false);
 const adjustHeight=()=>{const el=input.current;if(!el) return;el.style.height='auto';const h=Math.min(el.scrollHeight,240);el.style.height=h+'px';el.style.overflowY=el.scrollHeight>240?'auto':'hidden';};
 useEffect(()=>{if(editing===node.id){input.current?.focus();adjustHeight();}},[editing,node.id]);
 useEffect(()=>{if(editing===node.id) adjustHeight();},[draft,editing,node.id]);
 useEffect(()=>{
   if(!paletteOpen) return;
   const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') setPaletteOpen(false); };
   window.addEventListener('keydown', onKey);
   return ()=> window.removeEventListener('keydown', onKey);
 },[paletteOpen]);
 const save=()=>{setEditing(null);update(c=>{c.nodes[node.id].content=draft;c.nodes[node.id].updatedAt=Date.now()})};
 const cycle=()=>update(c=>{const n=c.nodes[node.id];n.status=STATUS_ORDER[(STATUS_ORDER.indexOf(n.status)+1)%STATUS_ORDER.length]});
 const editor=editing===node.id ? <textarea ref={input} className="node-editor" placeholder="Type something…" spellCheck={false} value={draft} onChange={e=>{setDraft(e.target.value);}} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();save()} else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setEditing(null)}}} onInput={adjustHeight} /> : <div className={`node-content ${node.content?'':'is-empty'}`} onClick={()=>setEditing(node.id)}>{node.content||'Type something…'}</div>;
 const isSelected=selectedNodeIds.includes(node.id);
 return <div className={`node-card status-${node.status} ${editing===node.id?'is-editing':''} ${just===node.id?'node-enter':''} ${node.tint?'is-tinted':''} ${isSelected?'is-selected':''}`} style={{left:node.position.x,top:node.position.y, ...(node.tint ? {['--tint' as string]: node.tint} as React.CSSProperties : {})} as React.CSSProperties} onPointerDownCapture={e=>{if(e.button===0) selectNode(node.id)}}>
  <div className="node-top"><div className="node-main"><StatusBadge status={node.status} onClick={cycle}/>{kids.length>0&&<button className={`chevron ${node.isCollapsed?'':'open'}`} onClick={()=>update(c=>{c.nodes[node.id].isCollapsed=!c.nodes[node.id].isCollapsed})}>›</button>}{editor}</div>
  <div className="node-actions">
    <button className={`icon-btn palette ${paletteOpen?'is-active':''}`} onClick={e=>{e.stopPropagation(); setPaletteOpen(v=>!v)}} aria-label="Node color" title="Node color">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-2.8 4.1A4 4 0 0 0 6 14a3 3 0 1 0 5.7 1.3A4 4 0 0 0 19 12a3 3 0 0 0-2.2-2.9A3 3 0 0 0 12 3Z"/><circle cx="8.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/></svg>
    </button>
    <button className="icon-btn add" onClick={()=>createChild(node.id)}>＋</button><button className="icon-btn drag-handle" onPointerDown={e=>onDrag(e,node.id)}>⣿</button><button className="icon-btn danger" onClick={()=>{if(!kids.length||confirm('Delete this node and its descendants?'))remove(node.id)}}>♲</button></div></div>
  {paletteOpen&&<>
    <div className="palette-backdrop" onClick={e=>{e.stopPropagation(); setPaletteOpen(false)}} aria-hidden="true" />
    <div className="node-palette" onClick={e=>e.stopPropagation()} role="menu" aria-label="Node color palette">
      {NODE_TINTS.map(t=>(
        <button key={t.id} className={`palette-swatch ${node.tint===t.color?'is-active':''}`} style={{background:t.color}} title={t.label} aria-label={t.label} onClick={()=>{setNodeTint(node.id,t.color); setPaletteOpen(false)}} />
      ))}
      <button className={`palette-swatch palette-clear ${!node.tint?'is-active':''}`} title="Clear" aria-label="Clear color" onClick={()=>{setNodeTint(node.id,null); setPaletteOpen(false)}}>×</button>
    </div>
  </>}
  {node.isCollapsed&&kids.length>0&&<div className="node-meta"><span className="chip">{kids.length} hidden</span>{(['failed','review','mastered'] as const).map(k=>summary[k]?<span key={k} className="chip" style={{color:STATUS_META[k].color,borderColor:`${STATUS_META[k].color}44`,background:`${STATUS_META[k].color}14`}}><b>{summary[k]}{STATUS_META[k].short}</b></span>:null)}</div>}
 </div>;
}
