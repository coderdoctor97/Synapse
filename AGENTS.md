# 🛡️ AGENTS.md — Synapse Built-in Shield

> **This file is the built-in shield for Synapse. It is auto-loaded into every agent session.**
> It merges `PROJECT_RULES.md` (single source of truth) + `ARCHITECTURE_v1.md` (build map)
> into one enforceable contract, backed by `SYNAPSE_GUARDIAN.md` and `scripts/guardian.mjs`.
> **The authoritative strict rule set is `SYNAPSE_STRICT_RULES.md` — read it before every change.**
> **Strictly follow this file on every change. If a request conflicts with anything marked LOCKED, STOP and ask — never improvise.**

---

## 0. MANDATORY PRE-CHANGE RITUAL (every task, every edit)

1. Read this file. If context was truncated, re-read it.
2. Read `SYNAPSE_STRICT_RULES.md` — the single authoritative strict rule set (identity, tech stack, data model, placement map, invariants, validation, commit rule, UI/UX skills).
3. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — they are the source documents this shield is built from.
4. **Deny-by-default:** anything marked `LOCKED` cannot be changed without explicit user approval + a migration strategy.
5. If a user request conflicts with a LOCKED rule → **STOP, explain, and ask for `OVERRIDE: <reason>`** before doing anything.
6. Keep every change inside the architecture map (§4). No scope creep, no new frameworks, no backend.
7. For any UI/UX change, load and follow the relevant skill(s) from `skills/` (see `SYNAPSE_STRICT_RULES.md` §7).

---

## 1. PROJECT IDENTITY — LOCKED

- **Name:** Synapse — Contextual Active Recall Canvas
- **Purpose:** Hierarchical outliner on an infinite canvas for progressive disclosure + active recall. Built for medical students.
- **Core loop (never break):** Build topic tree → Collapse All → Recall from memory → Expand to verify → Tag weak items → See the heat-map.
- **Principles:** Local-first. Lightweight. No backend. No accounts. No cloud.

**Shield rule:** Any feature adding auth, cloud sync, or a server dependency is REJECTED unless the user explicitly says `OVERRIDE: cloud-approved`.

---

## 2. TECH STACK — LOCKED (no exceptions)

| Layer | Choice | Enforcement |
|---|---|---|
| Framework | Next.js 13+ App Router | Keep `next` 14.x in `package.json`; routing only via `src/app/` |
| Language | TypeScript (strict) | All code `.ts`/`.tsx`; `tsconfig.json` `strict: true` stays |
| State | Zustand 4.5.5 | No Redux, Jotai, MobX, Recoil, Valtio, or replacement |
| Persistence | localStorage (V1) | Only `src/lib/persistence.ts`; key `synapse:v1:canvas:<id>` |
| Backend | **NONE** | `src/app/api/` must NOT exist. No express/prisma/mongoose/drizzle/supabase/firebase |
| Node storage | Flat `Record<string, Node>` | Never nested trees, never array-of-children |

**Banned dependencies (never `npm install` these):**
`express, fastify, koa, @prisma/client, prisma, mongoose, mongodb, pg, mysql2, drizzle-orm, supabase, firebase, @supabase/supabase-js, next-auth, lucia, redux, @reduxjs/toolkit, jotai, valtio, mobx, recoil`

If the user asks for one: explain the LOCKED rule and propose a local-first alternative instead of installing it.

---

## 3. DATA MODEL — LOCKED FOR V1 (changes require migration)

