'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {Node as NodeType, NodeSize} from '@/lib/types';
import {NODE_MIN_HEIGHT,NODE_TINTS,NODE_WIDTH,STATUS_META,STATUS_ORDER} from '@/lib/types';
import {children} from '@/lib/operations/hierarchy';
import {statusSummary} from '@/lib/operations/status';
import StatusBadge from '../ui/StatusBadge';
import {useCanvasStore} from '@/lib/store';
import {PaletteIcon} from '@phosphor-icons/react';

type FormatSpan={text:string;bold?:boolean;italic?:boolean;underline?:boolean};
function parseFormatting(text:string):FormatSpan[]{
 const spans:FormatSpan[]=[];
 // underline outermost
 const uRe=/__([\s\S]*?)__/g;let last=0,m:RegExpExecArray|null;
 while((m=uRe.exec(text))){if(m.index>last)spans.push({text:text.slice(last,m.index)});spans.push({text:m[1],underline:true});last=m.index+m[0].length;}
 if(last<text.length)spans.push({text:text.slice(last)});
 if(spans.length===0)spans.push({text});
 // bold middle
 const bolded:FormatSpan[]=[];
 for(const span of spans){const bRe=/\*\*([\s\S]*?)\*\*/g;let bl=0,bm:RegExpExecArray|null,any=false;while((bm=bRe.exec(span.text))){any=true;if(bm.index>bl)bolded.push({...span,text:span.text.slice(bl,bm.index)});bolded.push({...span,text:bm[1],bold:true});bl=bm.index+bm[0].length;}if(bl<span.text.length)bolded.push({...span,text:span.text.slice(bl)});if(!any)bolded.push(span);}
 // italic innermost
 const final:FormatSpan[]=[];
 for(const span of bolded){const iRe=/\*([\s\S]*?)\*/g;let il=0,im:RegExpExecArray|null,any=false;while((im=iRe.exec(span.text))){any=true;if(im.index>il)final.push({...span,text:span.text.slice(il,im.index)});final.push({...span,text:im[1],italic:true});il=im.index+im[0].length;}if(il<span.text.length)final.push({...span,text:span.text.slice(il)});if(!any)final.push(span);}
 return final;
}

