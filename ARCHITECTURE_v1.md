# ARCHITECTURE_v1.md — Synapse V1 Architecture

## 1. Current Project Map
```
src/app/layout.tsx          → App shell (Providers + ThemeToggle)
src/app/page.tsx            → Root redirect → /canvas/default
src/app/canvas/[id]/page.tsx → Dynamic canvas route
src/components/Canvas/
  Canvas.tsx                → Composition: viewport, edges, node map, toolbar
  Node.tsx                  → Node card: drag, edit, status, palette, grip
  Toolbar.tsx               → Add root, reset, theme toggle
src/lib/
  types.ts                  → Status, Node, CanvasData, constants
  store.ts                  → Zustand store (useCanvasStore)
  persistence.ts            → loadCanvas / saveCanvas (localStorage)
  operations/
    hierarchy.ts            → visibleOrder, children, descendants, roots, tidyPositions
    status.ts               → statusSummary
    nodes.ts                → makeNode factory
    layout.ts               → Layout engine (tree positions)
    formatting.ts           → parseFormatting (__underline__, **bold**, *italic*)
```

## 2. Backend NONE
No API routes. No server components that fetch. No auth. All persistence via `localStorage`.

## 3. Data Model
See `PROJECT_RULES.md §3`. V1 is plain text. `Node.content` is `string`.

## 4. Component Boundaries
- **Canvas.tsx:** renders the viewport, SVG edges, and node cards. Handles pan/zoom, selection lasso, viewport-level shortcuts.
- **Node.tsx:** single node card. Owns edit state (draft). Blur-saves to store. Renders formatted content.
- **Toolbar.tsx:** floating actions (add root, zoom controls).

## 5. State Flow
1. User edits textarea → `setDraft(value)` (local component state).
2. Blur / Enter → `update(node => { node.content = draft; node.updatedAt = Date.now() })`.
3. Store subscribers → re-render affected components.
4. Debounced persistence → `saveCanvas` to `localStorage`.

## 6. Edge Rendering
SVG `<path>` elements drawn between parent `(x + width, y + height/2)` and child `(x, y + height/2)`. Bezier curves. Re-rendered on every store update via `edges` selector.

## 7. Layout
`tidyPositions` assigns `(x, y)` to each node based on tree depth and sibling index. Fixed `NODE_WIDTH=280`, `HORIZONTAL_INDENT=320`.

## 8. Testing
Unit tests in `tests/` using vitest. Pure logic in `operations/` tested in isolation. Store integration via `MemoryStorage`.

## 9. Formatting
`parseFormatting` converts plain text with `__underline__`, `**bold**`, `*italic*` markers into React spans. Must produce non-overlapping segments covering the full input (no duplication, no loss).

## 10. Migration
`loadCanvas` reads `synapse:v1:canvas:<id>` and applies `schemaVersion` migrations if present. Future schema changes increment `schemaVersion` and add a migration step.
