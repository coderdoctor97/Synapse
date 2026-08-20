# PROJECT_RULES.md — Synapse V1 Constitution

## 1. Core Principle
Local-first. All state lives in `localStorage` (key `synapse:v1:canvas:<id>`). No server, no sync, no auth.

## 2. Tech Stack (LOCKED)
- **Framework:** Next.js 14 (App Router)
- **State:** Zustand 4.x
- **Styling:** Tailwind CSS
- **Icons:** @phosphor-icons/react
- **No backend.** No API routes. No databases. No auth providers.

## 3. Data Model (LOCKED V1)
```ts
type Status = 'none' | 'failed' | 'review' | 'mastered';
type Node = {
  id: string; content: string; parentId: string | null;
  position: { x: number; y: number }; status: Status;
  isCollapsed: boolean; createdAt: number; updatedAt: number;
};
type CanvasData = {
  id: string; name: string;
  nodes: Record<string, Node>; viewport: { x: number; y: number; zoom: number };
  createdAt: number; updatedAt: number;
};
```
`Node.content` is plain text only — no markdown fields (`contentRich`/`markdown`/`richText` forbidden).

## 4. Scope
Single-page canvas. Tree layout (hierarchical). Node CRUD + status cycle + collapse/expand + selection + drag. Undo/redo for content changes.

## 5. File Layout
- `src/app/` — Next.js App Router shell
- `src/components/Canvas/` — UI components (Canvas, Node, Toolbar, edges)
- `src/lib/` — pure logic (types, store, persistence, operations/)
- `src/lib/operations/` — domain logic (hierarchy, status, nodes, layout)
- `tests/` — unit tests (vitest)

## 6. Editor Contract
The Node editor is a `<textarea>` with a separate `draft` state. `onBlur` saves to store. The display div renders via `parseFormatting(draft ?? node.content)`. No form libraries. No rich text.
