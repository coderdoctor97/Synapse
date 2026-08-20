import type { CanvasData, Node } from '../types';
export const roots=(c:CanvasData)=>Object.values(c.nodes).filter(n=>n.parentId===null).sort((a,b)=>a.createdAt-b.createdAt);
export const children=(c:CanvasData,id:string)=>Object.values(c.nodes).filter(n=>n.parentId===id).sort((a,b)=>a.createdAt-b.createdAt);
export function descendants(c:CanvasData,id:string){const out:string[]=[];const walk=(x:string)=>children(c,x).forEach(n=>{out.push(n.id);walk(n.id)});walk(id);return out;}
export function visibleOrder(c:CanvasData){const out:string[]=[];const walk=(n:Node)=>{out.push(n.id);if(!n.isCollapsed)children(c,n.id).forEach(walk)};roots(c).forEach(walk);return out;}
export function getAncestorIds(c:CanvasData,id:string){const out:string[]=[];let cur=c.nodes[id]?.parentId;while(cur){out.push(cur);cur=c.nodes[cur]?.parentId;}return out;}
export function visibleSubtree(c:CanvasData,id:string){const out:string[]=[];const walk=(x:string)=>{children(c,x).forEach(n=>{out.push(n.id);if(!n.isCollapsed)walk(n.id)})};walk(id);return out;}
