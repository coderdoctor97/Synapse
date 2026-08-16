# TASK V2-12 — Page & Folder Management: Rename / Delete (Phase V2.4)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The data layer (1) must exist before any destructive UI is built.
> Requires: V2-11 complete and committed (sidebar renders + navigates + can create).

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §9 (export/import) and
   §10 (persistence migration rule).
2. Read `src/lib/store.ts`, `src/lib/persistence.ts`, `src/lib/operations/library.ts`, and
   `src/components/Sidebar/Sidebar.tsx` to see the V2-11 sidebar, the index actions
   (`addFolder`, `addPage`, `openPage`), and the existing pure operations
   (`renamePage`, `renameFolder`, `deletePageMeta`, `deleteFolder`).
3. Read `src/lib/portability.ts` to reuse `serializeCanvas` for the pre-delete backup.
4. Read how the existing confirmation modal is implemented (node delete / import) so the
   delete confirmations match it.
5. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

Let users rename and delete folders and pages in the sidebar.

- Rename page / rename folder.
- Delete page: confirm + automatic backup download + remove the page AND its canvas data.
  Cascades ONLY within that page.
- Delete folder: confirm + reparent its contents upward. NEVER deletes a page.
- The `default` page can be renamed but NEVER deleted.

Create already shipped in V2-11. Move/reorder is OUT of scope here.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Delete page semantics | Destructive. Requires confirm. Downloads a backup of the page's canvas first (if ≥1 node), then removes page metadata + canvas data. Cascades only within that page |
| Delete folder semantics | Non-destructive. Requires confirm. Reparents pages/subfolders upward via the existing `deleteFolder` operation. NEVER deletes a page |
| Default page | Can be renamed; can NEVER be deleted. Hide/disable its delete affordance |
| Backup format | Reuse `serializeCanvas` → `<page-name>-backup-<timestamp>.synapse.json` (restorable via Import) |
| Rename scope | Updates `PageMeta.name` in the index AND the stored canvas `name` (so export filenames stay consistent), via a new `updateCanvasName` persistence helper |
| Canvas data deletion | NEW `deleteCanvasData(id)` removes only `synapse:v1:canvas:<id>`. Never touches the index key or other canvas keys |
| After deleting the active page | Redirect to `/canvas/default` |
| Confirmation UI | Reuse the existing confirmation-modal pattern (node delete / import), not `window.confirm` |
| Move/reorder | OUT of scope (deferred) |

---

## 3. Subtasks

---

