import type { Annotation, CanvasData, CanvasIndex, CustomTheme, HeatmapMode, ThemeId } from './types';
import { makeNode } from './operations/nodes';
import { children } from './operations/hierarchy';
import { HORIZONTAL_INDENT, NODE_MIN_HEIGHT, NODE_WIDTH } from './types';
const CURRENT_SCHEMA_VERSION = 1;
const key=(id:string)=>`synapse:v1:canvas:${id}`;
const INDEX_KEY = 'synapse:v1:index';
export function migrateCanvas(raw: unknown): CanvasData | null {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const data = raw as Record<string, unknown>;
    if (!data || typeof data.nodes !== 'object' || data.nodes === null || Array.isArray(data.nodes) || !data.viewport) return null;
    const vp = data.viewport as Record<string, unknown>;
    // Tolerant migration: missing schemaVersion is legacy-but-compatible
    // Do not strip or require tint — nodes without tint are valid
    const viewport = {
      x: Number(vp.x) || 0,
      y: Number(vp.y) || 0,
      zoom: Number(vp.zoom) || 1,
    };
    // Annotations: optional; tolerate missing or garbage by keeping only valid entries
    let annotations: Annotation[] | undefined;
    if (Array.isArray(data.annotations)) {
      const valid = (data.annotations as unknown[]).filter((a): a is Annotation => {
        if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
        const ann = a as Record<string, unknown>;
        const pos = ann.position as Record<string, unknown> | undefined;
        return (
          typeof ann.id === 'string' &&
          ann.id.length > 0 &&
          (ann.kind === 'text' || ann.kind === 'heading') &&
          typeof ann.content === 'string' &&
          !!pos &&
          typeof pos === 'object' &&
          !Array.isArray(pos) &&
          typeof pos.x === 'number' &&
          Number.isFinite(pos.x) &&
          typeof pos.y === 'number' &&
          Number.isFinite(pos.y)
        );
      });
      if (valid.length > 0) annotations = valid;
    }
    // Return migrated canvas, preserving all existing fields including optional tint/annotations
    return {
      ...(data as object),
      viewport,
      ...(annotations ? { annotations } : {}),
    } as unknown as CanvasData;
  } catch {
    return null;
  }
}
export function loadCanvas(id:string):CanvasData|null { try { const raw=localStorage.getItem(key(id)); if(!raw)return null; const data=JSON.parse(raw); const migrated=migrateCanvas(data); if(!migrated) return null; return migrated; } catch { return null; } }
export function saveCanvas(canvas:CanvasData){ try { const envelope = { ...(canvas as unknown as Record<string, unknown>), schemaVersion: CURRENT_SCHEMA_VERSION }; localStorage.setItem(key(canvas.id),JSON.stringify(envelope)); return true; } catch { return false; } }
export function readCanvasRaw(id:string): CanvasData | null {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const migrated = migrateCanvas(data);
    if (!migrated) return null;
    return migrated;
  } catch {
    return null;
  }
}
export function loadIndex(): CanvasIndex {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) throw new Error('missing');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
    const obj = data as Record<string, unknown>;
    if (typeof obj.folders !== 'object' || obj.folders === null || Array.isArray(obj.folders)) throw new Error('invalid folders');
    if (typeof obj.pages !== 'object' || obj.pages === null || Array.isArray(obj.pages)) throw new Error('invalid pages');
    return {
      schemaVersion: 1,
      folders: obj.folders as Record<string, CanvasIndex['folders'][string]>,
      pages: obj.pages as Record<string, CanvasIndex['pages'][string]>,
    };
  } catch {
    const folders: Record<string, CanvasIndex['folders'][string]> = {};
    const pages: Record<string, CanvasIndex['pages'][string]> = {};
    const rawDefault = readCanvasRaw('default');
    if (rawDefault) {
      const now = Date.now();
      pages['default'] = {
        id: 'default',
        name: typeof rawDefault.name === 'string' && rawDefault.name.trim().length > 0 ? rawDefault.name : 'My Canvas',
        folderId: null,
        createdAt: typeof rawDefault.createdAt === 'number' && Number.isFinite(rawDefault.createdAt) ? rawDefault.createdAt : now,
        updatedAt: typeof rawDefault.updatedAt === 'number' && Number.isFinite(rawDefault.updatedAt) ? rawDefault.updatedAt : now,
      };
    }
    const index: CanvasIndex = { schemaVersion: 1, folders, pages };
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      // ignore quota errors
    }
    return index;
  }
}
export function saveIndex(index: CanvasIndex): void {
  try {
    const toSave = { schemaVersion: 1, folders: index.folders, pages: index.pages };
    localStorage.setItem(INDEX_KEY, JSON.stringify(toSave));
  } catch {
    // ignore quota / privacy-mode errors
  }
}
export function deleteCanvasData(id: string): void {
  try {
    localStorage.removeItem(key(id));
  } catch {
    // ignore
  }
}
export function updateCanvasName(id: string, name: string): void {
  try {
    const canvas = readCanvasRaw(id);
    if (!canvas) return;
    canvas.name = name;
    canvas.updatedAt = Date.now();
    saveCanvas(canvas);
  } catch {
    // ignore
  }
}

