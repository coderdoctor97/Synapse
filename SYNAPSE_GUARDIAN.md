# 🛡️ SYNAPSE GUARDIAN — Session Constitution

> **Status: ACTIVE for this session** — 2026-08-16
> This file is the built-in enforcement system that merges `ARCHITECTURE_v1.md` + `PROJECT_RULES.md` into a single runtime constitution.
> **Every AI action in this session MUST obey this file. If a user request conflicts, STOP and ASK — do not improvise.**

---

## 0. How This Guardian Works

1. **Read before every change**: Any file edit, dependency add, or architectural decision must be validated against this document.
2. **Deny-by-default**: Anything marked `LOCKED` cannot be changed without explicit user approval + migration strategy.
3. **Validate before commit**: Run `node scripts/guardian.mjs` + `npm run build` before considering any task complete.
4. **Session memory**: This guardian persists for the entire conversation. Re-read it if context is truncated.

---

## 1. PROJECT IDENTITY — LOCKED

- **Name:** Synapse — Contextual Active Recall Canvas
- **Purpose:** Hierarchical outliner on an infinite canvas for progressive disclosure and active recall. Built for medical students facing high-volume, interconnected information.
- **Core Loop (must never break):**
  ```
  Build topic tree → Collapse All → Recall from memory → Expand to verify → Tag weak items (Failed/Review/Mastered) → See heat-map
  ```
- **Principles:** Local-first. Lightweight. No backend. No accounts. No cloud.

**Guardian Rule:** Any feature that adds auth, cloud sync, or server dependency is REJECTED unless user explicitly overrides with `OVERRIDE: cloud-approved`.

---

## 2. TECH STACK — LOCKED

| Layer | Choice | Enforcement |
|---|---|---|
| Framework | Next.js 13+ App Router | `package.json` must keep `next` 14.x, `src/app/` routing only |
| Language | TypeScript (strict) | All files `.ts`/`.tsx`, `tsconfig.json` strict remains true |
| State | Zustand `4.5.5` | No Redux, Jotai, MobX, Recoil, Context-global-store replacement |
| Persistence | `localStorage` (V1) | `src/lib/persistence.ts` only; key `synapse:v1:canvas:<id>` |
| Backend | **NONE** | `src/app/api/` must NOT exist. No `express`, `prisma`, `mongoose`, `drizzle`, `supabase`, `firebase` deps |
| Node Storage | Flat `Record<string, Node>` | Never nested tree. Never array-of-children. |

**Guardian Action on Violation:** Block `npm install <banned>` and explain. Suggest local-first alternative.

Banned dependencies list:
```
express, fastify, koa, @prisma/client, prisma, mongoose, mongodb, pg, mysql2, drizzle-orm, supabase, firebase, @supabase/supabase-js, next-auth, lucia, redux, @reduxjs/toolkit, jotai, valtio, mobx, recoil
```

---

## 3. DATA MODEL — LOCKED FOR V1

```ts
// PROJECT_RULES.md §3 — DO NOT MODIFY WITHOUT MIGRATION
type NodeStatus = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;                    // UUID (crypto.randomUUID())
  content: string;               // Plain text only in V1 — NO markdown/rich-text yet
  parentId: string | null;       // null = root node
  position: { x: number; y: number }; // world space
  status: NodeStatus;
  isCollapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface CanvasData {
  id: string;
  name: string;
  nodes: Record<string, Node>;
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}
```

**Extended V1 reality (from src/lib/types.ts):**
- Constants: `NODE_WIDTH=280`, `NODE_MIN_HEIGHT=60`, `HORIZONTAL_INDENT=320`, `VERTICAL_GAP=30`, `MIN_ZOOM=.25`, `MAX_ZOOM=2.5`
- `STATUS_ORDER = ['none','failed','review','mastered']`
- `ThemeId`, `CustomTheme`, `HeatmapMode`, `THEME_TOKENS` are allowed extensions (already in codebase, not part of locked Node).

