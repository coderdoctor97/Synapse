export type Status = 'none' | 'failed' | 'review' | 'mastered';
export type Position = { x:number; y:number };
export type Node = { id:string; content:string; parentId:string|null; position:Position; status:Status; isCollapsed:boolean; createdAt:number; updatedAt:number };
export type CanvasData = { id:string; name:string; nodes:Record<string,Node>; viewport:Position & {zoom:number}; createdAt:number; updatedAt:number };
export const STATUS_ORDER:Status[]=['none','failed','review','mastered'];
export const STATUS_META:Record<Status,{label:string;color:string;short:string}>={none:{label:'Untagged',color:'#94a3b8',short:''},failed:{label:'Failed',color:'#ef4444',short:'F'},review:{label:'Needs review',color:'#f59e0b',short:'R'},mastered:{label:'Mastered',color:'#10b981',short:'M'}};
export const NODE_WIDTH=280, NODE_MIN_HEIGHT=60, HORIZONTAL_INDENT=320, VERTICAL_GAP=30, MIN_ZOOM=.25, MAX_ZOOM=2.5;
export type HeatmapMode = 'full' | 'mini' | 'hidden';
