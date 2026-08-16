# TASK V2-14 — Status Shortcuts (Phase V2.5)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The functional hook (1) must work before discoverability UI (2).
> Requires: V2-13 complete and committed (`selectedNodeIds`, `selectNode`, `clearSelection`).

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §2 (state ownership) and
   the reserved `src/hooks/` directory.
2. Read `src/lib/store.ts` and confirm whether a direct-set status action exists
   (`setNodeStatus(id, status)`), or only a cycle action. Note `selectedNodeIds`,
   `editingId`, and how status is currently changed.
3. Read `src/components/Canvas/Node.tsx` and find the editor keydown handler (Enter/Escape)
   and whether it calls `stopPropagation`.
4. Read `src/components/Canvas/Canvas.tsx` to see where a hook can be mounted.
5. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

With a node selected, press a number key to set its recall status instantly:
`1` = Failed, `2` = Review, `3` = Mastered, `0` = Clear. `Esc` deselects.
Shortcuts must NEVER interfere with typing, modals, or browser controls.

OUT OF SCOPE: custom/remappable keys, multi-key chords, shortcuts for non-status actions,
and any Ctrl/Alt/Meta combinations.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Key map | `1`→Failed, `2`→Review, `3`→Mastered, `0`→Clear(none). Plain keys, NO modifiers |
| Forbidden keys | NO `Ctrl+R` (reloads browser). NO `Ctrl+1…9` (switch browser tabs). No Ctrl/Meta/Alt chords at all |
| Applies to | Every id in `selectedNodeIds` (loop), so future multi-select works unchanged |
| Extra key | `Esc` clears selection (only when the guards below pass) |
| Guard 1 | No-op if `selectedNodeIds` is empty |
| Guard 2 | No-op while editing a node (`editingId != null`) OR when `document.activeElement` is an input/textarea/contentEditable |
| Guard 3 | No-op while any modal is open (detect `[role="dialog"], .modal-overlay` in the DOM) |
| Guard 4 | No-op if `ctrlKey`/`metaKey`/`altKey` is held |
| Set action | Use/add a direct-set `setNodeStatus(id, status)` (not the cycle) |
| Hook location | NEW `src/hooks/useStatusShortcuts.ts`, mounted once in `Canvas.tsx` |
| Editor isolation | Node editor keydown (Enter/Escape) must `stopPropagation` so global shortcuts don't double-fire |

---

## 3. Subtasks

---

