# SYNAPSE STRICT RULES — Authoritative & Binding

> **This is the single strict rule set for every change to Synapse.**
> Sources: `PROJECT_RULES.md` (authoritative) + `ARCHITECTURE_v1.md` (build map) + `SYNAPSE_GUARDIAN.md` (constitution) + `STRICT_GUIDELINES.md` + `skills/AGENTS.md` (UI/UX skills).
> Read this file **before** making any change. If a request conflicts with a 🔒 LOCKED rule → **STOP, explain, ask for `OVERRIDE: <reason>`. Never improvise.**

Severity keys: 🔒 **LOCKED** (cannot change without explicit approval + migration) · **MUST** (unconditional) · **MUST NOT** (unconditional) · **SHOULD** (deviate only with stated reason)

---

## 0. THE COMMIT RULE — USER HANDLES VERSION CONTROL MANUALLY

> This is the number one rule. It overrides everything else related to git.

- **MUST NOT** run `git commit`, `git push`, `git rebase`, `git merge`, or open PRs — **ever** — unless the user explicitly asks for that single instance.
- **MUST NOT** stage or stage-touch files. Leave the working tree uncommitted for the user to review.
- **MUST NOT** enforce or suggest conventional-commit prefixes (`feat:`, `fix:`, …), branch naming (`feat/*`, `fix/*`), PR checklists, or merge gates.
- **MUST NOT** set up CI, commit hooks, or versioning automation.
- When a task is done, the user commits manually. Do not block on, or wait for, any version-control activity.

---

## 1. PROJECT IDENTITY (🔒 LOCKED)

- **Name:** Synapse — Contextual Active Recall Canvas.
- **Purpose:** Hierarchical outliner on an infinite canvas for progressive disclosure + active recall. Built for medical students.
- **Core loop (MUST never break):** Build topic tree → Collapse All → Recall from memory → Expand to verify → Tag weak items → See the heat-map.
- **Principles:** Local-first. Lightweight. No backend. No accounts. No cloud.

**MUST NOT** add auth, cloud sync, server dependency, or any remote service. If requested, refuse and propose a local-first alternative.

---

## 2. TECH STACK (🔒 LOCKED)

| Layer | Allowed | Rule |
|---|---|---|
| Framework | Next.js 13+ App Router (`next` 14.x) | Routing only via `src/app/` |
| Language | TypeScript, `strict: true` | All code `.ts`/`.tsx`; strict mode MUST stay on |
| State | Zustand (`4.5.5`) | The only state library |
| Persistence | Browser `localStorage` (V1) | Only through `src/lib/persistence.ts` |
| Backend | **NONE** | `src/app/api/` MUST never exist; no database, no server |
| Node storage | Flat `Record<string, Node>` | Never nested trees, never array-of-children |

**MUST NOT install any of:** `express, fastify, koa, @prisma/client, prisma, mongoose, mongodb, pg, mysql2, drizzle-orm, supabase, firebase, @supabase/supabase-js, next-auth, lucia, redux, @reduxjs/toolkit, jotai, valtio, mobx, recoil`.

**MUST NOT** introduce any new framework, database, state library, or backend service without explicit user approval.

---

## 3. DATA MODEL (🔒 LOCKED FOR V1)