**Guardian Rules:**
1. Adding/removing/renaming any `Node` field (e.g. `isHidden`, `schemaVersion`, `contentRich`, `tags`) requires:
   - Bump `schemaVersion` in persisted data
   - Add migration in `persistence.ts` `loadCanvas()` — never discard old user data
   - Update `ARCHITECTURE_v1.md §10` pattern
2. `content` stays plain text until V2 explicitly approves markdown.
3. `nodes` stays flat dictionary — hierarchy derived via `parentId`.

**Pending but NOT YET APPROVED:** V2-04b `isHidden: boolean` is DESIGNED but NOT IMPLEMENTED. Do not add it unless user says `IMPLEMENT V2-04b`.

---

## 4. ARCHITECTURE MAP — Where To Make Changes

```
synapse/
├── src/app/                          # Routing + shell ONLY
│   ├── layout.tsx                    # Root HTML, global CSS
│   ├── page.tsx                      # → redirect /canvas/default
│   └── canvas/[id]/page.tsx          # Dynamic canvas route
├── src/components/Canvas/            # Canvas interactions (viewport, Node, Toolbar)
├── src/components/ui/                # Reusable primitives (Button, StatusBadge)
├── src/lib/                          # Framework-independent domain layer
│   ├── types.ts                      # Data shapes + constants
│   ├── store.ts                      # Zustand store + commands + seed
│   ├── persistence.ts                # localStorage boundary
│   └── operations/                   # Pure business logic
│       ├── nodes.ts                  # makeNode()
│       ├── hierarchy.ts              # roots(), children(), descendants(), visibleOrder()
│       └── status.ts                 # statusSummary() — direct children only
└── tests/                            # Reserved (vitest)
```

| Change requested | Primary location | Guardian Check |
|---|---|---|
| Add a route/page | `src/app/` | Must use App Router, no api routes |
| Alter visual styles | `src/app/globals.css` | Check contrast, tokens |
| Add canvas interaction | `src/components/Canvas/` + `src/hooks/` | Keep pure logic in `lib/operations/` |
| Change business rule | `src/lib/operations/` | Add unit test first |
| Alter node/canvas shape | `src/lib/types.ts` → then persistence migration | Requires schemaVersion |
| Change storage | `src/lib/persistence.ts` | Keep `localStorage` default, adapter interface if needed |
| Reusable control | `src/components/ui/` | No business logic inside |

---

## 5. DOMAIN RULES — INVARIANTS

1. **Hierarchy:** `parentId: null` = root. Children derived by filtering `Record<string, Node>`.
2. **Visibility:** Only nodes whose ancestors are ALL expanded render. `visibleOrder()` is source of truth. Collapsed ancestor hides entire subtree recursively.
3. **Delete:** Cascading — delete node + all `descendants()` (exactly once each).
4. **Status cycle:** `none → failed → review → mastered → none` (STATUS_ORDER).
5. **Heatmap aggregation:** `statusSummary()` counts **direct children only**, NOT grandchildren.
6. **Coordinates:** World space. Viewport does `translate(x, y) scale(zoom)`. Children: `x = parent.x + 320`, siblings stacked `y = maxSiblingY + 60 + 30`.
7. **State ownership:**
   - Canonical: `useCanvasStore` (Zustand)
   - Ephemeral: gesture state in `Canvas.tsx`, draft text in `Node.tsx`
   - Persisted: `persistence.ts` per `synapse:v1:canvas:<id>`, debounced 400ms, `UI_SETTINGS_KEY` + `CUSTOM_THEMES_KEY`
8. **Editing:** Save on blur or Enter, Escape cancels. `editingId`, `justCreatedId` in store.

**Guardian Test:** Any change to `hierarchy.ts` must keep these invariants and be covered by tests listed in §7.

---

## 6. DEVELOPMENT COMMANDS — ONLY THESE

```bash
npm install          # after lockfile changes
npm run dev          # dev server :3000
npm run build        # MUST pass before PR — TypeScript + Next build
npm run start        # serve production
npm run test         # vitest run
node scripts/guardian.mjs  # THIS guardian validator (new)
```

**Guardian Rule:** Before marking any task done, run `npm run build`. If it fails, fix, don't ship.

---

