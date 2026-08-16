'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {Node as NodeType} from '@/lib/types';
import {STATUS_META,STATUS_ORDER} from '@/lib/types';
import {children} from '@/lib/operations/hierarchy';
import {statusSummary} from '@/lib/operations/status';
import StatusBadge from '../ui/StatusBadge';
import {useCanvasStore} from '@/lib/store';

export default function Node({node,onDrag}:{node:NodeType;onDrag:(e:PointerEvent,id:string)=>void}) {
 const canvas=useCanvasStore(s=>s.canvas)!; const editing=useCanvasStore(s=>s.editingId); const just=useCanvasStore(s=>s.justCreatedId);
 const update=useCanvasStore(s=>s.update), setEditing=useCanvasStore(s=>s.setEditing), createChild=useCanvasStore(s=>s.createChild), remove=useCanvasStore(s=>s.remove);
 const [draft,setDraft]=useState(node.content); const input=useRef<HTMLTextAreaElement>(null); const kids=children(canvas,node.id); const summary=statusSummary(kids);
 useEffect(()=>{if(editing===node.id) input.current?.focus()},[editing,node.id]);
 const save=()=>{setEditing(null);update(c=>{c.nodes[node.id].content=draft;c.nodes[node.id].updatedAt=Date.now()})};
 const cycle=()=>update(c=>{const n=c.nodes[node.id];n.status=STATUS_ORDER[(STATUS_ORDER.indexOf(n.status)+1)%STATUS_ORDER.length]});
 const editor=editing===node.id ? <textarea ref={input} className="node-editor" placeholder="Type something…" spellCheck={false} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save()} else if(e.key==='Escape')setEditing(null)}}/> : <div className={`node-content ${node.content?'':'is-empty'}`} onClick={()=>setEditing(node.id)}>{node.content||'Type something…'}</div>;
 return <div className={`node-card status-${node.status} ${editing===node.id?'is-editing':''} ${just===node.id?'node-enter':''}`} style={{left:node.position.x,top:node.position.y}}>
  <div className="node-top"><div className="node-main"><StatusBadge status={node.status} onClick={cycle}/>{kids.length>0&&<button className={`chevron ${node.isCollapsed?'':'open'}`} onClick={()=>update(c=>{c.nodes[node.id].isCollapsed=!c.nodes[node.id].isCollapsed})}>›</button>}{editor}</div>
  <div className="node-actions"><button className="icon-btn add" onClick={()=>createChild(node.id)}>＋</button><button className="icon-btn drag-handle" onPointerDown={e=>onDrag(e,node.id)}>⣿</button><button className="icon-btn danger" onClick={()=>{if(!kids.length||confirm('Delete this node and its descendants?'))remove(node.id)}}>♲</button></div></div>
  {node.isCollapsed&&kids.length>0&&<div className="node-meta"><span className="chip">{kids.length} hidden</span>{(['failed','review','mastered'] as const).map(k=>summary[k]?<span key={k} className="chip" style={{color:STATUS_META[k].color,borderColor:`${STATUS_META[k].color}44`,background:`${STATUS_META[k].color}14`}}><b>{summary[k]}{STATUS_META[k].short}</b></span>:null)}</div>}
 </div>;
}