### SUBTASK V2-14.1 — setNodeStatus + shortcut hook (functional)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-14, subtask 1 of 3. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` first. Logic only — no new visual UI.
>
> **Goal:** Make status shortcuts work: a direct-set status action plus a guarded global keyboard hook.
>
> **Steps:**
> 1. In `src/lib/store.ts`, ensure a direct-set action `setNodeStatus(id: string, status: Status)` exists (immutable update, bumps `updatedAt`, triggers the debounced save). If only a cycle action exists, ADD this; do not remove the cycle.
> 2. Create `src/hooks/useStatusShortcuts.ts` (client). Reference shape — adapt to the real store API:
>    - `useEffect` adds a `window` `keydown` listener and removes it on cleanup.
>    - Handler order: if `ctrlKey||metaKey||altKey` → return. Read `selectedNodeIds`, `editingId`, `setNodeStatus`, `clearSelection` from the store. If `editingId != null` → return. If `document.activeElement` is `INPUT`/`TEXTAREA`/contentEditable → return. If `document.querySelector('[role="dialog"], .modal-overlay')` exists → return. If `e.key === 'Escape'` → `clearSelection()` and return. Map `'1'|'2'|'3'|'0'` to `failed|review|mastered|none`; if unmapped or `selectedNodeIds` empty → return; else call `setNodeStatus(id, status)` for EACH selected id.
> 3. Mount the hook once inside `Canvas.tsx` (call `useStatusShortcuts()`).
> 4. Verify `Node.tsx` editor keydown (Enter/Escape) calls `stopPropagation` so it doesn't double-fire with the global handler. If it does not, add `stopPropagation` there only.
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts` (add action), `src/hooks/useStatusShortcuts.ts` (new), `src/components/Canvas/Canvas.tsx` (mount), `src/components/Canvas/Node.tsx` (stopPropagation only if missing).
> - LOCKED: persistence.ts, operations/*, all pages, Sidebar, HelpPanel, HeatmapPanel, globals.css.
> - No Ctrl/Meta/Alt shortcuts. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Selecting a node and pressing 1/2/3/0 sets its status; Esc deselects. List every change.

**Human test:**
- [ ] Select a node → press `1` → red/Failed; `2` → amber/Review; `3` → green/Mastered; `0` → clears
- [ ] Press a status key with NO selection → nothing happens
- [ ] Type inside a node editor and press `1` → the digit is typed, status does NOT change
- [ ] Sidebar rename input focused, press `1` → digit typed, no status change
- [ ] Open delete/import/help modal, press `1` → nothing happens
- [ ] `Esc` (not editing) clears selection; `Esc` while editing cancels the edit only
- [ ] `Ctrl+1` / browser refresh do NOT set a status
- [ ] Commit: `feat(shortcuts): add guarded status shortcut keys`

---

### SUBTASK V2-14.2 — Discoverability (selection hint + help docs)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-14, subtask 2 of 3. Subtask 1 is complete (shortcuts work). Now make them discoverable.
>
> **Goal:** A subtle hint shown while a node is selected, plus Help documentation.
>
> **Steps:**
> 1. Create `src/components/Canvas/SelectionHint.tsx`:
>    - Reads `selectedNodeIds` and `editingId` from the store with selectors.
>    - When `selectedNodeIds.length > 0` and not editing, renders a small pill (bottom-center) with exact copy: `1 Failed · 2 Review · 3 Mastered · 0 Clear · Esc Deselect`.
>    - Set `pointer-events: none` so it never blocks the canvas. Style with existing tokens; it must work in light and dark themes.
> 2. In `Canvas.tsx`, render `<SelectionHint />`. Add the import; change nothing else.
> 3. In `HelpPanel.tsx`, add a short section or bullets, exact copy:
>    `- Select a node, then press 1, 2, or 3 to tag it Failed, Review, or Mastered. Press 0 to clear the tag.`
>    `- Press Esc to deselect.`
>    Change nothing else in HelpPanel.
> 4. APPEND styles to `src/app/globals.css` prefixed `selection-hint-`.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/SelectionHint.tsx` (new), `src/components/Canvas/Canvas.tsx` (import + render), `src/components/Canvas/HelpPanel.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, `src/hooks/*`, all pages, Sidebar, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. The hint appears only when a node is selected and not editing; Help documents the keys. List every change.

**Human test:**
- [ ] Select a node → hint pill appears bottom-center; deselect → it disappears
- [ ] Start editing the selected node → hint hides
- [ ] Hint never blocks clicking/panning the canvas (pointer-events none)
- [ ] Hint legible in light and dark themes and at ~380px
- [ ] Help modal shows the two new lines
- [ ] Commit: `feat(shortcuts): add selection hint and help documentation`

---

### SUBTASK V2-14.3 — Hardening + regression + final acceptance

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-14, subtask 3 of 3 (final). Subtasks 1–2 are complete.
>
> **Goal:** Verify the shortcuts never interfere and nothing regressed. Fix only real defects.
>
> **Steps:**
> 1. Verify all four guards hold: empty selection, editing/typing focus, open modal, and modifier keys. Confirm no status change occurs in any guarded case.
> 2. Verify `Esc` while editing cancels the edit WITHOUT also clearing selection (Node editor keydown must stopPropagation). Verify `Esc` while a modal is open closes the modal, not the selection.
> 3. Verify applying a shortcut updates the status dot, left border, and any collapsed-parent heat-map chips correctly.
> 4. Verify behavior in light and dark themes and at ~380px.
> 5. Fix only genuine defects found; no restyling.
>
> **Rules:**
> - You may ONLY touch: `src/hooks/useStatusShortcuts.ts`, `src/components/Canvas/Node.tsx`, `src/components/Canvas/SelectionHint.tsx` — and only if a real defect is found.
> - LOCKED: all of `src/lib/*` (except a genuine action defect), all pages, Sidebar, other components.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. All guards verified; no regressions. List every change (or state explicitly that none were needed).

**Human test:**
- [ ] All four guards prevent unintended status changes
- [ ] Esc-in-editor cancels edit only; Esc-with-modal closes modal only
- [ ] Shortcut updates dot + left border + collapsed-parent chips
- [ ] Works in both themes and at ~380px
- [ ] Commit: `feat(shortcuts): harden status shortcuts and verify regressions`

---

## 4. Final Acceptance Checklist (all must pass)

**Function**
- [ ] `1/2/3/0` set Failed/Review/Mastered/Clear on every selected node
- [ ] `Esc` deselects when guards pass
- [ ] Uses direct-set `setNodeStatus`, persists on refresh

**Safety (the core requirement)**
- [ ] NO Ctrl/Meta/Alt shortcuts; `Ctrl+R` and `Ctrl+1…9` untouched
- [ ] No-op while editing/typing, while any modal is open, with no selection, or with modifiers held
- [ ] Node editor keys do not double-fire with global shortcuts

**UX**
- [ ] Selection hint appears only when relevant and never blocks the canvas
- [ ] Help documents the keys; works in both themes and at ~380px
- [ ] No new dependencies; `npm run build` passes

## 5. V1 Regression Checklist (mandatory after this task)

- [ ] Create a child node with `+` → appears indented under parent
- [ ] New node auto-enters edit mode; Enter saves, Shift+Enter newline, Escape cancels
- [ ] Chevron collapses/expands ONE branch only; Collapse All / Expand All work
- [ ] Status dot cycles none → failed → review → mastered → none (click still works)
- [ ] Collapsed parent shows heat-map chips of direct children
- [ ] Heatmap full/mini/hidden persists (V2-01); Help modal works (V2-02)
- [ ] Light/dark + custom themes work (V2-05/06); node tints work (V2-07)
- [ ] Export/import round-trip still works (V2-08/09)
- [ ] Sidebar renders/navigates/creates/renames/deletes (V2-11/12); node selection works (V2-13)
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- A shortcut fires while typing → a guard is missing; re-prompt subtask 1: "No-op while editingId is set or activeElement is an input/textarea/contentEditable."
- `Ctrl+R` or `Ctrl+1` sets a status → the modifier guard is missing; reject and re-prompt subtask 1.
- Esc cancels edit AND deselects → Node editor keydown lacks stopPropagation; re-prompt subtask 1/3.
- Shortcut changes status while a modal is open → modal guard missing; re-prompt subtask 1.
- Hint blocks canvas clicks → pointer-events not none; re-prompt subtask 2.

## 7. Handoff

Suggested tag: `git tag v2.10.0-status-shortcuts`.

Next in **Phase V2.5**: **V2-15 — Undo/Redo** (`Ctrl+Z` / `Ctrl+Y`). Note the key-safety pattern
established here carries over: `Ctrl+Z`/`Ctrl+Y` are safe for the browser, but they must be
DISABLED while editing text (so native textarea undo works), and the history must be a capped
snapshot stack that excludes transient state (selection, editing, viewport).