```ts
type NodeStatus = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;                    // UUID
  content: string;               // Plain text only in V1
  parentId: string | null;       // null = root node
  position: { x: number; y: number };  // world space
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
1. **MUST NOT** add/remove/rename any `Node`/`Canvas` field without: (a) `schemaVersion` bump, (b) migration in `persistence.ts` `loadCanvas()` that runs before render, (c) update to `ARCHITECTURE_v1.md` §10.
2. **MUST NOT** silently discard or lose valid user data when the model evolves. Corrupt data → fresh canvas; valid old data must survive.
3. `content` stays **plain text** until an explicit V2 decision approves markdown/rich text.
4. `nodes` MUST remain a flat dictionary; hierarchy derived via `parentId`.
5. Existing local extensions already in the codebase (themes/tints, canvas index/folder shapes, portability shapes) are permitted, but every new persisted shape still obeys rule 1.

---

## 4. PLACEMENT MAP — WHERE EVERY CHANGE GOES

| Change requested | Mandatory location |
|---|---|
| Route / page | `src/app/` (App Router; no `api/` directory) |
| Visual styles | `src/app/globals.css` |
| Canvas interaction | `src/components/Canvas/` and/or `src/hooks/` |
| Business rule / tree calculation | `src/lib/operations/` (pure functions, tested) |
| Node/canvas data shape | `src/lib/types.ts` → then persistence migration |
| Storage | `src/lib/persistence.ts` |
| Reusable control | `src/components/ui/` |
| Regression test | `tests/` |

Layering rules:
- **MUST** keep domain logic out of components.
- **MUST NOT** import React/Next modules inside `src/lib/` (framework-independent).
- **MUST NOT** put persistence calls in components; go through `persistence.ts`.
- **MUST NOT** create `src/app/api/` under any circumstance.

---

## 5. DOMAIN INVARIANTS (MUST hold after every change)

1. **Hierarchy:** `parentId: null` = root. Children derived by filtering the flat record.
2. **Visibility:** Render only nodes whose ancestors are ALL expanded. `visibleOrder()` is the single source of truth; a collapsed ancestor hides the entire subtree.
3. **Delete:** Cascading — deletes the node + all descendants, each exactly once.
4. **Status cycle:** `none → failed → review → mastered → none`.
5. **Heat-map / summaries:** Direct children only — never grandchildren or deeper.
6. **Coordinates:** World space. Viewport applies `translate(x, y) scale(zoom)`. Children at `x = parent.x + 320`; siblings stacked with defined vertical gap.
7. **State ownership:** Canonical state → `useCanvasStore` (Zustand); gesture state → local `Canvas.tsx`; draft text → local `Node.tsx`; persistence → `persistence.ts` (~400 ms debounced).
8. **Editing:** Save on blur or Enter; Escape cancels. `editingId`/`justCreatedId` live in the store.

---

## 6. MANDATORY VALIDATION — REQUIRED BEFORE REPORTING ANY TASK DONE

Run all three; fix any failure before declaring completion:

```bash
node scripts/guardian.mjs   # shield validator — locked-rule compliance
npm run build               # TypeScript strict + Next production compile
npm test                    # vitest unit tests
```

Additionally, **MUST** manually verify every interaction touched by the change: create, edit, status cycle, collapse/expand, drag, zoom/pan, delete, reload-restore. UI changes **MUST** work at desktop and narrow widths. New pure logic **MUST** ship with a unit test in the same change. **MUST NOT** delete or weaken existing tests to make a change pass.

---

## 7. UI/UX SKILLS — MANDATORY USE (binding)

> The repository ships a skills collection under `skills/` (see `skills/AGENTS.md`) for building great product interfaces. These skills MUST be used strictly for any UI/UX-related change.

- **MUST** load and follow the relevant skill(s) from `skills/` before making any UI/UX change: visual styles, components, layout, typography, colors, accessibility, or interface copy.
- **MUST** apply the skills within the existing styling system (plain CSS in `src/app/globals.css`); do not impose a new styling framework.
- **MUST** use `better-interface` for cross-discipline review of UI/UX work; it routes to the domain skills.
- **MUST** use the domain skills as applicable:
  - `better-accessibility` — semantic HTML, keyboard/focus behavior, accessible names, forms, assistive technology
  - `better-layout` — spatial grouping, alignment, spacing, responsive structure, logical CSS properties
  - `better-writing` — source wording, terminology, voice, tone, labels, errors, empty-state copy
  - `better-typography` — visual text rendering, type systems, font behavior, wrapping, punctuation
  - `better-colors` — palette structure, color tokens, contrast measurement, color remediation
  - `better-ui` — optional visual polish: surfaces, icons, motion aesthetics
- **MUST NOT** skip the skills for UI/UX changes; a UI/UX change without the skill review is a violation.
- `interface-review` is user-invoked only — the agent MUST NOT auto-invoke it; if a change-scoped review is wanted, ask the user to run it.

---

## 8. PERSISTENCE & MIGRATION (binding)

- Storage key format: `synapse:v1:canvas:<id>` — loaded/saved only via `src/lib/persistence.ts`.
- On load, migrate older schema versions forward before rendering.
- Save is debounced ~400 ms and MUST be lossless for supported data.
- Import/export, if used, MUST validate at a single boundary in `src/lib/`, not ad hoc in components.

---

## 9. TESTING (binding priorities)

1. **Unit (REQUIRED for new pure logic)** under `tests/`: hierarchy (collapsed hides descendants, delete hits each descendant once, deterministic `createdAt` ordering), status (direct children only), nodes (defaults), persistence (corrupt data → fresh canvas, no crash). See §5 minimum cases.
2. **Component** (React Testing Library + JSDOM): inline edit, status cycling, toolbar.
3. **E2E** (Playwright): create root → enter text → add child → change status → collapse/expand → reload → restored.

**MUST NOT** delete or weaken existing tests to make a change pass.

---

## 10. APPROVED EVOLUTION DIRECTIONS (pre-approved refactors only)

1. Extract viewport gestures into `src/hooks/useViewport.ts`.
2. Isolate SVG connectors into `CanvasEdges.tsx`.
3. Storage-adapter interface behind `persistence.ts` (still localStorage underneath).
4. Add `schemaVersion` before changing persisted shapes.
5. Replace browser `confirm()` with an accessible modal.
6. Add canvas index/list page on the existing `/canvas/[id]` route.
7. Add JSON export/import with the migration boundary.

Anything else is scope expansion and requires an explicit user request.

---

## 11. CONFLICT RESOLUTION PROTOCOL

1. Request conflicts with a 🔒 LOCKED rule → **STOP. Do not edit anything.**
2. Explain the exact rule being violated and why the request breaks it.
3. Ask for explicit approval: `OVERRIDE: <reason>`.
4. Proceed only after explicit approval; record the override in `SYNAPSE_GUARDIAN.md` / `.synapse-guardian.json`.
5. No silent compromises. No scope creep, no drive-by refactors, no new dependencies, no renames of unrelated files.

---

## 12. COMPLETION CHECKLIST

- [ ] No LOCKED rule touched (or explicit override recorded)
- [ ] Change placed per §4 map; domain logic kept out of components
- [ ] Data model unchanged, or schemaVersion + migration + doc updated
- [ ] All §5 invariants preserved
- [ ] `node scripts/guardian.mjs` · `npm run build` · `npm test` — all pass
- [ ] New pure logic has tests; no existing test weakened
- [ ] UI/UX changes followed the `skills/` collection (`better-interface` + applicable domain skills)
- [ ] No new dependencies; no `src/app/api/`; no backend/auth/cloud
- [ ] No git commit/push/rebase/branch/PR action performed (user commits manually)
