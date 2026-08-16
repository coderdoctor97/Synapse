# TASK V2-15 — Undo / Redo (Phase V2.5)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The history core (1) and wiring (2) must be verified via console
> before any keyboard or button UI exists.
> Requires: V2-14 complete and committed.

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §2 (state ownership) and §3
   (domain rules).
2. Read `src/lib/store.ts` carefully. List EVERY action that mutates `canvas.nodes`
   (create, update content/position, delete, set status, toggle, collapse-all, expand-all,
   set tint, and the drag-commit path). Also find `openPage` and the import replace action.
3. Read `src/hooks/useStatusShortcuts.ts` (V2-14) to reuse its guard pattern (editing focus,
   modal detection) and avoid conflicting with it.
4. Read `src/components/Canvas/Toolbar.tsx` to see where undo/redo buttons can live.
5. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

`Ctrl+Z` (or `Cmd+Z`) undoes and `Ctrl+Y` / `Ctrl+Shift+Z` (or Cmd) redoes changes to the
active canvas's node graph, backed by a capped history stack. Also provide undo/redo buttons
in the toolbar. History is transient and never persisted.

Undo/redo covers the NODE GRAPH ONLY. It does NOT cover:
viewport pan/zoom/fit, selection, editing state, sidebar, theme/heatmap settings,
page/folder operations, or canvas import.

OUT OF SCOPE: command/inverse-op pattern, per-page persistent history, undo of viewport,
and "undo grouping" beyond the natural action granularity.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Mechanism | Capped snapshot stack: `past` and `future` arrays of deep-cloned `canvas.nodes` |
| Cap | `MAX_HISTORY = 50`; when exceeded, drop the oldest entry |
| Snapshot content | Deep clone of `canvas.nodes` ONLY. Viewport is NOT included |
| Clone method | `structuredClone` with a `JSON.parse(JSON.stringify(...))` fallback |
| When to record | `recordHistory()` as the FIRST step of every action that mutates `canvas.nodes`. It captures the PRE-mutation state and clears `future` |
| Undo/Redo | Move a snapshot between `past`/`future`, restore `nodes`, clear transient UI (`editingId`, `justCreatedId`, `selectedNodeIds`), and trigger the existing save path |
| Clear history | On `openPage` (page switch), on import/replace, and on initial load/seed. History is per editing session |
| No-op safety | Do not push a snapshot for an action that does not actually mutate (e.g. unknown id) |
| Keyboard | `Ctrl/Cmd+Z` = undo; `Ctrl/Cmd+Y` and `Ctrl/Cmd+Shift+Z` = redo. Always `preventDefault` when handled |
| Keyboard guards | No-op while editing text (`editingId != null` or activeElement is input/textarea/contentEditable), or while a modal is open. Native textarea undo must win while typing |
| Not persisted | History never touches localStorage |
| Relationship to V2-14 | Status shortcuts use plain keys with a "no modifier" guard, so they do not collide with these Ctrl/Cmd chords |

---

## 3. Subtasks

---