### SUBTASK V2-12.1 — Data layer (no UI)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-12, subtask 1 of 4. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` §10 first. Data layer only — no components.
>
> **Goal:** Add the persistence and store capabilities needed for rename and delete.
>
> **Steps:**
> 1. In `src/lib/persistence.ts`, add:
>    - `deleteCanvasData(id: string): void` — removes ONLY the `synapse:v1:canvas:<id>` key. Wrapped in try/catch. Must not touch the index key or other canvas keys.
>    - `updateCanvasName(id: string, name: string): void` — reads the stored canvas for `id` (via the raw reader); if it exists, sets `name` and saves it back; if it does not exist, do nothing. Wrapped in try/catch.
> 2. In `src/lib/store.ts`, add command actions using the EXISTING pure operations from `operations/library.ts` and `saveIndex`:
>    - `renamePage(id: string, name: string)` — `renamePage` op + `saveIndex` + `updateCanvasName(id, name)`.
>    - `renameFolder(id: string, name: string)` — `renameFolder` op + `saveIndex`.
>    - `deletePage(id: string)` — `deletePageMeta` op + `saveIndex` + `deleteCanvasData(id)`. Guard: if `id === 'default'`, do nothing.
>    - `deleteFolder(id: string)` — `deleteFolder` op (reparents contents) + `saveIndex`.
>    Do not implement backup download here (that is UI in subtask 3).
>
> **Rules:**
> - You may ONLY touch: `src/lib/persistence.ts`, `src/lib/store.ts`.
> - LOCKED: operations/*, all components, all pages, types.ts, globals.css.
> - No new dependencies. No `console.log`. No UI.
>
> **Definition of done:** `npm run build` passes. The app behaves exactly as before. List every change.

**Human test:**
- [ ] `npm run build` passes; app and sidebar unchanged
- [ ] Console: `renamePage(<id>, 'New name')` updates the sidebar label and persists on refresh
- [ ] Console: `deletePage(<non-default-id>)` removes the page and its canvas key; other pages intact
- [ ] Console: `deletePage('default')` does nothing
- [ ] Console: `deleteFolder(<id>)` moves its pages up; no page deleted
- [ ] Commit: `feat(pages): add rename/delete store actions and canvas-data deletion`

---

### SUBTASK V2-12.2 — Rename UI (page + folder)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-12, subtask 2 of 4. Subtask 1 is complete (`renamePage`/`renameFolder` store actions exist). Now the rename UI.
>
> **Goal:** Inline rename for pages and folders in the sidebar.
>
> **Steps:**
> 1. In `Sidebar.tsx`, add a small rename (pencil) affordance on page rows and folder rows, styled like the existing row actions.
> 2. Clicking rename switches that row's label into a text input pre-filled with the current name.
>    - Enter or blur saves via `renamePage`/`renameFolder`.
>    - Escape cancels without saving.
>    - Saving an empty name falls back to the previous name (do not allow empty).
>    - Use `e.stopPropagation()` so renaming does not trigger row navigation or folder toggling.
> 3. Keep all existing sidebar behavior (navigation, expand/collapse, create) intact.
> 4. APPEND styles to `src/app/globals.css` prefixed `sidebar-`. Use existing tokens only.
>
> **Rules:**
> - You may ONLY touch: `src/components/Sidebar/Sidebar.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, all pages, Canvas components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Renaming a page or folder updates the label, persists on refresh, and never navigates. List every change.

**Human test:**
- [ ] Rename a page → label updates, persists on refresh, does not navigate
- [ ] Rename a folder → label updates, persists
- [ ] Escape cancels; empty input keeps old name
- [ ] The renamed page's exported filename reflects the new name (verify via Export)
- [ ] Existing navigation/create still works
- [ ] Commit: `feat(pages): add inline rename for pages and folders`

---

### SUBTASK V2-12.3 — Delete UI (confirm + backup + protection)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-12, subtask 3 of 4. Subtasks 1–2 are complete. Now delete.
>
> **Goal:** Safe deletion for pages and folders.
>
> **Steps:**
> 1. In `Sidebar.tsx`, add a delete (trash) affordance on page rows and folder rows.
>    - For the `default` page: do NOT render a delete affordance (it cannot be deleted).
> 2. Deleting a PAGE:
>    - Open a confirmation modal (reuse the existing modal pattern) stating the page name, that it will be permanently deleted, and that a backup will be downloaded first.
>    - On confirm: if the page's canvas has ≥1 node, download a backup using `serializeCanvas` (read via the raw reader) named `<page-name>-backup-<timestamp>.synapse.json`. Then call `deletePage(id)`. If the deleted page is the current route, `router.replace('/canvas/default')`.
> 3. Deleting a FOLDER:
>    - Open a confirmation modal stating the folder name and that its pages/subfolders will be moved up, NOT deleted.
>    - On confirm: call `deleteFolder(id)`.
>    - Use `e.stopPropagation()` on all delete controls.
>
> **Rules:**
> - You may ONLY touch: `src/components/Sidebar/Sidebar.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, all pages, Canvas components.
> - Never delete a page without confirmation + backup. Never delete pages when deleting a folder. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Page and folder deletion work safely; the default page cannot be deleted. List every change.

**Human test:**
- [ ] Delete a page with nodes → confirm shows, backup downloads, page + its canvas are gone, other pages intact
- [ ] Refresh → deleted page stays gone; other pages unaffected
- [ ] Delete the active page → redirected to `/canvas/default`
- [ ] Delete an empty page (never opened) → no backup download, still confirms, removes cleanly
- [ ] The `default` page has no delete option
- [ ] Delete a folder with pages → confirm says pages will move; pages appear in the parent/root, none deleted
- [ ] Cancel on any confirm → nothing changes
- [ ] Commit: `feat(pages): add safe page and folder deletion`

---

### SUBTASK V2-12.4 — Help docs + regression + final acceptance

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-12, subtask 4 of 4 (final). Subtasks 1–3 are complete.
>
> **Goal:** Document page management and verify nothing regressed.
>
> **Steps:**
> 1. In `HelpPanel.tsx`, add a short section or bullets, exact copy:
>    `- Rename or delete pages and folders from the sidebar.`
>    `- Deleting a page downloads a backup first. Deleting a folder moves its pages up; it never deletes them.`
>    Change nothing else in HelpPanel.
> 2. Verification pass (fix only real defects): rename/delete affordances are reachable at ~380px; confirmations are readable; the default page stays protected.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/HelpPanel.tsx`, and ONLY if a real defect is found `src/components/Sidebar/Sidebar.tsx` / `src/app/globals.css` (minimal fix).
> - LOCKED: all of `src/lib/*`, all pages, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Help documents page management; all regressions clear. List every change.

**Human test:**
- [ ] Help modal shows the new page-management copy
- [ ] Full flow: create folder + page → rename both → delete page (backup) → delete folder (reparent) → refresh intact
- [ ] The imported backup file restores the deleted page via Import
- [ ] Commit: `docs(pages): document page management and verify regressions`

---

## 4. Final Acceptance Checklist (all must pass)

**Rename**
- [ ] Rename page/folder updates the label and persists
- [ ] Renamed page's export filename matches the new name
- [ ] Empty rename falls back to the previous name

**Delete page**
- [ ] Requires confirmation; downloads a backup first when there are nodes
- [ ] Removes the page's metadata AND its canvas data; nothing else touched
- [ ] Deleting the active page redirects to `/canvas/default`
- [ ] `default` page cannot be deleted

**Delete folder**
- [ ] Requires confirmation; reparents contents upward; deletes no pages

**Safety & data**
- [ ] No deletion occurs without confirmation
- [ ] Backups are restorable via Import
- [ ] Index and other canvas keys are never touched by a single-page delete
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
- [ ] Sidebar renders, navigates, creates (V2-11); drag handle moves a node
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- A page delete removed other pages or the index → `git checkout .` → re-prompt subtask 1: "deleteCanvasData must remove only that page's canvas key; deletePage must remove only that page's metadata."
- Folder delete removed pages → reject: "Folder deletion reparents contents upward; it never deletes pages."
- Default page got deleted → re-prompt subtask 1/3: "The default page is protected; guard deletePage and hide its delete affordance."
- No backup before a destructive delete → re-prompt subtask 3: "Page deletion must download a backup first."
- Rename broke the export filename → ensure `updateCanvasName` updates the stored canvas name.

## 7. Handoff

This completes **Phase V2.4 — OneNote-style organization**
(V2-10 data model, V2-11 sidebar + navigation + create, V2-12 rename/delete).
Suggested tag: `git tag v2.8.0-page-management`.

Deferred on purpose:
- Move page between folders / move folder to a new parent (drag or menu)
- Sidebar drag-and-drop reorder
- Duplicating a page
- "Restore backup" UI (backups are restored via Import today)

Next phase is **V2.5 — Shortcuts & history**: a node selection model (prerequisite),
status shortcuts with safe keys (NOT Ctrl+R, which reloads the browser), and Undo/Redo
with a capped history that stays out of the way while editing text.
