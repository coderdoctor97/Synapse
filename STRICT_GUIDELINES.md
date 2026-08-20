# STRICT_GUIDELINES.md — Synapse (Binding)

> **Source:** consolidated from `PROJECT_RULES.md` (authoritative) and `ARCHITECTURE_v1.md`.
> **Scope:** every code change in this repository.
> **Version control (commits, branches, PRs, CI) is EXCLUDED — the user handles it manually.**
> If a request conflicts with a 🔒 LOCKED rule, **STOP and ask for explicit approval. Never improvise.**

Severity keys:
- 🔒 **LOCKED** — cannot change without explicit user approval + a migration strategy.
- **MUST** — unconditional requirement.
- **MUST NOT** — unconditional prohibition.
- **SHOULD** — strong recommendation; deviate only with a stated reason.

---

## 1. Project Identity (🔒 LOCKED)

- **Name:** Synapse — Contextual Active Recall Canvas.
- **Purpose:** Hierarchical outliner on an infinite canvas for progressive disclosure + active recall, for medical students.
- **Core loop (MUST never be broken):** Build topic tree → Collapse all → Recall from memory → Expand to verify → Tag weak items → See the heat-map.
- **Principles:** Local-first. Lightweight. No backend. No accounts. No cloud.

**MUST NOT** add auth, cloud sync, server dependency, or any remote service. If requested, refuse and propose a local-first alternative.

---

## 2. Tech Stack (🔒 LOCKED)

| Layer | Allowed | Rule |
|---|---|---|
| Framework | Next.js 13+ App Router (`next` 14.x) | Routing only via `src/app/` |
| Language | TypeScript, `strict: true` | All code `.ts`/`.tsx`; strict mode MUST stay on |
| State | Zustand | The only state library |
| Persistence | Browser `localStorage` (V1) | Only through `src/lib/persistence.ts` |
| Backend | **NONE** | No API routes, no database, no server of any kind |
| Node storage | Flat `Record<string, Node>` | Never nested trees, never array-of-children |

**MUST NOT install** any of: `express, fastify, koa, @prisma/client, prisma, mongoose, mongodb, pg, mysql2, drizzle-orm, supabase, firebase, @supabase/supabase-js, next-auth, lucia, redux, @reduxjs/toolkit, jotai, valtio, mobx, recoil`.

**MUST NOT** introduce any new framework, database, state library, or backend service without explicit user approval.

---

## 3. Data Model (🔒 LOCKED FOR V1)

```ts
type NodeStatus = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;                    // UUID
  content: string;               // Plain text only in V1
  parentId: string | null;       // null = root node
  position: { x: number; y: number };
  status: NodeStatus;
  isCollapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Canvas {
  id: string;
  name: string;
  nodes: Record<string, Node>;
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}
```

Hard rules:
1. `MUST NOT` add, remove, or rename any `Node`/`Canvas` field without: (a) a `schemaVersion` bump, (b) a migration in `persistence.ts` that runs on load, (c) an update to `ARCHITECTURE_v1.md` §10.
2. **MUST NOT** silently discard or lose valid user data when the model evolves.
3. `content` stays **plain text** until an explicit V2 decision approves markdown/rich text.
4. `nodes` MUST remain a flat dictionary; hierarchy is derived via `parentId`.
5. Existing local extensions already in the codebase (themes/tints, canvas index/folder structures, portable import-export shapes) are permitted, but every new persisted shape still obeys rule 1.

---

## 4. Placement Map — where every change goes

| Change requested | Mandatory location |
|---|---|
| Route / page | `src/app/` (App Router; no `api/` directory, ever) |
| Visual styles | `src/app/globals.css` |
| Canvas interaction | `src/components/Canvas/` and/or `src/hooks/` |
| Business rule / tree calculation | `src/lib/operations/` (pure functions, tested) |
| Node/canvas data shape | `src/lib/types.ts`, then persistence migration |
| Storage | `src/lib/persistence.ts` |
| Reusable control | `src/components/ui/` |
| Regression test | `tests/` |

Layering rules:
- **MUST** keep domain logic out of components.
- **MUST NOT** import React/Next modules inside `src/lib/` (framework-independent).
- **MUST NOT** put persistence calls in components; go through `persistence.ts`.
- **MUST NOT** create `src/app/api/` under any circumstance.

---

## 5. Domain Invariants (MUST hold after every change)

1. **Hierarchy:** `parentId: null` = root. Children derived by filtering the flat record — never stored as nested arrays.
2. **Visibility:** Render **only** nodes whose ancestors are ALL expanded. `visibleOrder()` is the single source of truth; a collapsed ancestor hides its entire subtree.
3. **Delete:** Cascading. Deleting a node removes it and every descendant, each exactly once.
4. **Status cycle:** `none → failed → review → mastered → none`, in this exact order.
5. **Heat-map / summaries:** Aggregate **direct children only** — never grandchildren or deeper.
6. **Coordinates:** World space. Viewport applies `translate(x, y) scale(zoom)`. Children at one horizontal indent right of the parent (`+320` x); new siblings stacked below existing siblings with the defined vertical gap.
7. **State ownership:**
   - Canonical canvas state → `useCanvasStore` (Zustand).
   - Ephemeral gesture (pan/zoom/drag) state → local to `Canvas.tsx`.
   - Draft editor text → local to `Node.tsx`.
   - Persistence → `persistence.ts`, debounced ~400 ms.