function createSeedCanvas(id: string): CanvasData {
  const t = Date.now();
  let seq = 0;
  const c: CanvasData = { id, name: 'My Canvas', nodes: {}, viewport: { x: 0, y: 0, zoom: 1 }, createdAt: t, updatedAt: t };
  const add = (parentId: string | null, content: string, status: any = 'none', isCollapsed = false) => {
    const nid = crypto.randomUUID();
    const p = parentId ? c.nodes[parentId].position : { x: 80, y: 160 };
    const siblings = parentId ? children(c, parentId) : [];
    c.nodes[nid] = {
      ...makeNode(
        nid,
        content,
        parentId,
        parentId
          ? { x: p.x + HORIZONTAL_INDENT, y: siblings.length ? Math.max(...siblings.map(s => s.position.y)) + NODE_MIN_HEIGHT + 30 : p.y }
          : p
      ),
      status,
      isCollapsed,
      createdAt: t + seq++,
    };
    return nid;
  };
  const root = add(null, 'Eclampsia — Management Framework');
  const def = add(root, 'Definition & Pathophysiology', 'mastered', true);
  add(def, 'New-onset seizures in a pre-eclamptic patient');
  add(def, 'Endothelial dysfunction, vasospasm & hyperperfusion');
  const red = add(root, 'Red Flag Symptoms');
  ['Severe frontal headache', 'Visual disturbances — scotoma, blurring', 'Epigastric / right upper quadrant pain', 'Hyperreflexia with clonus'].forEach(x => add(red, x));
  const mgmt = add(root, 'Acute Management');
  const mg = add(mgmt, 'MgSO₄ Protocol', 'none', true);
  add(mg, 'Loading dose: 4 g IV over 15–20 min', 'mastered');
  add(mg, 'Maintenance: 1 g/hour infusion for 24 h', 'review');
  add(mg, 'Toxicity watch: reflexes, RR, urine output', 'failed');
  add(mg, 'Antidote: Calcium gluconate 1 g IV', 'failed');
  add(mgmt, 'Delivery planning — definitive treatment', 'failed');
  add(mgmt, 'BP control: Labetalol / Hydralazine', 'review');
  const diff = add(root, 'Differential Diagnosis', 'mastered', true);
  ['Epilepsy', 'Meningitis / encephalitis', 'Hypoglycemia'].forEach(x => add(diff, x));
  return c;
}

export function loadOrCreateCanvas(id: string): CanvasData {
  const existing = readCanvasRaw(id);
  if (existing) return existing;
  if (id === 'default') {
    return createSeedCanvas(id);
  }
  const now = Date.now();
  return { id, name: 'Untitled', nodes: {}, viewport: { x: 0, y: 0, zoom: 1 }, createdAt: now, updatedAt: now };
}
const UI_SETTINGS_KEY='synapse:v1:ui-settings';
const CUSTOM_THEMES_KEY='synapse:v1:custom-themes';
const HEATMAP_MODES:HeatmapMode[]=['full','mini','hidden'];
export function loadUISettings():{heatmapMode:HeatmapMode;theme:ThemeId} { try { const raw=localStorage.getItem(UI_SETTINGS_KEY); if(!raw)return {heatmapMode:'full',theme:'light'}; const data=JSON.parse(raw); if(!data||typeof data!=='object') return {heatmapMode:'full',theme:'light'}; return {heatmapMode:HEATMAP_MODES.includes(data.heatmapMode)?data.heatmapMode as HeatmapMode:'full',theme:typeof data.theme==='string'&&data.theme?data.theme:'light'}; } catch { return {heatmapMode:'full',theme:'light'}; } }
export function saveUISettings(settings:{heatmapMode:HeatmapMode;theme:ThemeId}):void { try { localStorage.setItem(UI_SETTINGS_KEY,JSON.stringify(settings)); } catch { /* ignore quota / privacy-mode errors */ } }
export function loadCustomThemes():Record<ThemeId,CustomTheme> { try { const raw=localStorage.getItem(CUSTOM_THEMES_KEY); if(!raw)return {}; const data=JSON.parse(raw); if(!data||typeof data!=='object'||Array.isArray(data))return {}; const themes:Record<ThemeId,CustomTheme>={}; for(const [id,theme] of Object.entries(data)){const candidate=theme as Partial<CustomTheme>;if(candidate&&typeof candidate==='object'&&typeof candidate.id==='string'&&typeof candidate.name==='string'&&(candidate.base==='light'||candidate.base==='dark')&&candidate.colors&&typeof candidate.colors==='object'&&!Array.isArray(candidate.colors)&&typeof candidate.createdAt==='number'&&typeof candidate.updatedAt==='number')themes[id]=candidate as CustomTheme;} return themes; } catch { return {}; } }
export function saveCustomThemes(map:Record<ThemeId,CustomTheme>):void { try { localStorage.setItem(CUSTOM_THEMES_KEY,JSON.stringify(map)); } catch { /* ignore quota / privacy-mode errors */ } }
