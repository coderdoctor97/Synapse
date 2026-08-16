# TASK V2-11 — Sidebar UI: Folders → Pages (Phase V2.4)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The load-by-id capability (1) must work before any UI is built.
> Requires: V2-10 complete and committed (index types, persistence, library operations).

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §2 (runtime flow & state
   ownership) and §9 (canvas index/list page).
2. Read `src/lib/store.ts`, `src/lib/persistence.ts`, `src/lib/operations/library.ts`, and
   `src/lib/types.ts` to see the V2-10 index model (`CanvasIndex`, `Folder`, `PageMeta`),
   `loadIndex`/`saveIndex`, and the pure library operations.
3. Read `src/app/page.tsx`, `src/app/canvas/[id]/page.tsx`, and `src/app/layout.tsx` to see
   the current routing and how the canvas is loaded/rendered today.
4. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

A OneNote-style sidebar: a folder list that expands to reveal pages, plus an unorganized
"Pages" group. Clicking a page navigates to it (`/canvas/<pageId>`). Includes a toggle to
open/close the panel and minimal "New folder / New page" so it is usable and testable.

OUT OF SCOPE (V2-12): rename, delete, move/reorder of folders and pages.
OUT OF SCOPE: drag-and-drop in the sidebar, nested-folder deep UI, multi-window.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Sidebar placement | NEW nested layout `src/app/canvas/layout.tsx` rendering `<Sidebar />` + `{children}` in a flex row. Persists across `/canvas/*` navigation; does NOT affect `/` |
| Sidebar sections | A "Folders" group (expandable) and a "Pages" group for unorganized pages (`folderId === null`, always visible) |
| Folder behavior | Click to expand/collapse (local UI state). Auto-expand the folder containing the active page |
| Page behavior | Click navigates to `/canvas/<pageId>`. Active page highlighted |
| Active page source of truth | The ROUTE (`usePathname`). No `activePageId` field added to the store |
| Store library slice | Add to `useCanvasStore`: `index`, `sidebarOpen`, and actions `loadIndex()`, `openPage(id)`, `setSidebarOpen(open)`, plus `addFolder(name)` / `addPage(name, folderId)` in subtask 3 |
| Load-by-id + seeding | NEW `loadOrCreateCanvas(id)`: if saved → load; else if `id === 'default'` → seed sample tree; else → empty canvas. Preserves existing default behavior |
| Navigation | Sidebar page click → `router.push('/canvas/<id>')`; the `[id]` route runs `openPage(id)` on mount/param change |
| Unknown page id | Redirect to `/canvas/default` |
| Toggle state | `sidebarOpen` is ephemeral store state (default open), NOT persisted |
| Create scope | V2-11 adds minimal New folder / New page only. Rename/delete/move are V2-12 |

---

## 3. Subtasks

---

