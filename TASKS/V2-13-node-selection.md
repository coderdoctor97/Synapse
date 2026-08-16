# TASK V2-13 — Node Selection Model (Phase V2.5)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The store slice (1) must exist before any interaction/UI is built.
> Requires: V2-12 complete and committed.

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §2 (state ownership) and §3
   (domain rules).
2. Read `src/lib/store.ts` to see how transient UI state (`editingId`, `justCreatedId`) is
   handled, and how `deleteNode` and `openPage` work.
3. Read `src/components/Canvas/Node.tsx` to see the node card structure and existing
   click/pointer handlers (edit, chevron, status, add, drag, delete) and where they use
   `stopPropagation`.
4. Read `src/components/Canvas/Canvas.tsx` to see how the background pointer-down (pan) is
   detected and how it distinguishes background from node clicks.
5. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

Clicking a node selects it and shows a blue/accent outline. Clicking the empty canvas
clears the selection. Selection is transient (not persisted) and is stored as a LIST of ids
so future multi-select (lasso, Ctrl+click) and resize can build on it without a refactor.

OUT OF SCOPE (later tasks): multi-select gestures, keyboard shortcuts (V2-14), lasso,
resize, and any behavior that acts ON the selection. V2-13 only establishes selection
itself.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Selection state | `selectedNodeIds: string[]` in `useCanvasStore` (default `[]`). A list, not a single id, so multi-select is possible later |
| V2-13 behavior | Single-select: clicking a node sets selection to `[id]`. Multi-select gestures are NOT implemented here |
| Selection trigger | Capture-phase pointer-down on the node card (fires before child `stopPropagation`), primary pointer button only |
| Deselection | Pointer-down on the empty canvas background clears selection |
| Visual | `.node-card.is-selected { outline: 2px solid var(--accent); outline-offset: 2px; }`. Use `outline`, NOT `box-shadow`, so the card shadow is preserved. Theme-aware via `--accent` |
| Persistence | Selection is transient — NEVER persisted. Resets on refresh, like `editingId` |
| Hygiene | Clear/filter selection when a selected node is deleted, and clear selection on `openPage` (page switch) |
| Separation from edit | Selection and edit mode are independent. A node can be selected and being edited at once |

---

## 3. Subtasks

---

### SUBTASK V2-13.1 — Store selection slice + hygiene (no UI)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-13, subtask 1 of 4. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` §2 first. Store only — no components, no CSS.
>
> **Goal:** Add transient multi-select-ready selection state to the store, with cleanup.
>
> **Steps:**
> 1. In `src/lib/store.ts`:
>    - Add state `selectedNodeIds: string[]` (default `[]`). Do NOT persist it.
>    - Add actions:
>      - `selectNode(id: string)` → set `selectedNodeIds` to `[id]` (single-select for now).
>      - `clearSelection()` → set `selectedNodeIds` to `[]`.
>      - (Design for the future: keep these as the only selection entry points so multi-select can be added later without renaming.)
>    - Hygiene:
>      - In the delete path (cascade delete), remove any deleted ids from `selectedNodeIds`.
>      - In `openPage`, call `clearSelection()` so a page switch never carries selection across.
> 2. Do not change any existing node/canvas action behavior.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts`.
> - LOCKED: persistence.ts, operations/*, all components, all pages, globals.css, types.ts.
> - No new dependencies. No `console.log`. No UI.
>
> **Definition of done:** `npm run build` passes. The app behaves exactly as before. List every change.

**Human test:**
- [ ] `npm run build` passes; app visually unchanged
- [ ] Console: `selectNode(<id>)` sets selection to `[<id>]`; `clearSelection()` empties it
- [ ] Console: delete a selected node → it is removed from selection
- [ ] Console: switch page via `openPage` → selection clears
- [ ] Selection is NOT written to localStorage
- [ ] Commit: `feat(selection): add transient node selection state to store`

---

### SUBTASK V2-13.2 — Selection interaction + outline

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-13, subtask 2 of 4. Subtask 1 is complete (`selectNode`/`clearSelection` exist). Now the interaction and visual.
>
> **Goal:** Clicking a node selects it with an outline; clicking the empty canvas deselects.
>
> **Steps:**
> 1. In `Node.tsx`, on the node card root, add a CAPTURE-phase pointer-down handler that selects the node: `onPointerDownCapture={(e) => { if (e.button === 0) selectNode(node.id); }}`.
>    - Because this is capture-phase, it runs before child handlers and their `stopPropagation`, so the node is selected whether the user clicks the text, chevron, status dot, add, drag handle, or delete.
>    - Do NOT remove or alter any existing child handler or `stopPropagation`.
> 2. Add class `is-selected` to the node card when `selectedNodeIds` includes `node.id`. Read `selectedNodeIds` from the store with a selector.
> 3. In `Canvas.tsx`, in the existing background pointer-down path (the branch that runs only when the pointer is NOT on a node), call `clearSelection()`.
> 4. APPEND to `src/app/globals.css`: `.node-card.is-selected { outline: 2px solid var(--accent); outline-offset: 2px; }`. Use `outline`, not `box-shadow`.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/Node.tsx`, `src/components/Canvas/Canvas.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, all pages, Toolbar/Heatmap/Help/Sidebar components.
> - No new dependencies. No `console.log`. Do not change edit/drag/collapse/status behavior.
>
> **Definition of done:** `npm run build` passes. Clicking any part of a node selects it (outline appears); clicking empty canvas clears it. List every change.

**Human test:**
- [ ] Click a node's body → outline appears
- [ ] Click a node's text/chevron/status/+/drag handle/delete → that node becomes selected
- [ ] Click a different node → selection moves to it
- [ ] Click empty canvas → outline disappears
- [ ] Editing, dragging, collapsing, status cycling, adding, deleting all still work
- [ ] Outline visible in BOTH light and dark themes
- [ ] Commit: `feat(selection): select node on click with outline; clear on background`

---

### SUBTASK V2-13.3 — Hardening (no conflicts, themes, page switch)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-13, subtask 3 of 4. Subtasks 1–2 are complete.
>
> **Goal:** Verify and harden selection against existing behaviors. Fix only real defects.
>
> **Steps:**
> 1. Confirm selection does not interfere with: inline editing (a node can be selected AND in edit mode), dragging (drag-start selects, drag still works), collapse/expand, status cycling, and the node editor's focus/blur save.
> 2. Confirm selection clears on page switch (`openPage`) and when the selected node is deleted.
> 3. Confirm the outline renders cleanly in light and dark themes and at ~380px width, and does not overlap or clip the card content.
> 4. Confirm right-click (non-primary button) does NOT select a node.
> 5. Fix only genuine defects found; no restyling beyond the selection outline.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/Node.tsx`, `src/components/Canvas/Canvas.tsx`, `src/app/globals.css` — and only if a real defect is found.
> - LOCKED: all of `src/lib/*`, all pages, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Selection coexists cleanly with all existing interactions. List every change (or state explicitly that none were needed).