### SUBTASK V2-15.1 — History core in the store (no wiring, no UI)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-15, subtask 1 of 5. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` first. Store internals only — do not wire into actions yet, no UI.
>
> **Goal:** Add the history data structure and the undo/redo machinery.
>
> **Steps:**
> 1. In `src/lib/store.ts`, add (adapt names to the real store shape, but preserve semantics):
>    - A `cloneNodes` helper: `structuredClone` with a JSON fallback.
>    - State: `past` and `future` arrays of node snapshots (both default empty). NEVER persist them.
>    - `recordHistory()`: push `cloneNodes` of the CURRENT nodes onto `past`; drop oldest if it exceeds `MAX_HISTORY = 50`; clear `future`.
>    - `undo()`: if `past` is empty, no-op. Otherwise pop the newest snapshot from `past`, push `cloneNodes` of the current nodes onto `future`, restore the popped snapshot as `canvas.nodes`, clear `editingId`/`justCreatedId`/`selectedNodeIds`, and trigger the existing save path.
>    - `redo()`: mirror of undo using `future`.
>    - `clearHistory()`: empty both stacks.
> 2. The snapshot pushed must represent the state BEFORE a mutation. Do not change any existing action yet.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts`.
> - LOCKED: persistence.ts, operations/*, hooks, all components, all pages, globals.css.
> - Do not persist history. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. From the console, calling `recordHistory()`, mutating manually, then `undo()`/`redo()` moves between states correctly and respects the cap. List every change.

**Human test:**
- [ ] `npm run build` passes; app visually unchanged
- [ ] Console: `recordHistory()` → mutate nodes → `undo()` restores the previous nodes; `redo()` re-applies
- [ ] `undo()` with empty `past` and `redo()` with empty `future` are safe no-ops
- [ ] After >50 records, oldest entries are dropped (cap works)
- [ ] History is NOT present in localStorage
- [ ] Commit: `feat(history): add capped snapshot undo/redo core to store`

---

### SUBTASK V2-15.2 — Wire history into mutating actions

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-15, subtask 2 of 5. Subtask 1 is complete (history core exists). Still no keyboard, no buttons.
>
> **Goal:** Make real actions record history, and reset history at document boundaries.
>
> **Steps:**
> 1. In `src/lib/store.ts`, call `recordHistory()` as the FIRST step of EVERY action that mutates `canvas.nodes`, including: create node (root/child), update node (content and position/drag-commit), delete node, set status, toggle node, collapse-all, expand-all, and set tint. If a mutation can no-op (e.g. unknown id), ensure no snapshot is pushed for the no-op.
> 2. Call `clearHistory()` in `openPage` (page switch), in the import/replace action, and on initial load/seed.
> 3. Do NOT record history for: viewport changes, selection, editing state, sidebar, theme/heatmap, or page/folder index operations.
> 4. Do not change the behavior of the mutations themselves — only add the history calls.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts`.
> - LOCKED: persistence.ts, operations/*, hooks, all components, all pages, globals.css.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Every node mutation is now undoable; page switch/import clear history. List every action you wired.

**Human test:**
- [ ] Create a node → Ctrl+Z is NOT wired yet, but console `undo()` removes it; `redo()` restores it
- [ ] Edit content and save → `undo()` reverts the text
- [ ] Delete a branch → `undo()` restores the whole branch
- [ ] Change status / toggle collapse / set tint → each `undo()`s correctly
- [ ] Switch page or import → history clears (undo does nothing)
- [ ] Existing behavior of all actions unchanged
- [ ] Commit: `feat(history): record history on node mutations and reset at document boundaries`

---

### SUBTASK V2-15.3 — Keyboard shortcuts hook + guards

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-15, subtask 3 of 5. Subtasks 1–2 are complete. Now the keyboard.
>
> **Goal:** `Ctrl/Cmd+Z` undo and `Ctrl/Cmd+Y` / `Ctrl/Cmd+Shift+Z` redo, guarded so they never hijack typing.
>
> **Steps:**
> 1. Create `src/hooks/useHistoryShortcuts.ts` (client), modeled on `useStatusShortcuts.ts`:
>    - `useEffect` adds a `window` `keydown` listener and removes it on cleanup.
>    - Only act when `ctrlKey || metaKey`. `key==='z'` without Shift → undo; `key==='y'` OR `key==='z'` with Shift → redo; otherwise return.
>    - Guards (same pattern as V2-14): return if `editingId != null`; return if `document.activeElement` is INPUT/TEXTAREA/contentEditable; return if a modal (`[role="dialog"], .modal-overlay`) is open.
>    - When handling, call `e.preventDefault()` then `undo()`/`redo()`.
> 2. Mount the hook once in `Canvas.tsx` alongside `useStatusShortcuts`.
>
> **Rules:**
> - You may ONLY touch: `src/hooks/useHistoryShortcuts.ts` (new), `src/components/Canvas/Canvas.tsx` (mount).
> - LOCKED: store.ts, all other components, all pages, globals.css.
> - Do not touch `useStatusShortcuts.ts`. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Ctrl/Cmd+Z and redo work on the canvas and never fire while typing or when a modal is open. List every change.

**Human test:**
- [ ] Make a change → `Ctrl+Z` undoes it; `Ctrl+Y` / `Ctrl+Shift+Z` redo
- [ ] On macOS, `Cmd+Z` / `Cmd+Shift+Z` work
- [ ] Type in a node editor → `Ctrl+Z` performs NATIVE text undo, not canvas undo
- [ ] Sidebar rename input focused → `Ctrl+Z` does not undo canvas
- [ ] With a modal open → `Ctrl+Z` does nothing to the canvas
- [ ] Status shortcuts (1/2/3/0) still work and don't collide
- [ ] Commit: `feat(history): add guarded undo/redo keyboard shortcuts`

---

### SUBTASK V2-15.4 — Toolbar undo/redo buttons

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-15, subtask 4 of 5. Subtasks 1–3 are complete. Now visible controls.
>
> **Goal:** Undo/Redo buttons in the toolbar with correct disabled states.
>
> **Steps:**
> 1. In `Toolbar.tsx`, add Undo and Redo buttons (icon buttons consistent with existing toolbar controls).
>    - Read `past`/`future` lengths from the store with selectors to derive `canUndo`/`canRedo`.
>    - Disable Undo when `past` is empty; disable Redo when `future` is empty. Use a disabled visual state.
>    - On click, call `undo()`/`redo()`. Use `e.stopPropagation()` so clicks don't pan the canvas.
>    - Add `aria-label` and `title` ("Undo (Ctrl+Z)", "Redo (Ctrl+Y)").
> 2. APPEND any needed styles to `src/app/globals.css` (toolbar button disabled state), using existing tokens.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/Toolbar.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: store.ts, hooks, all other components, all pages.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Buttons reflect undo/redo availability and work in both themes. List every change.

**Human test:**
- [ ] Undo disabled when nothing to undo; Redo disabled when nothing to redo
- [ ] After a change, Undo enables; after undoing, Redo enables
- [ ] Clicking the buttons performs undo/redo; clicking them never pans the canvas
- [ ] Buttons look correct in light and dark themes and at ~380px
- [ ] Commit: `feat(history): add undo/redo toolbar buttons with disabled states`

---

### SUBTASK V2-15.5 — Help docs + hardening + final acceptance

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-15, subtask 5 of 5 (final). Subtasks 1–4 are complete.
>
> **Goal:** Document undo/redo and harden edge cases.
>
> **Steps:**
> 1. In `HelpPanel.tsx`, add a short section or bullets, exact copy:
>    `- Ctrl+Z (Cmd+Z on Mac) undoes a change. Ctrl+Y or Ctrl+Shift+Z redoes it.`
>    `- Undo applies to your nodes, not to zooming, panning, or page changes.`
>    Change nothing else in HelpPanel.
> 2. Hardening pass (fix only real defects):
>    - Confirm no snapshot is pushed for no-op mutations (e.g. collapse-all when already collapsed).
>    - Confirm undo/redo clear editing/selection safely and never crash on an empty canvas.
>    - Confirm history resets on page switch and import.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/HelpPanel.tsx`, and ONLY if a real defect is found `src/lib/store.ts` / `src/components/Canvas/Toolbar.tsx` (minimal fix).
> - LOCKED: hooks, all pages, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Help documents undo/redo; all edge cases hold. List every change (or state none were needed).

**Human test:**
- [ ] Help modal shows the new undo/redo copy
- [ ] Rapid undo/redo across many steps is stable; cap prevents runaway memory
- [ ] Undo on an empty canvas is a safe no-op
- [ ] Collapse-all twice → the second (no-op) did not add a phantom undo step
- [ ] Page switch and import reset history
- [ ] Commit: `feat(history): document undo/redo and harden edge cases`

---

## 4. Final Acceptance Checklist (all must pass)

**Function**
- [ ] `Ctrl/Cmd+Z` undoes; `Ctrl/Cmd+Y` and `Ctrl/Cmd+Shift+Z` redo
- [ ] Toolbar buttons mirror keyboard and show correct disabled states
- [ ] History capped at 50; oldest dropped
- [ ] Undo/redo restore the node graph (content, positions, status, collapse, tint, structure)

**Boundary (the core safety requirement)**
- [ ] While typing in a node editor, Ctrl+Z is NATIVE text undo, not canvas undo
- [ ] No canvas undo while a modal is open or another input has focus
- [ ] Undo does NOT affect viewport pan/zoom, selection, sidebar, theme, or page/folder operations
- [ ] History clears on page switch, import, and initial load
- [ ] History never persists to localStorage

**UX**
- [ ] Works in light and dark themes and at ~380px
- [ ] Help documents undo/redo
- [ ] No new dependencies; `npm run build` passes

## 5. V1 Regression Checklist (mandatory after this task)

- [ ] Create a child node with `+` → appears indented under parent
- [ ] New node auto-enters edit mode; Enter saves, Shift+Enter newline, Escape cancels
- [ ] Chevron collapses/expands ONE branch only; Collapse All / Expand All work
- [ ] Status dot cycles none → failed → review → mastered → none; shortcuts 1/2/3/0 work (V2-14)
- [ ] Collapsed parent shows heat-map chips of direct children
- [ ] Heatmap full/mini/hidden persists (V2-01); Help modal works (V2-02)
- [ ] Light/dark + custom themes work (V2-05/06); node tints work (V2-07)
- [ ] Export/import round-trip still works (V2-08/09)
- [ ] Sidebar renders/navigates/creates/renames/deletes (V2-11/12); node selection works (V2-13)
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- Ctrl+Z undoes while typing → the editing guard is missing; re-prompt subtask 3: "No-op while editingId is set or activeElement is a text field."
- Undo resurrects a deleted page or reverts an import → history was recorded for a non-node action or not cleared on import; re-prompt subtask 2: "Only node mutations record history; clear on openPage/import."
- Every action creates two undo steps → recordHistory called twice or snapshot taken post-mutation; re-prompt subtask 2: "One snapshot per mutation, captured before the change."
- Memory grows unbounded → cap not enforced; re-prompt subtask 1.
- Undo/redo fight panning/zoom → viewport was included in snapshots; re-prompt subtask 1: "Snapshot nodes only, never viewport."

## 7. Testing Note (aligned with ARCHITECTURE_v1.md §7)

The stack mechanics (clone, cap, past/future movement) are good unit-test candidates if
extracted into a pure helper. At minimum, manually verify the console flows in subtasks 1–2.
Add `tests/history.test.ts` if a test runner is configured; otherwise ask before adding one.

## 8. Handoff

This completes **Phase V2.5 — Shortcuts & history**
(V2-13 selection, V2-14 status shortcuts, V2-15 undo/redo).
Suggested tag: `git tag v2.11.0-undo-redo`.

Next phase is **V2.6 — Canvas power features** (highest risk, build last):
lasso multi-select + group move (reuses `selectedNodeIds` and now benefits from undo),
magnetic snapping, soft collision avoidance, node resize, free canvas text/headings, and
image import. Undo/redo is the safety net that makes those riskier canvas edits much safer
to ship.