export default function Node({node,onDrag}:{node:NodeType;onDrag:(e:PointerEvent,id:string)=>void}) {
 const canvas=useCanvasStore(s=>s.canvas)!; const editing=useCanvasStore(s=>s.editingId); const just=useCanvasStore(s=>s.justCreatedId);
 const selectedNodeIds=useCanvasStore(s=>s.selectedNodeIds); const selectForInteraction=useCanvasStore(s=>s.selectForInteraction);
 const update=useCanvasStore(s=>s.update), setEditing=useCanvasStore(s=>s.setEditing), createChild=useCanvasStore(s=>s.createChild), remove=useCanvasStore(s=>s.remove), setNodeTint=useCanvasStore(s=>s.setNodeTint);
 const [draft,setDraft]=useState(node.content); const input=useRef<HTMLTextAreaElement>(null); const kids=children(canvas,node.id); const summary=statusSummary(kids);
 const [paletteOpen,setPaletteOpen]=useState(false);
 const [preview,setPreview]=useState<NodeSize|null>(null); const size=preview??node.size; const gripStart=useRef<{x:number;y:number;w:number;h:number}|null>(null);
 const adjustHeight=()=>{const el=input.current;if(!el) return;if(size){el.style.height='auto';el.style.overflowY='auto';return;}el.style.height='auto';const h=Math.min(el.scrollHeight,240);el.style.height=h+'px';el.style.overflowY=el.scrollHeight>240?'auto':'hidden';};
 useEffect(()=>{if(editing===node.id){input.current?.focus();adjustHeight();}},[editing,node.id]);
 useEffect(()=>{if(editing===node.id) adjustHeight();},[draft,editing,node.id,size]);
 useEffect(()=>{
   if(!paletteOpen) return;
   const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') setPaletteOpen(false); };
   window.addEventListener('keydown', onKey);
   return ()=> window.removeEventListener('keydown', onKey);
 },[paletteOpen]);
 const save=()=>{setEditing(null);update(c=>{c.nodes[node.id].content=draft;c.nodes[node.id].updatedAt=Date.now()})};
 const cycle=()=>update(c=>{const n=c.nodes[node.id];n.status=STATUS_ORDER[(STATUS_ORDER.indexOf(n.status)+1)%STATUS_ORDER.length]});
 const onGripDown=(e:PointerEvent<HTMLButtonElement>)=>{e.stopPropagation();e.preventDefault();const card=(e.currentTarget as HTMLElement).closest('.node-card') as HTMLElement|null;gripStart.current={x:e.clientX,y:e.clientY,w:node.size?.width??NODE_WIDTH,h:node.size?.height??(card?.offsetHeight||NODE_MIN_HEIGHT)};(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)};
 const onGripMove=(e:PointerEvent<HTMLButtonElement>)=>{const g=gripStart.current;if(!g)return;setPreview({width:Math.max(160,g.w+(e.clientX-g.x)),height:Math.max(NODE_MIN_HEIGHT,g.h+(e.clientY-g.y))})};
 const onGripUp=(e:PointerEvent<HTMLButtonElement>)=>{const g=gripStart.current;if(!g)return;gripStart.current=null;const w=Math.max(160,g.w+(e.clientX-g.x)),h=Math.max(NODE_MIN_HEIGHT,g.h+(e.clientY-g.y));setPreview(null);if(w!==g.w||h!==g.h)update(c=>{c.nodes[node.id].size={width:w,height:h};c.nodes[node.id].updatedAt=Date.now()})};
 const onGripDblClick=(e:React.MouseEvent)=>{e.stopPropagation();e.preventDefault();if(node.size)update(c=>{c.nodes[node.id].size=null;c.nodes[node.id].updatedAt=Date.now()})};
 const wrapSelection=(before:string,after:string)=>{const el=input.current;if(!el)return;const s=el.selectionStart??0,e=el.selectionEnd??0,sel=el.value.slice(s,e);setDraft(el.value.slice(0,s)+before+sel+after+el.value.slice(e));requestAnimationFrame(()=>{el.focus();el.setSelectionRange(s+before.length,e+before.length)})};
 const renderFormatted=(text:string)=>{const spans=parseFormatting(text);return spans.map((s,i)=>{let n:React.ReactNode=s.text;if(s.italic)n=<em key={i}>{n}</em>;if(s.bold)n=<strong key={i}>{n}</strong>;if(s.underline)n=<u key={i}>{n}</u>;return n;})};
 const editor=editing===node.id ? <textarea ref={input} className="node-editor" placeholder="Type something…" spellCheck={false} value={draft} onChange={e=>{setDraft(e.target.value);}} onBlur={save} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&(e.key==='b'||e.key==='i'||e.key==='u')){e.preventDefault();e.stopPropagation();if(e.key==='b')wrapSelection('**','**');else if(e.key==='i')wrapSelection('*','*');else wrapSelection('__','__');return;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();save()} else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setEditing(null)}}} onInput={adjustHeight} /> : <div className={`node-content ${node.content?'':'is-empty'}`} onClick={()=>setEditing(node.id)}>{node.content?renderFormatted(node.content):'Type something…'}</div>;
const isSelected=selectedNodeIds.includes(node.id);
const cardStyle:React.CSSProperties={left:node.position.x,top:node.position.y, ...(node.tint ? {['--tint' as string]: node.tint} as React.CSSProperties : {})};
if(size){cardStyle.width=size.width;cardStyle.height=size.height;}
return <div className={`node-card status-${node.status} ${editing===node.id?'is-editing':''} ${just===node.id?'node-enter':''} ${node.tint?'is-tinted':''} ${isSelected?'is-selected':''} ${size?'is-sized':''}`} style={cardStyle} onPointerDownCapture={e=>{if(e.button===0) selectForInteraction(node.id)}}>
  <div className="node-top"><div className="node-main"><StatusBadge status={node.status} onClick={cycle}/>{kids.length>0&&<button className={`chevron ${node.isCollapsed?'':'open'}`} onClick={()=>update(c=>{c.nodes[node.id].isCollapsed=!c.nodes[node.id].isCollapsed})}>›</button>}{editor}</div>
  <div className="node-actions">
    <button className={`icon-btn palette tint ${paletteOpen?'is-active':''}`} onClick={e=>{e.stopPropagation(); setPaletteOpen(v=>!v)}} aria-label="Node color" title="Node color">
      <PaletteIcon size={14} weight="fill" color={node.tint ?? 'currentColor'} />
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
  <button type="button" className="resize-grip" aria-label="Resize node" title="Drag to resize · double-click to reset" onPointerDown={onGripDown} onPointerMove={onGripMove} onPointerUp={onGripUp} onDoubleClick={onGripDblClick}/>
 </div>;
}