**Human test:**
- [ ] Select a node, then edit it → both states coexist; saving keeps it selected
- [ ] Drag a selected node → it stays selected and moves correctly
- [ ] Switch pages → selection clears
- [ ] Delete a selected node → no stale outline
- [ ] Right-click a node → no selection
- [ ] Works at ~380px and in both themes
- [ ] Commit: `feat(selection): harden selection against edit/drag/page-switch`

---

### SUBTASK V2-13.4 — Help docs + regression + final acceptance

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-13, subtask 4 of 4 (final). Subtasks 1–3 are complete.
>
> **Goal:** Document selection and verify nothing regressed.
>
> **Steps:**
> 1. In `HelpPanel.tsx`, add one bullet under the node-editing or movement section, exact copy:
>    `- Click a node to select it. Click the empty canvas to deselect.`
>    Change nothing else in HelpPanel.
> 2. Verification pass (fix only real defects): selection outline is visible and consistent; no interaction regressed.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/HelpPanel.tsx`, and ONLY if a real defect is found `src/components/Canvas/Node.tsx` / `Canvas.tsx` / `src/app/globals.css` (minimal fix).
> - LOCKED: all of `src/lib/*`, all pages, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Help documents selection; all regressions clear. List every change.

**Human test:**
- [ ] Help modal shows the new selection bullet
- [ ] Full flow: select → edit → drag → collapse → status → deselect, all clean
- [ ] Commit: `docs(selection): document node selection and verify regressions`

---

## 4. Final Acceptance Checklist (all must pass)

**Selection**
- [ ] Clicking any part of a node selects it (capture-phase, primary button only)
- [ ] Selected node shows an accent outline that preserves the card shadow
- [ ] Clicking empty canvas clears selection
- [ ] Selection is transient — never persisted, resets on refresh

**Hygiene**
- [ ] Deleting a selected node removes it from selection
- [ ] Switching pages clears selection
- [ ] Right-click does not select

**Compatibility**
- [ ] Selection coexists with edit, drag, collapse, status, add, delete
- [ ] Outline correct in light and dark themes and at ~380px
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
- [ ] Sidebar renders, navigates, creates, renames, deletes (V2-11/12)
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- Selection doesn't fire on some controls → the handler is not capture-phase; re-prompt subtask 2: "Use onPointerDownCapture so selection runs before child stopPropagation."
- Outline overwrites the card shadow → box-shadow was used; re-prompt subtask 2: "Use outline, not box-shadow."
- Selection persists across refresh → it was added to persistence; reject and keep it transient.
- Page switch carries selection over → `openPage` must call `clearSelection()`.
- Selection broke edit/drag → a child handler was altered; reject: "Do not modify existing handlers; selection is capture-phase only."

## 7. Handoff

This is the foundation of **Phase V2.5 — Shortcuts & history**.
Suggested tag: `git tag v2.9.0-selection`.

What builds on this next:
- **V2-14 — Status shortcuts**: safe keys applied to the SELECTED node(s). NOT Ctrl+R
  (reloads the browser). Recommended: when a node is selected and not being edited, plain
  keys `1`=Failed, `2`=Review, `3`=Mastered, `0`=Clear. Must be a no-op while editing text.
- Later: multi-select (Ctrl+click / lasso) and node resize reuse `selectedNodeIds` unchanged.

Deferred on purpose: multi-select gestures, acting on selection beyond shortcuts, and any
keyboard handling in THIS task (keyboard belongs to V2-14).
