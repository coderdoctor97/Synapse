'use client';
import {useEffect,useRef,useState} from 'react';
import {useCanvasStore} from '@/lib/store';
import {children,visibleOrder} from '@/lib/operations/hierarchy';
import {MAX_ZOOM,MIN_ZOOM,NODE_MIN_HEIGHT,NODE_WIDTH,STATUS_META,type Position,type Status} from '@/lib/types';
import Node from './Node';
import Annotation from './Annotation';
import Toolbar from './Toolbar';
import SelectionHint from './SelectionHint';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import useStatusShortcuts from '@/hooks/useStatusShortcuts';
import useHistoryShortcuts from '@/hooks/useHistoryShortcuts';
import useHelpShortcut from '@/hooks/useHelpShortcut';
import DataPortability from './DataPortability';
import KnowledgeDialPanel from './KnowledgeDialPanel';
import HelpPanel from './HelpPanel';
import ThemeToggle from './ThemeToggle';
import ThemeManager from './ThemeManager';

export default function Canvas({canvasId}:{canvasId:string}) {
  const canvas=useCanvasStore(s=>s.canvas), init=useCanvasStore(s=>s.init), update=useCanvasStore(s=>s.update), createRoot=useCanvasStore(s=>s.createRoot), saved=useCanvasStore(s=>s.saved), clearSelection=useCanvasStore(s=>s.clearSelection), editingId=useCanvasStore(s=>s.editingId), recordHistory=useCanvasStore(s=>s.recordHistory), moveNodes=useCanvasStore(s=>s.moveNodes), moveNodesLive=useCanvasStore(s=>s.moveNodesLive), selectNodes=useCanvasStore(s=>s.selectNodes), createAnnotation=useCanvasStore(s=>s.createAnnotation), focusMode=useCanvasStore(s=>s.focusMode), setFocusMode=useCanvasStore(s=>s.setFocusMode);
  const ref=useRef<HTMLDivElement>(null); const [themesOpen,setThemesOpen]=useState(false); const [drag,setDrag]=useState<{id:string;sx:number;sy:number;orig:Record<string,Position>}|null>(null); const [pan,setPan]=useState<{sx:number;sy:number;ox:number;oy:number}|null>(null); const [lasso,setLasso]=useState<{sx:number;sy:number;cx:number;cy:number}|null>(null);
  useStatusShortcuts();
  useHistoryShortcuts();
  useHelpShortcut();
  useEffect(()=>{init(canvasId,{x:window.innerWidth,y:window.innerHeight})},[canvasId,init]);
  // Dotted grid follows the canvas pan/zoom (background lives on the viewport element)
  useEffect(()=>{
    const el=ref.current;
    if(!canvas||!el)return;
    el.style.backgroundSize=`${26*canvas.viewport.zoom}px ${26*canvas.viewport.zoom}px`;
    el.style.backgroundPosition=`${canvas.viewport.x}px ${canvas.viewport.y}px`;
  },[canvas,canvas?.viewport]);
  if(!canvas)return <div id="viewport" ref={ref}/>;
  const order=visibleOrder(canvas);
  const changeZoom=(target:number,mx=(ref.current?.clientWidth||0)/2,my=(ref.current?.clientHeight||0)/2)=>update(c=>{const z=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,target)), old=c.viewport.zoom, wx=(mx-c.viewport.x)/old,wy=(my-c.viewport.y)/old;c.viewport={x:mx-wx*z,y:my-wy*z,zoom:z}});
  const fit=()=>update(c=>{const ns=Object.values(c.nodes);if(!ns.length){c.viewport={x:0,y:0,zoom:1};return}const minX=Math.min(...ns.map(n=>n.position.x)),minY=Math.min(...ns.map(n=>n.position.y)),maxX=Math.max(...ns.map(n=>n.position.x+NODE_WIDTH)),maxY=Math.max(...ns.map(n=>n.position.y+NODE_MIN_HEIGHT)), w=ref.current!.clientWidth,h=ref.current!.clientHeight,z=Math.max(MIN_ZOOM,Math.min((w-110)/(maxX-minX),(h-110)/(maxY-minY),1));c.viewport={zoom:z,x:(w-(maxX-minX)*z)/2-minX*z,y:(h-(maxY-minY)*z)/2-minY*z}});
  return <><div id="viewport" ref={ref} className={pan?'panning':lasso?'lassoing':''} onPointerDown={e=>{if((e.target as Element).closest('.node-card, .annotation'))return;if(e.shiftKey){if(editingId)return;setLasso({sx:e.clientX,sy:e.clientY,cx:e.clientX,cy:e.clientY});(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);return;}clearSelection();setPan({sx:e.clientX,sy:e.clientY,ox:canvas.viewport.x,oy:canvas.viewport.y})}} onPointerMove={e=>{if(lasso){setLasso(l=>({...l!,cx:e.clientX,cy:e.clientY}));return;}if(drag){const dx=(e.clientX-drag.sx)/canvas.viewport.zoom,dy=(e.clientY-drag.sy)/canvas.viewport.zoom;if(Object.keys(drag.orig).length>1){moveNodesLive(Object.entries(drag.orig).map(([gid,p])=>({id:gid,position:{x:p.x+dx,y:p.y+dy}})))}else{const p=drag.orig[drag.id];update(c=>{const nn=c.nodes[drag.id];if(nn)nn.position={x:p.x+dx,y:p.y+dy}})}}else if(pan)update(c=>{c.viewport.x=pan.ox+e.clientX-pan.sx;c.viewport.y=pan.oy+e.clientY-pan.sy})}} onPointerUp={e=>{if(lasso){const x1=Math.min(lasso.sx,lasso.cx),y1=Math.min(lasso.sy,lasso.cy),x2=Math.max(lasso.sx,lasso.cx),y2=Math.max(lasso.sy,lasso.cy);setLasso(null);if(x2-x1>=5||y2-y1>=5){const picked:string[]=[];const cards=ref.current?Array.from(ref.current.querySelectorAll<HTMLElement>('#nodes > .node-card')):[];cards.forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.left<x2&&r.right>x1&&r.top<y2&&r.bottom>y1)picked.push(order[i])});selectNodes(picked)}}if(drag){const keys=Object.keys(drag.orig);if(keys.length>1){const dx=(e.clientX-drag.sx)/canvas.viewport.zoom,dy=(e.clientY-drag.sy)/canvas.viewport.zoom;moveNodes(keys.map(gid=>({id:gid,position:{x:drag.orig[gid].x+dx,y:drag.orig[gid].y+dy}})))}}setPan(null);setDrag(null)}} onWheel={e=>{e.preventDefault();const r=ref.current!.getBoundingClientRect();changeZoom(canvas.viewport.zoom*Math.exp(-e.deltaY*(e.ctrlKey?.008:.0018)),e.clientX-r.left,e.clientY-r.top)}}><div id="world" data-export-root style={{transform:`translate(${canvas.viewport.x}px,${canvas.viewport.y}px) scale(${canvas.viewport.zoom})`}}><svg id="edges">{order.map(id=>{const n=canvas.nodes[id];if(!n.parentId)return null;const p=canvas.nodes[n.parentId];if(!p)return null;const x1=p.position.x+NODE_WIDTH,y1=p.position.y+NODE_MIN_HEIGHT/2,x2=n.position.x,y2=n.position.y+NODE_MIN_HEIGHT/2,m=x1+Math.max((x2-x1)/2,24);return <path key={id} d={`M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`} fill="none" strokeLinecap="round" style={{stroke: n.tint ? n.tint : n.status!=='none' ? STATUS_META[n.status].color : 'var(--edge-line)', strokeWidth:2}}/>})}</svg><div id="nodes">{order.map(id=><Node key={id} node={canvas.nodes[id]} onDrag={(e,id)=>{e.preventDefault();e.stopPropagation();const n=canvas.nodes[id];if(!n)return;const sel=useCanvasStore.getState().selectedNodeIds;const group=sel.includes(id)&&sel.length>1?sel:[id];const orig:Record<string,Position>={};group.forEach(g=>{const nn=canvas.nodes[g];if(nn)orig[g]={x:nn.position.x,y:nn.position.y}});setDrag({id,sx:e.clientX,sy:e.clientY,orig});if(group.length>1)recordHistory()}}/>)}</div><div id="annotations">{(canvas.annotations??[]).map(a=><Annotation key={a.id} ann={a}/>)}</div></div>{lasso&&<div className="lasso-marquee" style={{left:Math.min(lasso.sx,lasso.cx),top:Math.min(lasso.sy,lasso.cy),width:Math.abs(lasso.cx-lasso.sx),height:Math.abs(lasso.cy-lasso.sy)}}/>}</div>
 {order.length===0&&<div id="empty-state"><div className="empty-card" role="button" tabIndex={0} onClick={event=>{event.stopPropagation();createRoot({x:ref.current!.clientWidth,y:ref.current!.clientHeight})}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();createRoot({x:ref.current!.clientWidth,y:ref.current!.clientHeight})}}}><h2>CREATE MINDMAP</h2><p>a vision for your visual memory</p><span className="empty-hint">Press ? for more.</span></div></div>}
 <div className="tb-cluster">
  <Toolbar onAdd={()=>createRoot({x:ref.current!.clientWidth,y:ref.current!.clientHeight})} onAddText={()=>createAnnotation('text',{x:ref.current!.clientWidth,y:ref.current!.clientHeight})} onAddHeading={()=>createAnnotation('heading',{x:ref.current!.clientWidth,y:ref.current!.clientHeight})} onCollapse={()=>update(c=>Object.values(c.nodes).forEach(n=>{if(children(c,n.id).length)n.isCollapsed=true}))} onExpand={()=>update(c=>Object.values(c.nodes).forEach(n=>n.isCollapsed=false))}/>
  <DataPortability />
 </div>
 <div id="viewbar" className="ui-float"><button className="zb-btn" onClick={()=>changeZoom(canvas.viewport.zoom/1.2)}>−</button><button className="zb-btn" id="zoom-label" onClick={()=>changeZoom(1)}>{Math.round(canvas.viewport.zoom*100)}%</button><button className="zb-btn" onClick={()=>changeZoom(canvas.viewport.zoom*1.2)}>＋</button><div className="zb-sep"/><button className="zb-btn" onClick={fit} aria-label="Fit to screen" title="Fit to screen"><FitScreenIcon sx={{fontSize:16}} aria-hidden="true"/></button><ThemeToggle /><button className="zb-btn theme-manager-trigger" type="button" aria-label="Open themes" title="Themes" onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();setThemesOpen(true)}}><AutoFixHighIcon sx={{fontSize:16}} aria-hidden="true"/></button><div className="zb-sep"/><div id="save-ind" className={saved?'show':''}><span className="dot"/>Saved</div></div>
 <KnowledgeDialPanel />
 <HelpPanel />
 <SelectionHint />
 <ThemeManager open={themesOpen} onClose={()=>setThemesOpen(false)} />
</>;
}