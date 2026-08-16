import type { CanvasData } from './types';
const key=(id:string)=>`synapse:v1:canvas:${id}`;
export function loadCanvas(id:string):CanvasData|null { try { const raw=localStorage.getItem(key(id)); if(!raw)return null; const data=JSON.parse(raw); if(!data||typeof data.nodes!=='object'||!data.viewport) throw Error('Invalid canvas shape'); return {...data,viewport:{x:Number(data.viewport.x)||0,y:Number(data.viewport.y)||0,zoom:Number(data.viewport.zoom)||1}}; } catch { return null; } }
export function saveCanvas(canvas:CanvasData){ try { localStorage.setItem(key(canvas.id),JSON.stringify(canvas)); return true; } catch { return false; } }