## 7. WORKFLOW — For Every Feature/Bug Fix

1. Pull/rebase, `npm install`, `npm run build` clean baseline.
2. Create focused branch: `feat/*`, `fix/*`, `refactor/*`, `chore/*`.
3. Keep domain logic out of components (see map above).
4. **Add/update tests first** for pure logic.
5. Manual browser verify: create, edit, status cycle, collapse/expand, drag, zoom/pan, delete.
6. `npm run build` + `node scripts/guardian.mjs`
7. Small conventional commits: `feat: add X`, `fix: Y`, `refactor: Z`, `test: ...`, `docs: ...`, `chore: ...`

**PR Acceptance Checklist (must all be ✅):**
- [ ] `npm run build` succeeds
- [ ] `node scripts/guardian.mjs` passes (no locked violations)
- [ ] Existing interactions still work (list in #6)
- [ ] New pure logic has tests (`tests/hierarchy.test.ts`, etc.)
- [ ] Works at desktop + narrow width
- [ ] No storage-key migration without migration strategy
- [ ] PR description docs behavior + data-shape change

**Versioning:** SemVer — MAJOR breaking storage/routing, MINOR feature, PATCH fix.

---

## 8. TESTING STRATEGY — REQUIRED

**Unit (highest priority) — `tests/`:**
- `hierarchy.test.ts` — collapsed hides descendants, deletion hits each descendant once, ordering by `createdAt`
- `status.test.ts` — direct-child only, ignore grandchildren
- `nodes.test.ts` — default model
- `persistence.test.ts` — corrupt data → fresh canvas, not crash

**Component (next):** React Testing Library + JSDOM for inline edit, status cycling, toolbar.

**E2E (release confidence):** Playwright — create root → enter text → add child → change status → collapse/expand parent → reload → restored.

**CI Pipeline (`.github/workflows/ci.yml`):**
```
Push/PR → npm ci → npm run test → npm run build → (optional Playwright) → Merge permitted
```

---

## 9. PERSISTENCE MIGRATION RULE — CRITICAL

> The canvas IS user data. Never silently discard it.

Future shape:
```ts
{
  schemaVersion: 1,
  id: 'default',
  nodes: { ... },
  viewport: { x: 0, y: 0, zoom: 1 }
}
```

On `loadCanvas()`, migrate old versions → latest BEFORE render. Corrupt data → return `null` → `seed()` creates fresh, but valid old data must survive.

**Guardian Block:** Any edit to `types.ts` changing `Node`/`CanvasData` without simultaneously editing `persistence.ts` with migration + `schemaVersion` is DENIED.

---

## 10. NEAR-TERM ROADMAP — DO NOT PRE-EMPT

These are *planned* but not yet approved to build unless explicitly requested:
1. Extract `useViewport.ts`
2. Create `CanvasEdges.tsx`
3. Storage adapter interface
4. Add `schemaVersion`
5. Replace `confirm()` with modal
6. Canvas index/list page
7. Export/import JSON with schema validation

**Guardian:** If user asks for one, confirm scope before building, then follow §4 map.

---

## 11. CONFLICT RESOLUTION

- If user request conflicts with any `LOCKED` rule → **STOP, EXPLAIN, ASK for `OVERRIDE: <reason>`**.
- Example: "You asked for Firebase, but PROJECT_RULES.md §2 says Backend NONE. Do you want `OVERRIDE: backend-approved` to add it, or should I do a localStorage adapter instead?"
- Log all overrides in `V2-CHANGELOG.md` (create if needed).

---

## 12. GUARDIAN SELF-CHECK — How To Verify It's Active

Run:
```bash
node scripts/guardian.mjs
```

Expected output when clean:
```
✅ Stack locked — no banned deps
✅ Data model intact (V1)
✅ No API routes
✅ Storage keys correct
✅ Domain invariants present
✅ Guardian ACTIVE — session constitution obeyed
```

If any ❌ appears, fix before proceeding.

---

**End of Constitution — Guardian is now the session's single source of truth alongside ARCHITECTURE_v1.md & PROJECT_RULES.md.**
