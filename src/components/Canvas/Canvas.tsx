'use client';
import {useEffect,useRef,useState} from 'react';
import {useCanvasStore} from '@/lib/store';
import {children,visibleOrder} from '@/lib/operations/hierarchy';
import {MAX_ZOOM,MIN_ZOOM,NODE_MIN_HEIGHT,NODE_WIDTH,STATUS_META,type Status} from '@/lib/types';
import Node from './Node';
import Toolbar from './Toolbar';
import SelectionHint from './SelectionHint';
import useStatusShortcuts from '@/hooks/useStatusShortcuts';
import useHistoryShortcuts from '@/hooks/useHistoryShortcuts';
import DataPortability from './DataPortability';
import HeatmapPanel from './HeatmapPanel';
import HelpPanel from './HelpPanel';
import ThemeToggle from './ThemeToggle';
import ThemeManager from './ThemeManager';

export default function Canvas({canvasId}:{canvasId:string}) {
 const canvas=useCanvasStore(s=>s.canvas), init=useCanvasStore(s=>s.init), update=useCanvasStore(s=>s.update), createRoot=useCanvasStore(s=>s.createRoot), saved=useCanvasStore(s=>s.saved), clearSelection=useCanvasStore(s=>s.clearSelection);
 const ref=useRef<HTMLDivElement>(null); const [themesOpen,setThemesOpen]=useState(false); const [drag,setDrag]=useState<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null); const [pan,setPan]=useState<{sx:number;sy:number;ox:number;oy:number}|null>(null);
 useStatusShortcuts();
 useHistoryShortcuts();
 useEffect(()=>{init(canvasId,{x:window.innerWidth,y:window.innerHeight})},[canvasId,init]);
 if(!canvas)return <div id="viewport" ref={ref}/>;
 const order=visibleOrder(canvas);
 const changeZoom=(target:number,mx=(ref.current?.clientWidth||0)/2,my=(ref.current?.clientHeight||0)/2)=>update(c=>{const z=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,target)), old=c.viewport.zoom, wx=(mx-c.viewport.x)/old,wy=(my-c.viewport.y)/old;c.viewport={x:mx-wx*z,y:my-wy*z,zoom:z}});
 const fit=()=>update(c=>{const ns=Object.values(c.nodes);if(!ns.length){c.viewport={x:0,y:0,zoom:1};return}const minX=Math.min(...ns.map(n=>n.position.x)),minY=Math.min(...ns.map(n=>n.position.y)),maxX=Math.max(...ns.map(n=>n.position.x+NODE_WIDTH)),maxY=Math.max(...ns.map(n=>n.position.y+NODE_MIN_HEIGHT)), w=ref.current!.clientWidth,h=ref.current!.clientHeight,z=Math.max(MIN_ZOOM,Math.min((w-110)/(maxX-minX),(h-110)/(maxY-minY),1));c.viewport={zoom:z,x:(w-(maxX-minX)*z)/2-minX*z,y:(h-(maxY-minY)*z)/2-minY*z}});
 return <><div id="viewport" ref={ref} className={pan?'panning':''} onPointerDown={e=>{if((e.target as Element).closest('.node-card'))return;clearSelection();setPan({sx:e.clientX,sy:e.clientY,ox:canvas.viewport.x,oy:canvas.viewport.y})}} onPointerMove={e=>{if(drag){update(c=>c.nodes[drag.id].position={x:drag.ox+(e.clientX-drag.sx)/canvas.viewport.zoom,y:drag.oy+(e.clientY-drag.sy)/canvas.viewport.zoom})}else if(pan)update(c=>{c.viewport.x=pan.ox+e.clientX-pan.sx;c.viewport.y=pan.oy+e.clientY-pan.sy})}} onPointerUp={()=>{setPan(null);setDrag(null)}} onWheel={e=>{e.preventDefault();const r=ref.current!.getBoundingClientRect();changeZoom(canvas.viewport.zoom*Math.exp(-e.deltaY*(e.ctrlKey?.008:.0018)),e.clientX-r.left,e.clientY-r.top)}}><div id="world" style={{transform:`translate(${canvas.viewport.x}px, ${canvas.viewport.y}px) scale(${canvas.viewport.zoom})`}}><svg id="edges">{order.map(id=>{const n=canvas.nodes[id];if(!n.parentId||!order.includes(n.parentId))return null;const p=canvas.nodes[n.parentId],x1=p.position.x+NODE_WIDTH,y1=p.position.y+NODE_MIN_HEIGHT/2,x2=n.position.x,y2=n.position.y+NODE_MIN_HEIGHT/2,m=x1+Math.max((x2-x1)/2,24);return <path key={id} d={`M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`} style={{stroke: n.tint ? n.tint : n.status!=='none' ? STATUS_META[n.status].color : 'var(--edge-line)'}}/>})}</svg><div id="nodes">{order.map(id=><Node key={id} node={canvas.nodes[id]} onDrag={(e,id)=>{e.preventDefault();e.stopPropagation();const n=canvas.nodes[id];setDrag({id,sx:e.clientX,sy:e.clientY,ox:n.position.x,oy:n.position.y})}}/>)}</div></div></div>
 <Toolbar onAdd={()=>createRoot({x:ref.current!.clientWidth,y:ref.current!.clientHeight})} onCollapse={()=>update(c=>Object.values(c.nodes).forEach(n=>{if(children(c,n.id).length)n.isCollapsed=true}))} onExpand={()=>update(c=>Object.values(c.nodes).forEach(n=>n.isCollapsed=false))}/>
 <DataPortability />
 <div id="viewbar" className="ui-float"><button className="zb-btn" onClick={()=>changeZoom(canvas.viewport.zoom/1.2)}>−</button><button className="zb-btn" id="zoom-label" onClick={()=>changeZoom(1)}>{Math.round(canvas.viewport.zoom*100)}%</button><button className="zb-btn" onClick={()=>changeZoom(canvas.viewport.zoom*1.2)}>＋</button><div className="zb-sep"/><button className="zb-btn" onClick={fit}>⊡</button><ThemeToggle /><button className="zb-btn theme-manager-trigger" type="button" aria-label="Open themes" title="Themes" onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();setThemesOpen(true)}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-2.8 4.1A4 4 0 0 0 6 14a3 3 0 1 0 5.7 1.3A4 4 0 0 0 19 12a3 3 0 0 0-2.2-2.9A3 3 0 0 0 12 3Z"/><circle cx="8.5" cy="11" r="1"/><circle cx="15.5" cy="9.5" r="1"/><circle cx="15" cy="15" r="1"/></svg></button><div className="zb-sep"/><div id="save-ind" className={saved?'show':''}><span className="dot"/>Saved</div></div>
 <HeatmapPanel />
 <HelpPanel />
 <SelectionHint />
 <ThemeManager open={themesOpen} onClose={()=>setThemesOpen(false)} />
</>;
}
