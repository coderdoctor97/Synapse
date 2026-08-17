export type Status = 'none' | 'failed' | 'review' | 'mastered';
export type Position = { x:number; y:number };
export type NodeSize = { width:number; height:number };
export type Node = { id:string; content:string; parentId:string|null; position:Position; status:Status; isCollapsed:boolean; tint?: string | null; size?: NodeSize | null; createdAt:number; updatedAt:number };
export type AnnotationKind = 'text' | 'heading';
export type Annotation = { id:string; kind:AnnotationKind; content:string; position:Position; createdAt:number; updatedAt:number };
export type CanvasData = { id:string; name:string; nodes:Record<string,Node>; viewport:Position & {zoom:number}; annotations?:Annotation[]; createdAt:number; updatedAt:number };
export const STATUS_ORDER:Status[]=['none','failed','review','mastered'];
export const STATUS_META:Record<Status,{label:string;color:string;short:string}>={none:{label:'Untagged',color:'#94a3b8',short:''},failed:{label:'Failed',color:'#ef4444',short:'F'},review:{label:'Needs review',color:'#f59e0b',short:'R'},mastered:{label:'Mastered',color:'#10b981',short:'M'}};
export interface NodeTint { id: string; label: string; color: string; }
export const NODE_TINTS: readonly NodeTint[] = [
{ id: 'blue', label: 'Blue', color: '#3b82f6' },
{ id: 'violet', label: 'Violet', color: '#8b5cf6' },
{ id: 'pink', label: 'Pink', color: '#ec4899' },
{ id: 'cyan', label: 'Cyan', color: '#06b6d4' },
];
export const NODE_WIDTH=280, NODE_MIN_HEIGHT=60, HORIZONTAL_INDENT=320, VERTICAL_GAP=30, MIN_ZOOM=.25, MAX_ZOOM=2.5;
export type HeatmapMode = 'full' | 'mini' | 'hidden';
export type ThemeId = string;
export type Theme = ThemeId;
export interface CustomTheme { id:string; name:string; base:'light'|'dark'; colors:Record<string,string>; createdAt:number; updatedAt:number; }
export const THEME_TOKENS:readonly string[]=['--bg','--dot-grid','--surface','--panel-bg','--overlay','--hover','--chip-bg','--ink','--ink-2','--muted','--faint','--line','--line-2','--accent','--accent-hover','--accent-soft','--edge-line','--danger','--danger-soft','--success','--success-soft'];
export const BUILT_IN_THEME_IDS=['light','dark'] as const;

export interface PortableCanvas { format: 'synapse-canvas'; formatVersion: number; name: string; viewport: { x: number; y: number; zoom: number }; nodes: Record<string, Node>; }

export interface Folder { id: string; name: string; parentId: string | null; pinned?: boolean; createdAt: number; updatedAt: number; }
export interface PageMeta { id: string; name: string; folderId: string | null; pinned?: boolean; createdAt: number; updatedAt: number; }
export interface CanvasIndex { schemaVersion: number; folders: Record<string, Folder>; pages: Record<string, PageMeta>; }