```ts
type Status = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;                  // UUID
  content: string;             // Plain text ONLY in V1 — no markdown/rich text
  parentId: string | null;     // null = root node
  position: { x: number; y: number };   // world space
  status: Status;
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

**Shield rules:**
1. Adding/removing/renaming any `Node` field requires: schemaVersion bump → migration in `persistence.ts` `loadCanvas()` → ARCHITECTURE_v1.md §10 update. **Never silently discard old user data.**
2. `content` stays plain text until V2 explicitly approves markdown.
3. `nodes` stays a flat dictionary; hierarchy is derived via `parentId`.
4. Existing extensions already in the codebase (`tint`, themes, `CanvasIndex`/`Folder`/`PageMeta`, `PortableCanvas`) are allowed — but each new shape change still needs the migration rule.

---

## 4. ARCHITECTURE MAP — where to make changes

```
synapse/
├── src/app/                          # Routing + shell ONLY (no API routes)
│   ├── layout.tsx                    # Root HTML shell, global CSS
│   ├── page.tsx                      # → redirect /canvas/default
│   └── canvas/[id]/page.tsx          # Dynamic canvas route
├── src/components/Canvas/            # Canvas interactions (Canvas, Node, Toolbar, panels)
├── src/components/Sidebar/           # Sidebar navigation
├── src/components/ui/                # Reusable primitives (Button, StatusBadge)
├── src/lib/                          # Framework-independent domain layer
│   ├── types.ts                      # Data shapes + constants
│   ├── store.ts                      # Zustand store + commands + seed
│   ├── persistence.ts                # localStorage boundary + migrations
│   ├── portability.ts                # Import/export boundary
│   ├── theme.ts                      # Theme system
│   └── operations/                   # Pure business logic (nodes, hierarchy, status, library)
├── src/hooks/                        # Reusable UI hooks
└── tests/                            # Vitest unit tests
```

| Change requested | Primary location |
|---|---|
| Route/page | `src/app/` (App Router, no api routes) |
| Visual styles | `src/app/globals.css` |
| Canvas interaction | `src/components/Canvas/` + `src/hooks/` |
| Business rule | `src/lib/operations/` (pure logic, tests first) |
| Node/canvas shape | `src/lib/types.ts` → then persistence migration |
| Storage | `src/lib/persistence.ts` |
| Reusable control | `src/components/ui/` |
| Regression test | `tests/` |

**Shield rule:** Keep domain logic out of components. Tree calculations → `src/lib/operations/`; storage → `src/lib/`; UI → `src/components/`; routing → `src/app/`.

---

## 5. DOMAIN INVARIANTS — never break

1. **Hierarchy:** `parentId: null` = root. Children derived by filtering the flat record.
2. **Visibility:** Only nodes whose ancestors are ALL expanded render — `visibleOrder()` is the source of truth. A collapsed ancestor hides the whole subtree.
3. **Delete:** Cascading — delete the node + all descendants, each exactly once.
4. **Status cycle:** `none → failed → review → mastered → none` (`STATUS_ORDER`).
5. **Heat-map:** `statusSummary()` aggregates **direct children only**, never grandchildren.
6. **Coordinates:** World space. Viewport applies `translate(x, y) scale(zoom)`. Children at `x = parent.x + 320`; siblings stacked with `VERTICAL_GAP` + node height.
7. **State ownership:** canonical state in `useCanvasStore` (Zustand); ephemeral gesture state in `Canvas.tsx`; draft text in `Node.tsx`; persistence in `persistence.ts` (debounced ~400 ms).
8. **Editing:** Save on blur or Enter; Escape cancels. `editingId`/`justCreatedId` in store.

---

## 6. MANDATORY VALIDATION — before you finish ANY task

Run all three. If any fails, fix it before reporting done:

```bash
node scripts/guardian.mjs   # shield validator — locked-rule compliance
npm run build               # TypeScript + Next production compile
npm test                    # vitest unit tests
```

Also verify the affected interaction manually when relevant (create, edit, status cycle, collapse/expand, drag, zoom/pan, delete, reload-restore). UI/UX changes MUST follow the `skills/` collection (`better-interface` + applicable domain skills) per `SYNAPSE_STRICT_RULES.md` §7.

---

## 7. COMMITS — EXCLUDED FROM THIS SHIELD (user handles manually)

> The user commits manually. This shield does **NOT** enforce anything commit-related.

- **Never** run `git commit`, `git push`, `git rebase`, or open PRs on the user's behalf.
- **Never** suggest or enforce conventional-commit prefixes, branch naming (`feat/*`, `fix/*`), or PR checklists.
- Do not stage or stage-touch files; leave the working tree for the user to review and commit.
- The user may still *ask* you to commit on a case-by-case basis — follow that explicit instruction only then.

---

## 8. TESTING — REQUIRED

- **Unit tests (highest priority):** pure logic under `tests/` — hierarchy (collapse hides descendants, delete hits each descendant once, deterministic `createdAt` ordering), status (direct children only), persistence (corrupt data → fresh canvas, never crash), library.
- **Component tests (next):** React Testing Library + JSDOM — inline edit, status cycling, toolbar.
- **E2E (release confidence):** Playwright — create root → enter text → add child → change status → collapse/expand → reload → restored from localStorage.

---

## 9. CONFLICT RESOLUTION

- Any conflict with a LOCKED rule → **STOP, explain, ask for `OVERRIDE: <reason>`**.
- Example: "You asked for Firebase, but PROJECT_RULES.md §2 says Backend NONE. Do you want `OVERRIDE: backend-approved`, or should I build a localStorage adapter instead?"
- Log approved overrides in `SYNAPSE_GUARDIAN.md` / `.synapse-guardian.json`.

---

**Shield active. Sources: `SYNAPSE_STRICT_RULES.md` (authoritative strict rules), `PROJECT_RULES.md` (authoritative), `ARCHITECTURE_v1.md`, `SYNAPSE_GUARDIAN.md`, validated by `scripts/guardian.mjs`.**