8. **Editing:** Save on blur or Enter; Escape cancels. Editing/just-created ids live in the store (`editingId`, `justCreatedId`).
9. **Corrupt data:** Corrupted/invalid localStorage data MUST yield a usable fresh canvas — it MUST never crash the app.

---

## 6. Mandatory Validation (REQUIRED before reporting any task done)

Run, in order, and fix failures before declaring completion:

```bash
npm run build    # TypeScript strict + Next production compile
npm test         # unit tests
```

Additionally, **MUST** manually verify every user interaction touched by the change:
create, edit, status cycle, collapse/expand, drag, zoom/pan, delete, reload-restore.

UI changes **MUST** work at desktop and narrow widths. If no test exists for newly added pure logic, one **MUST** be added in the same change.

---

## 7. Persistence & Migration (binding)

- Storage key format: `synapse:v1:canvas:<id>`, loaded and saved only via `src/lib/persistence.ts`.
- On load: migrate older schema versions forward to the latest shape **before** rendering (see `ARCHITECTURE_v1.md` §10).
- Save is debounced ~400 ms and MUST be lossless for supported data.
- Import/export, if used, MUST validate against the current schema at a single boundary (`src/lib/`), not ad hoc in components.
- **MUST NOT** introduce a storage-key or schema change without a documented migration path.

---

## 8. Testing (binding priorities)

Priority order — highest first:

1. **Unit tests (REQUIRED for new pure logic)** under `tests/`, for code that needs no browser:
   - `hierarchy` — roots, children, descendants, `visibleOrder`
   - `status` — direct-child aggregation only
   - `nodes` — node factory / defaults
   - `persistence` — corrupt/invalid saved data handling
   Minimum cases:
   - A collapsed node hides all nested descendants.
   - Deletion hits every descendant exactly once.
   - Root/child ordering is deterministic by `createdAt`.
   - Status aggregation ignores grandchildren.
   - Corrupt stored data → usable fresh canvas, no crash.
2. **Component/integration tests** (React Testing Library + JSDOM): inline edit save, status cycling, toolbar actions.
3. **E2E** (Playwright) for release confidence: create root → enter text → add child → change status → collapse/expand → reload → restored from localStorage.

**MUST NOT** delete or weaken existing tests to make a change pass.

---

## 9. Approved Evolution Directions (allowed refactors)

Only these directions are pre-approved; anything else counts as scope expansion and requires explicit request:

1. Extract viewport gestures into `src/hooks/useViewport.ts`.
2. Isolate SVG connectors into `CanvasEdges.tsx` with measured card heights.
3. Introduce a storage-adapter interface behind `persistence.ts` (still localStorage underneath).
4. Add `schemaVersion` to the persisted canvas before changing node data shapes.
5. Replace browser `confirm()` with an accessible modal component.
6. Add canvas index/list page built on the existing `/canvas/[id]` route.
7. Add JSON export/import with the migration boundary.

---

## 10. Conflict Resolution Protocol

1. Request conflicts with a 🔒 LOCKED rule → **STOP. Do not edit anything.**
2. Explain the exact rule being violated and why the request breaks it.
3. Ask the user for explicit approval (e.g., `OVERRIDE: <reason>`).
4. Only after explicit approval may you proceed, and the override MUST be recorded in `SYNAPSE_GUARDIAN.md` / `.synapse-guardian.json` if those files exist.
5. No silent compromises: a change that is "most of the way" compliant is a violation.

**MUST NOT** expand scope beyond the requested change. No drive-by refactors, no new dependencies, no renames of unrelated files.

---

## 11. Explicitly OUT of Scope — user handles manually

Do **NOT** do, suggest-automating, or block on any version-control activity:

- No `git commit`, `git push`, `git rebase`, branch creation for the user's workflow.
- No conventional-commit prefixes, branch naming, PR creation, or PR checklists.
- No CI pipeline setup or merge-gate enforcement.

Leave the working tree exactly as the user should review and commit it. (If the user explicitly asks to run a specific git command, follow that instruction only for that instance.)

---

**Checklist — run through before finishing any task:**
- [ ] No LOCKED rule touched (or explicit override recorded).
- [ ] Change placed per §4 map; domain logic kept out of components.
- [ ] Data model unchanged, or schemaVersion + migration + doc updated.
- [ ] All §5 invariants preserved.
- [ ] `npm run build` passes; `npm test` passes; manual interaction check done.
- [ ] New pure logic has tests; no existing test weakened.
- [ ] No new dependencies; no `src/app/api/`; no backend/auth/cloud.
- [ ] No git/commit/PR actions performed.