### SUBTASK V2-11.1 — Store library slice + load-by-id (no UI)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-11, subtask 1 of 5. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` §2 first. No UI in this subtask.
>
> **Goal:** Make the store able to hold the library index and load any canvas by id.
>
> **Steps:**
> 1. In `src/lib/persistence.ts`, add `loadOrCreateCanvas(id: string): Canvas`:
>    - If a saved canvas exists for `id` (use the existing raw reader), return it.
>    - Else if `id === 'default'`, return the seeded sample canvas (preserve the existing seed).
>    - Else return an EMPTY canvas `{ id, name: 'Untitled', nodes: {}, viewport: {x:0,y:0,zoom:1}, createdAt/updatedAt: now }`.
>    Do not change the storage key or the debounced save.
> 2. In `src/lib/store.ts`, ADD (do not rewrite existing node actions):
>    - State: `index: CanvasIndex | null` (default null), `sidebarOpen: boolean` (default true).
>    - `loadIndex()`: if `index` is null, set it from `persistence.loadIndex()`. Idempotent.
>    - `openPage(id: string)`: call `loadIndex()`, then load `loadOrCreateCanvas(id)` and set it as the active canvas (so `canvas.id === id`). Keep the existing debounced save behavior.
>    - `setSidebarOpen(open: boolean)`.
>    - Keep the EXISTING initial default-canvas load working for now; `openPage` is an additional entry point. Do not remove current behavior yet.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts`, `src/lib/persistence.ts`.
> - LOCKED: operations/*, all components, all pages, layout files, globals.css, types.ts.
> - No new dependencies. No `console.log`. No UI.
>
> **Definition of done:** `npm run build` passes. The app behaves exactly as before. List every change.

**Human test:**
- [ ] `npm run build` passes; app opens and existing default canvas loads normally
- [ ] Console: `openPage('default')` loads the existing canvas (no reseed, no data loss)
- [ ] Console: `openPage('some-new-id')` yields an empty canvas with that id
- [ ] Existing edit/status/collapse/persist behavior unchanged
- [ ] Commit: `feat(sidebar): add library index state and load-canvas-by-id`

---

### SUBTASK V2-11.2 — Sidebar shell, rendering, and navigation

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-11, subtask 2 of 5. Subtask 1 is complete (store has `index`, `openPage`, `setSidebarOpen`; persistence has `loadOrCreateCanvas`).
>
> **Goal:** Render a OneNote-style sidebar and make page clicks navigate.
>
> **Steps:**
> 1. Create `src/app/canvas/layout.tsx` (client) that renders `<Sidebar />` and `{children}` in a horizontal flex layout (sidebar on the left, canvas filling the rest). This layout applies to all `/canvas/*` routes.
> 2. Create `src/components/Sidebar/Sidebar.tsx`:
>    - On mount, call `loadIndex()`. Read `index` and `sidebarOpen` from the store with selectors.
>    - Render a "Folders" group: each folder row toggles expand/collapse on click (local state). When expanded, list that folder's pages (from `getPagesInFolder`). Auto-expand the folder containing the active page.
>    - Render a "Pages" group listing unorganized pages (`getPagesInFolder(index, null)`).
>    - Each page row navigates on click: `router.push('/canvas/' + page.id)`.
>    - Highlight the active page by comparing `page.id` to the id parsed from `usePathname()`.
>    - A toggle button collapses/expands the whole sidebar via `setSidebarOpen`.
>    - Order folders and pages by `createdAt` (use the existing sorted queries).
> 3. Update `src/app/canvas/[id]/page.tsx` to be the route driver: read the `id` param, and in an effect call `openPage(id)` on mount and when `id` changes. If `id` is not in the index and is not `'default'`, `router.replace('/canvas/default')`. Render `<Canvas />`.
> 4. APPEND sidebar styles to `src/app/globals.css` prefixed `sidebar-`. Use existing tokens only.
>
> **Rules:**
> - You may ONLY touch: `src/app/canvas/layout.tsx` (new), `src/components/Sidebar/Sidebar.tsx` (new), `src/app/canvas/[id]/page.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, Canvas.tsx, Node.tsx, Toolbar.tsx, HelpPanel.tsx, HeatmapPanel.tsx, `src/app/page.tsx`, `src/app/layout.tsx`.
> - Do not add create/rename/delete yet. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. The sidebar shows the default page; clicking it navigates; the toggle opens/closes the panel. List every change.

**Human test:**
- [ ] Sidebar appears on the left; canvas fills the remaining space
- [ ] The default page is listed and highlighted at `/canvas/default`
- [ ] Toggle collapses/expands the sidebar; canvas resizes cleanly
- [ ] Navigating directly to `/canvas/default` loads the canvas
- [ ] Existing canvas interactions unaffected
- [ ] Commit: `feat(sidebar): add sidebar shell with folder/page list and navigation`

---

### SUBTASK V2-11.3 — Minimal creation (New folder / New page)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-11, subtask 3 of 5. Subtasks 1–2 are complete. Add just enough creation to make the sidebar usable. Rename/delete/move stay in V2-12.
>
> **Goal:** Add "New folder" and "New page" using the existing pure operations.
>
> **Steps:**
> 1. In `src/lib/store.ts`, add command actions:
>    - `addFolder(name: string)`: use `createFolder` from operations, then `saveIndex`, and update `index`.
>    - `addPage(name: string, folderId: string | null)`: use `createPageMeta`, then `saveIndex`, update `index`, and return the new page id.
>    Do not implement rename/delete/move.
> 2. In `Sidebar.tsx`, add a "New folder" button (creates a top-level folder) and a "New page" button (creates an unorganized page). After creating a page, navigate to it (`router.push('/canvas/' + id)`), which loads an empty canvas via `openPage`.
>    - Use a lightweight inline input or prompt pattern consistent with existing UI; keep it simple. Default names like "New folder" / "Untitled" are acceptable.
>    - Use `e.stopPropagation()` so buttons don't trigger row navigation.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts` (the two new actions), `src/components/Sidebar/Sidebar.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: persistence.ts, operations/*, all pages, Canvas.tsx, other components.
> - No rename/delete/move. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Creating a folder/page updates the sidebar and the index persists on refresh. List every change.

**Human test:**
- [ ] "New folder" adds a folder to the list; persists on refresh
- [ ] "New page" creates a page and navigates to an EMPTY canvas (no sample tree)
- [ ] The new page's canvas persists edits on refresh
- [ ] The default canvas is unchanged and still loads
- [ ] Commit: `feat(sidebar): add minimal new-folder and new-page creation`

---

### SUBTASK V2-11.4 — Empty states, unknown-id, responsive polish

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-11, subtask 4 of 5. Subtasks 1–3 are complete.
>
> **Goal:** Harden the sidebar against empty and edge states.
>
> **Steps:**
> 1. Empty states: when there are no folders, show a subtle "No folders yet" hint; when a folder has no pages, show "No pages." When there are no unorganized pages, hide or soften the Pages group appropriately.
> 2. Unknown page id: confirm `/canvas/<unknown>` redirects to `/canvas/default` safely.
> 3. Navigation robustness: browser back/forward between pages loads the correct canvas; direct URL access works.
> 4. Responsive: at narrow widths (~380px) the sidebar can be toggled closed and does not trap the canvas; text truncates cleanly.
>
> **Rules:**
> - You may ONLY touch: `src/components/Sidebar/Sidebar.tsx`, `src/app/canvas/[id]/page.tsx`, `src/app/globals.css`.
> - LOCKED: all of `src/lib/*`, Canvas.tsx, other components, `src/app/page.tsx`.
> - Fix only real defects; no restyling beyond these needs. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Empty/unknown/narrow cases behave gracefully. List every change.

**Human test:**
- [ ] Empty folder/page states render without breaking layout
- [ ] `/canvas/does-not-exist` redirects to default
- [ ] Back/forward and direct URLs load the right canvas
- [ ] At ~380px the sidebar toggles away and the canvas is usable
- [ ] Commit: `feat(sidebar): empty states, unknown-id redirect, responsive polish`

---

### SUBTASK V2-11.5 — Help docs + regression + final acceptance

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-11, subtask 5 of 5 (final). Subtasks 1–4 are complete.
>
> **Goal:** Document the sidebar and verify nothing regressed.
>
> **Steps:**
> 1. In `HelpPanel.tsx`, add a short section or bullets, exact copy:
>    `- The sidebar lists your folders and pages. Click a page to open it.`
>    `- Use New folder and New page to organize your canvas into pages.`
>    Change nothing else in HelpPanel.
> 2. Verification pass (fix only real defects): sidebar + canvas coexist without overlap; active page highlight tracks the URL; creating a page never seeds the sample tree.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/HelpPanel.tsx`, and ONLY if a real defect is found `src/components/Sidebar/Sidebar.tsx` / `src/app/globals.css` (minimal fix).
> - LOCKED: all of `src/lib/*`, all pages except the defect fix, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Help documents the sidebar; all regressions clear. List every change.

**Human test:**
- [ ] Help modal shows the new sidebar copy
- [ ] Full flow: create folder → create page in it → open it → edit → refresh → intact
- [ ] Commit: `feat(sidebar): document sidebar and verify regressions`

---

## 4. Final Acceptance Checklist (all must pass)

**Sidebar**
- [ ] Folder list expands/collapses to reveal pages; unorganized pages always listed
- [ ] Page click navigates to `/canvas/<pageId>`; active page highlighted from the URL
- [ ] Toggle opens/closes the sidebar; persists across page switches (via nested layout)
- [ ] New folder / New page work and persist; new pages start EMPTY (no sample tree)

**Routing & data**
- [ ] `openPage(id)` loads the correct canvas; unknown id redirects to default
- [ ] Back/forward and direct URLs work
- [ ] Index persists under `synapse:v1:index`; canvas data still per-canvas
- [ ] Existing default canvas loads unchanged; no reseed, no data loss

**UX**
- [ ] Empty/unknown/narrow cases graceful; usable at ~380px
- [ ] No rename/delete/move yet (that is V2-12)
- [ ] No new dependencies; `npm run build` passes

## 5. V1 Regression Checklist (mandatory after this task)

- [ ] Create a child node with `+` → appears indented under parent
- [ ] New node auto-enters edit mode; Enter saves, Shift+Enter newline, Escape cancels
- [ ] Chevron collapses/expands ONE branch only; Collapse All / Expand All work
- [ ] Status dot cycles none → failed → review → mastered → none
- [ ] Collapsed parent shows heat-map chips of direct children
- [ ] Heatmap full/mini/hidden persists (V2-01); Help modal works (V2-02)
- [ ] Light/dark + custom themes work (V2-05/06); node tints work (V2-07)
- [ ] Export/import round-trip still works (V2-08/09)
- [ ] Drag handle moves a node; position persists after refresh
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- Existing default canvas resets/reseeds after load-by-id → `git checkout .` → re-prompt subtask 1: "Seed only when id==='default' and no saved canvas; never reseed an existing canvas."
- Sidebar resets on every page switch → it was placed inside a page, not `canvas/layout.tsx`; re-prompt subtask 2.
- New page shows the sample tree → seeding rule is wrong; re-prompt subtask 1/2 so only `default` seeds.
- Clicking a page doesn't navigate → verify `router.push` + the `[id]` effect calls `openPage(id)`.
- Unknown id shows a blank canvas → re-prompt subtask 4: "Unknown ids must redirect to /canvas/default."

## 7. Handoff

This makes the V2-10 model visible and activates the `[id]` route.
Suggested tag: `git tag v2.7.0-sidebar`.

Re-scoped next step (was "page create/rename/delete"):
- **V2-12 — Page & folder management**: rename, delete (with confirm + automatic backup of the
  canvas being deleted, reusing the V2-09 safety pattern), and move pages between folders.
  Creation already shipped here in V2-11.

Deferred on purpose: sidebar drag-and-drop reorder, deep nested-folder breadcrumbs, exporting
the whole library, multi-window editing of two pages at once.
