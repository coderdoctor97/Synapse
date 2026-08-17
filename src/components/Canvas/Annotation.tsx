'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {Annotation as AnnotationType} from '@/lib/types';
import {useCanvasStore} from '@/lib/store';

export default function Annotation({ann}:{ann:AnnotationType}) {
 const canvas=useCanvasStore(s=>s.canvas)!;
 const updateAnnotation=useCanvasStore(s=>s.updateAnnotation), deleteAnnotation=useCanvasStore(s=>s.deleteAnnotation), moveAnnotation=useCanvasStore(s=>s.moveAnnotation), just=useCanvasStore(s=>s.justCreatedId);
 const [draft,setDraft]=useState(ann.content);
 const [editing,setEditing]=useState(false);
 const [hover,setHover]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [dragOff,setDragOff]=useState<{x:number;y:number}|null>(null);
 const dragStart=useRef<{x:number;y:number;ox:number;oy:number}|null>(null);
 const input=useRef<HTMLTextAreaElement>(null);
 const isNew=just===ann.id;
 const zoom=canvas.viewport.zoom;

 useEffect(()=>{if(isNew)setEditing(true)},[isNew,ann.id]);
 useEffect(()=>{if(editing)input.current?.focus()},[editing]);
 const adjust=()=>{const el=input.current;if(!el)return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,300)+'px';};
 useEffect(()=>{if(editing)adjust()},[editing,draft]);

 const save=()=>{updateAnnotation(ann.id,draft);setEditing(false)};
 const cancel=()=>{setDraft(ann.content);setEditing(false)};

 const onDown=(e:PointerEvent<HTMLDivElement>)=>{
  const t=e.target as Element;
  if(t.closest('textarea')||t.closest('button'))return;
  e.stopPropagation();
  dragStart.current={x:e.clientX,y:e.clientY,ox:ann.position.x,oy:ann.position.y};
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
 };
 const onMove=(e:PointerEvent<HTMLDivElement>)=>{
  const ds=dragStart.current;if(!ds)return;
  const dx=(e.clientX-ds.x)/zoom,dy=(e.clientY-ds.y)/zoom;
  if(!dragging&&Math.hypot(e.clientX-ds.x,e.clientY-ds.y)>4)setDragging(true);
  if(dragging)setDragOff({x:dx,y:dy});
 };
 const onUp=(e:PointerEvent<HTMLDivElement>)=>{
  const ds=dragStart.current;if(!ds)return;
  dragStart.current=null;
  if(dragging){
   const dx=(e.clientX-ds.x)/zoom,dy=(e.clientY-ds.y)/zoom;
   moveAnnotation(ann.id,{x:ds.ox+dx,y:ds.oy+dy});
  } else {
   setEditing(true);
  }
  setDragging(false);setDragOff(null);
 };

 return <div className={`annotation ann-${ann.kind}${hover?' is-hover':''}${editing?' is-editing':''}`} style={{left:ann.position.x+(dragOff?.x??0),top:ann.position.y+(dragOff?.y??0)}} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
  {hover&&<button type="button" className="ann-delete" aria-label="Delete note" title="Delete note" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();deleteAnnotation(ann.id)}}>×</button>}
  {editing
   ? <textarea ref={input} className="ann-editor" placeholder="Type something…" spellCheck={false} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();save()}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel()}}} onInput={adjust}/>
   : <div className={`ann-content${ann.content?'':' is-empty'}`} onClick={()=>setEditing(true)}>{ann.content||'Type something…'}</div>}
 </div>;
}
