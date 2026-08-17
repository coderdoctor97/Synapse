import type { Annotation, CanvasData, Node, PortableCanvas } from './types';

export const PORTABLE_FORMAT = 'synapse-canvas' as const;
export const PORTABLE_FORMAT_VERSION = 1 as const;

export type ParseImportResult =
  | { ok: true; name: string; nodes: Record<string, Node>; viewport: { x: number; y: number; zoom: number }; annotations: Annotation[] }
  | { ok: false; error: string };

export function buildExportCanvas(canvas: CanvasData): PortableCanvas {
  return {
    format: PORTABLE_FORMAT,
    formatVersion: PORTABLE_FORMAT_VERSION,
    name: canvas.name,
    viewport: { x: canvas.viewport.x, y: canvas.viewport.y, zoom: canvas.viewport.zoom },
    nodes: Object.fromEntries(
      Object.entries(canvas.nodes).map(([id, node]) => [id, { ...node }])
    ) as Record<string, Node>,
    ...(canvas.annotations && canvas.annotations.length > 0
      ? { annotations: canvas.annotations.map(a => ({ ...a })) }
      : {}),
  };
}

export function serializeCanvas(canvas: CanvasData): string {
  return JSON.stringify(buildExportCanvas(canvas), null, 2);
}

export function parseImportedCanvas(raw: string): ParseImportResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'Not a Synapse canvas file.' };
  }

  const obj = data as Record<string, unknown>;

  if (obj.format !== PORTABLE_FORMAT) {
    return { ok: false, error: 'Not a Synapse canvas file.' };
  }

  if (obj.formatVersion !== PORTABLE_FORMAT_VERSION) {
    if (typeof obj.formatVersion === 'number' && obj.formatVersion > PORTABLE_FORMAT_VERSION) {
      return { ok: false, error: 'Created with a newer version of Synapse.' };
    }
    return { ok: false, error: 'Unsupported canvas format version.' };
  }

  if (!obj.nodes || typeof obj.nodes !== 'object' || Array.isArray(obj.nodes)) {
    return { ok: false, error: 'Invalid canvas file: missing or invalid nodes.' };
  }

  const rawNodes = obj.nodes as Record<string, unknown>;
  const nodes: Record<string, Node> = {};
  const now = Date.now();
  const validStatuses = ['none', 'failed', 'review', 'mastered'] as const;

  for (const [key, rawNode] of Object.entries(rawNodes)) {
    if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
      return { ok: false, error: 'Invalid node data in file.' };
    }
    const n = rawNode as Record<string, unknown>;

    if (typeof n.id !== 'string' || n.id.length === 0) {
      return { ok: false, error: 'Invalid node data in file.' };
    }

    // parentId: null or string (missing defaults to null)
    let parentId: string | null = null;
    if (n.parentId === null || n.parentId === undefined) {
      parentId = null;
    } else if (typeof n.parentId === 'string') {
      parentId = n.parentId;
    } else {
      return { ok: false, error: 'Invalid node data in file.' };
    }

    // position: required numeric {x,y}
    const pos = n.position as Record<string, unknown> | undefined;
    if (
      !pos ||
      typeof pos !== 'object' ||
      Array.isArray(pos) ||
      typeof pos.x !== 'number' ||
      !Number.isFinite(pos.x) ||
      typeof pos.y !== 'number' ||
      !Number.isFinite(pos.y)
    ) {
      return { ok: false, error: 'Invalid node data in file.' };
    }
    const position = { x: pos.x, y: pos.y };

    // content: string default ""
    const content = typeof n.content === 'string' ? n.content : '';

    // status: normalized
    const status =
      typeof n.status === 'string' && (validStatuses as readonly string[]).includes(n.status)
        ? (n.status as Node['status'])
        : 'none';

    // isCollapsed: boolean default false
    const isCollapsed = typeof n.isCollapsed === 'boolean' ? n.isCollapsed : false;

    // tint: string or null
    let tint: string | null = null;
    if (n.tint === null || n.tint === undefined) {
      tint = null;
    } else if (typeof n.tint === 'string') {
      tint = n.tint;
    } else {
      tint = null;
    }

    // size: optional {width,height} — accepted only when positive finite numbers, else dropped
    let size: { width: number; height: number } | undefined;
    const sz = n.size as Record<string, unknown> | undefined;
    if (
      sz &&
      typeof sz === 'object' &&
      !Array.isArray(sz) &&
      typeof sz.width === 'number' &&
      Number.isFinite(sz.width) &&
      sz.width > 0 &&
      typeof sz.height === 'number' &&
      Number.isFinite(sz.height) &&
      sz.height > 0
    ) {
      size = { width: sz.width, height: sz.height };
    }

    const createdAt =
      typeof n.createdAt === 'number' && Number.isFinite(n.createdAt) ? n.createdAt : now;
    const updatedAt =
      typeof n.updatedAt === 'number' && Number.isFinite(n.updatedAt) ? n.updatedAt : now;

    const node: Node = {
      id: n.id,
      content,
      parentId,
      position,
      status,
      isCollapsed,
      createdAt,
      updatedAt,
    };
    if (size) {
      node.size = size;
    }
    if (tint !== null) {
      node.tint = tint;
    } else if (n.tint === null) {
      node.tint = null;
    }
    // Only set tint if present to keep optional semantics correct (undefined is also valid)
    // But we handle both null and missing; missing will stay undefined which is valid per types

    nodes[n.id] = node;

    // Also ensure key matches id; if not, we still accept but the record key is n.id
    // Orphans check will be done after all nodes collected
    void key;
  }

  // Validate parentId references
  for (const node of Object.values(nodes)) {
    if (node.parentId !== null && !nodes[node.parentId]) {
      return { ok: false, error: 'File contains nodes with missing parents.' };
    }
  }

  // name: string default "Imported canvas"
  // annotations: optional, parsed leniently (invalid entries are dropped)
  const annotations: Annotation[] = [];
  if (Array.isArray(obj.annotations)) {
    for (const rawAnn of obj.annotations as unknown[]) {
      if (!rawAnn || typeof rawAnn !== 'object' || Array.isArray(rawAnn)) continue;
      const a = rawAnn as Record<string, unknown>;
      if (typeof a.id !== 'string' || a.id.length === 0) continue;
      const pos = a.position as Record<string, unknown> | undefined;
      if (
        !pos ||
        typeof pos !== 'object' ||
        Array.isArray(pos) ||
        typeof pos.x !== 'number' ||
        !Number.isFinite(pos.x) ||
        typeof pos.y !== 'number' ||
        !Number.isFinite(pos.y)
      ) {
        continue;
      }
      annotations.push({
        id: a.id,
        kind: a.kind === 'heading' ? 'heading' : 'text',
        content: typeof a.content === 'string' ? a.content : '',
        position: { x: pos.x, y: pos.y },
        createdAt: typeof a.createdAt === 'number' && Number.isFinite(a.createdAt) ? a.createdAt : now,
        updatedAt: typeof a.updatedAt === 'number' && Number.isFinite(a.updatedAt) ? a.updatedAt : now,
      });
    }
  }

  const name = typeof obj.name === 'string' && obj.name.trim().length > 0 ? obj.name : 'Imported canvas';

  // viewport: numeric {x,y,zoom} default {0,0,1}
  let viewport = { x: 0, y: 0, zoom: 1 };
  const vp = obj.viewport as Record<string, unknown> | undefined;
  if (vp && typeof vp === 'object' && !Array.isArray(vp)) {
    const x = typeof vp.x === 'number' && Number.isFinite(vp.x) ? vp.x : 0;
    const y = typeof vp.y === 'number' && Number.isFinite(vp.y) ? vp.y : 0;
    const zoom = typeof vp.zoom === 'number' && Number.isFinite(vp.zoom) && vp.zoom > 0 ? vp.zoom : 1;
    viewport = { x, y, zoom };
  }

  return { ok: true, name, nodes, viewport, annotations };
}
