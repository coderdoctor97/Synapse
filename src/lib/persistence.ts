import type { CanvasData, HeatmapMode } from './types';
const key=(id:string)=>`synapse:v1:canvas:${id}`;
export function loadCanvas(id:string):CanvasData|null { try { const raw=localStorage.getItem(key(id)); if(!raw)return null; const data=JSON.parse(raw); if(!data||typeof data.nodes!=='object'||!data.viewport) throw Error('Invalid canvas shape'); return {...data,viewport:{x:Number(data.viewport.x)||0,y:Number(data.viewport.y)||0,zoom:Number(data.viewport.zoom)||1}}; } catch { return null; } }
export function saveCanvas(canvas:CanvasData){ try { localStorage.setItem(key(canvas.id),JSON.stringify(canvas)); return true; } catch { return false; } }
const UI_SETTINGS_KEY='synapse:v1:ui-settings';
const HEATMAP_MODES:HeatmapMode[]=['full','mini','hidden'];
export function loadUISettings():{heatmapMode:HeatmapMode} { try { const raw=localStorage.getItem(UI_SETTINGS_KEY); if(!raw)return {heatmapMode:'full'}; const data=JSON.parse(raw); if(!data||typeof data!=='object'||!HEATMAP_MODES.includes(data.heatmapMode)) return {heatmapMode:'full'}; return {heatmapMode:data.heatmapMode as HeatmapMode}; } catch { return {heatmapMode:'full'}; } }
export function saveUISettings(settings:{heatmapMode:HeatmapMode}):void { try { localStorage.setItem(UI_SETTINGS_KEY,JSON.stringify(settings)); } catch { /* ignore quota / privacy-mode errors */ } }
