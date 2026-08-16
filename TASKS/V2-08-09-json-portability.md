# TASK V2-08/V2-09 — Canvas JSON Export & Import (Phase V2.3)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. The pure format logic (1) must exist and be verified before any
> UI is built on top.
> Requires: V2-07 complete and committed (Node has `tint`; persistence has `schemaVersion`).

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §9 (export/import plan)
   and §10 (persistence migration rule).
2. Read `src/lib/types.ts`, `src/lib/store.ts`, `src/lib/persistence.ts` to understand the
   current `Canvas`/`Node` shape and how the active canvas is stored/loaded.
3. Read `src/components/Canvas/Canvas.tsx` and `Toolbar.tsx` to see where canvas-level
   controls live and how existing confirmation modals are implemented (delete flow).
4. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

- **Export (V2-08):** download the current canvas as a validated `.synapse.json` file.
- **Import (V2-09):** load a `.synapse.json` file, validate it strictly, confirm with the
  user, back up the current canvas, then replace the current canvas contents.

JSON (not XML): it matches the data model exactly and is far easier to validate.

OUT OF SCOPE: importing as a separate/new canvas document (multi-canvas phase), Anki/PDF
export, cloud sync, merging two canvases, or re-mapping node ids on import.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Format | JSON only. Envelope: `{ format: "synapse-canvas", formatVersion: 1, name, viewport, nodes }` |
| Portable type | `PortableCanvas` in `types.ts`. Node ids are preserved (hierarchy depends on them) |
| Pure logic location | NEW `src/lib/portability.ts` — build/serialize/parse/validate. No DOM, no React |
| Export filename | sanitized canvas name + `.synapse.json` |
| Import semantics | REPLACE the current canvas contents (same canvas `id`). Not a new document |
| Never-silently-overwrite | Import requires (1) strict validation, (2) explicit confirm dialog, (3) automatic backup download of the current canvas before replacing (skip backup only if current canvas has 0 nodes) |
| Validation stance | Strict structure, lenient optionals. Reject: non-Synapse files, unknown `formatVersion`, malformed nodes, orphaned `parentId`. Normalize safe defaults for optional fields |
| Confirmation modal | Reuse the existing modal pattern (delete flow), not `window.confirm` |

### Portable format (exact shape)

```json
{
  "format": "synapse-canvas",
  "formatVersion": 1,
  "name": "My Canvas",
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": {
    "<nodeId>": {
      "id": "<nodeId>",
      "content": "...",
      "parentId": null,
      "position": { "x": 0, "y": 0 },
      "status": "none",
      "isCollapsed": false,
      "tint": null,
      "createdAt": 0,
      "updatedAt": 0
    }
  }
}
```

### Validation rules for import (`parseImportedCanvas`)

- Parse JSON inside try/catch → fail: "Not valid JSON."
- Must be an object with `format === "synapse-canvas"` → else "Not a Synapse canvas file."
- `formatVersion === 1` → if higher: "Created with a newer version of Synapse."; else unsupported.
- `nodes` must be a plain object. Each node: `id` string; `content` string (default `""`);
  `parentId` null or string; `position` numeric `{x,y}` (required); `status` normalized to a
  valid value or `"none"`; `isCollapsed` boolean (default false); `tint` string or null;
  `createdAt`/`updatedAt` numbers (default now).
- After normalization, every non-null `parentId` must reference an existing node →
  else fail: "File contains nodes with missing parents."
- `name` string (default "Imported canvas"); `viewport` numeric `{x,y,zoom}` (default `{0,0,1}`).
- Return `{ ok: true, name, nodes, viewport }` or `{ ok: false, error }`.

---

## 3. Subtasks

---

### SUBTASK 1 — Portable format + pure logic (no UI, no DOM)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-08/09, subtask 1 of 4. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` §9–10 first. Pure logic only — no components, no DOM.
>
> **Goal:** Define the portable format and the export/import logic as pure, testable functions.
>
> **Steps:**
> 1. In `src/lib/types.ts`, add:
>    `export interface PortableCanvas { format: 'synapse-canvas'; formatVersion: number; name: string; viewport: { x: number; y: number; zoom: number }; nodes: Record<string, Node>; }`
>    Do not change `Node` or `Canvas`.
> 2. Create `src/lib/portability.ts` exporting:
>    - `export const PORTABLE_FORMAT = 'synapse-canvas';` and `export const PORTABLE_FORMAT_VERSION = 1;`
>    - `buildExportCanvas(canvas: Canvas): PortableCanvas` — returns the envelope exactly as specified.
>    - `serializeCanvas(canvas: Canvas): string` — pretty-printed JSON of `buildExportCanvas`.
>    - `parseImportedCanvas(raw: string): ParseImportResult` implementing the validation rules from the task card. Fully tolerant of optional fields, strict about structure. Never throws; returns `{ok:false,error}` instead.
>    - Define `export type ParseImportResult = { ok: true; name: string; nodes: Record<string, Node>; viewport: { x:number;y:number;zoom:number } } | { ok: false; error: string };`
>
> **Rules:**
> - You may ONLY touch: `src/lib/types.ts`, `src/lib/portability.ts`.
> - LOCKED: store.ts, persistence.ts, operations/*, all components, layout.tsx, globals.css.
> - No DOM access, no React, no new dependencies, no `console.log`.
>
> **Definition of done:** `npm run build` passes. `serializeCanvas` → `parseImportedCanvas` round-trips a canvas faithfully. List every change.

**Human test:**
- [ ] `npm run build` passes
- [ ] (Optional but recommended) Add `tests/portability.test.ts` covering: round-trip fidelity; rejects invalid JSON; rejects non-Synapse file; rejects orphaned parentId; normalizes missing optional fields
- [ ] No visual change in the app
- [ ] Commit: `feat(portability): add portable canvas format and parse/serialize logic`

---

### SUBTASK 2 — Export UI (download)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-08/09, subtask 2 of 4. Subtask 1 is complete (`portability.ts` exists). Now the export button.
>
> **Goal:** A button that downloads the current canvas as `<name>.synapse.json`.
>
> **Steps:**
> 1. Create `src/components/Canvas/DataPortability.tsx`:
>    - Renders an "Export" button (download icon) styled consistently with existing toolbar controls.
>    - On click: read the current canvas from the store, call `serializeCanvas`, and download it via a Blob + anchor with `download` attribute. Filename = sanitized canvas name + `.synapse.json` (strip unsafe characters, fall back to `canvas`).
>    - Revoke the object URL after download.
>    - Use `e.stopPropagation()` so the click never pans the canvas.
> 2. In `Canvas.tsx`: render `<DataPortability />` alongside the existing toolbar controls. Add the import only; change nothing else.
> 3. APPEND any needed styles to `src/app/globals.css` prefixed `portability-`. Use existing tokens only.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/DataPortability.tsx` (new), `src/components/Canvas/Canvas.tsx` (import + render), `src/app/globals.css` (append-only).
> - LOCKED: all of `src/lib/*`, Toolbar.tsx, all other components, all pages.
> - Do not implement import yet. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Clicking Export downloads a valid `.synapse.json` matching the portable format. List every change.

**Human test:**
- [ ] Export button visible and never pans the canvas
- [ ] Downloads `<name>.synapse.json`; opening the file shows the exact portable envelope
- [ ] Exporting an empty canvas still produces a valid file
- [ ] Filename is safe (no slashes/special chars)
- [ ] Commit: `feat(portability): add canvas JSON export`

---

### SUBTASK 3 — Import UI (validate + confirm + backup + replace)

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-08/09, subtask 3 of 4. Subtasks 1–2 are complete. Now import.
>
> **Goal:** Import a `.synapse.json` file with strict validation, explicit confirmation, automatic backup, then replace the current canvas contents.
>
> **Steps:**
> 1. In `src/lib/store.ts`, add a command action `replaceCanvasContents(name: string, nodes: Record<string, Node>, viewport: {x,y,zoom})` that:
>    - keeps the current canvas `id`;
>    - replaces `name`, `nodes`, `viewport`;
>    - sets `updatedAt` to now;
>    - clears transient UI state (`editingId`, `justCreatedId`);
>    - triggers the existing debounced persistence save.
>    Do NOT change the canvas storage key or any other action.
> 2. In `src/components/Canvas/DataPortability.tsx`, add import:
>    - A hidden `<input type="file" accept="application/json,.json">` and an "Import" button that opens it. Reset `input.value = ''` after each handling so the same file can be re-selected.
>    - On file selected: read the text, call `parseImportedCanvas`.
>      - If `ok:false` → show the error message in a non-destructive way (inline banner or modal). Make NO changes to the canvas.
>      - If `ok:true` → open a confirmation modal (reuse the existing modal pattern) stating: the incoming canvas name, its node count, that it will REPLACE the current canvas, and that a backup of the current canvas will be downloaded first. Buttons: Cancel / Import.
>    - On confirm: if the current canvas has ≥1 node, first download a backup using `serializeCanvas(currentCanvas)` named `<current-name>-backup-<timestamp>.synapse.json`. Then call `replaceCanvasContents(...)` with the parsed data.
>    - Use `e.stopPropagation()` on all controls.
> 3. APPEND any needed styles to `src/app/globals.css` (prefixed `portability-`).
>
> **Rules:**
> - You may ONLY touch: `src/lib/store.ts` (the one new action), `src/components/Canvas/DataPortability.tsx`, `src/app/globals.css` (append-only).
> - LOCKED: portability.ts, types.ts, persistence.ts, operations/*, Canvas.tsx (unless a render tweak is strictly required), all other components, all pages.
> - Never replace the canvas without validation + confirmation + backup. No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Import validates, confirms, backs up, and replaces correctly; invalid files change nothing. List every change.

**Human test:**
- [ ] Import the file you exported in subtask 2 → confirm dialog shows correct name + node count
- [ ] Confirm → backup of current canvas downloads, then canvas is replaced with the imported content
- [ ] Refresh → imported content persists
- [ ] Import an invalid `.json` (garbage) → clear error, canvas untouched
- [ ] Import a valid JSON that is NOT a Synapse file → clear error, canvas untouched
- [ ] Import a file with an orphaned parentId → clear error, canvas untouched
- [ ] Import into an empty canvas → no backup download, still confirms, replaces fine
- [ ] Cancel at the confirm dialog → nothing changes
- [ ] Commit: `feat(portability): add validated canvas JSON import with backup`

---

### SUBTASK 4 — Help docs + error hardening + final polish

**AGENT PROMPT — copy/paste:**

> You are working on Synapse, TASK V2-08/09, subtask 4 of 4 (final). Subtasks 1–3 are complete.
>
> **Goal:** Document portability and harden the error/edge paths.
>
> **Steps:**
> 1. In `HelpPanel.tsx`, add a short section or bullets, exact copy:
>    `- Export downloads your canvas as a .synapse.json file you can keep or share.`
>    `- Import loads a .synapse.json file. It replaces the current canvas, so a backup is downloaded first.`
>    Change nothing else in HelpPanel.
> 2. Hardening pass (fix only real defects):
>    - Ensure every import failure shows a clear, human-readable message and never mutates the canvas.
>    - Ensure export/import work when the canvas is empty.
>    - Ensure the confirm dialog and error message are readable at ~380px width.
>
> **Rules:**
> - You may ONLY touch: `src/components/Canvas/HelpPanel.tsx`, and ONLY if a real defect is found `src/components/Canvas/DataPortability.tsx` / `src/app/globals.css` (minimal fix).
> - LOCKED: all of `src/lib/*`, Canvas.tsx, all other components, all pages.
> - No new dependencies. No `console.log`.
>
> **Definition of done:** `npm run build` passes. Help documents export/import; all error paths are clear and non-destructive. List every change.

**Human test:**
- [ ] Help modal shows the two new bullets
- [ ] Full round-trip: export → import → identical canvas (nodes, statuses, tints, positions, collapse states, viewport)
- [ ] All failure paths show clear messages and leave the canvas untouched
- [ ] Works at ~380px width
- [ ] Commit: `feat(portability): document export/import and harden error paths`

---

## 4. Final Acceptance Checklist (all must pass)

**Export**
- [ ] Downloads a valid `.synapse.json` matching the portable envelope exactly
- [ ] Preserves node ids, hierarchy, statuses, tints, collapse states, positions, viewport
- [ ] Empty canvas exports a valid file; filename is sanitized

**Import**
- [ ] Strict validation rejects: invalid JSON, non-Synapse files, unknown formatVersion, orphaned parents — with clear messages and zero mutation
- [ ] Confirm dialog shows incoming name + node count before any change
- [ ] Backup of the current canvas downloads automatically before replacement (when ≥1 node)
- [ ] Replace keeps the same canvas `id`; imported content persists on refresh

**Safety & data**
- [ ] No path overwrites existing work without validation + confirmation + backup
- [ ] Round-trip export→import is lossless
- [ ] Canvas storage key and `schemaVersion` handling unchanged

**UX**
- [ ] Controls usable at desktop and ~380px; never pan the canvas
- [ ] No new dependencies; `npm run build` passes

## 5. V1 Regression Checklist (mandatory after this task)

- [ ] Create a child node with `+` → appears indented under parent
- [ ] New node auto-enters edit mode; Enter saves, Shift+Enter newline, Escape cancels
- [ ] Chevron collapses/expands ONE branch only; Collapse All / Expand All work
- [ ] Status dot cycles none → failed → review → mastered → none
- [ ] Collapsed parent shows heat-map chips of direct children
- [ ] Heatmap full/mini/hidden persists (V2-01); Help modal works (V2-02)
- [ ] Light/dark + custom themes work (V2-05/06); node tints work (V2-07)
- [ ] Drag handle moves a node; position persists after refresh
- [ ] Deleting a parent with children confirms and cascades
- [ ] Refresh → nodes, statuses, tints, viewport restored

## 6. Recovery Plan

- Import replaced without backup/confirm → `git checkout .` → re-prompt subtask 3: "Import must validate, confirm, and back up before replacing."
- Round-trip loses data → compare exported JSON to store; likely a field omitted in `buildExportCanvas`; re-prompt subtask 1.
- Orphaned file imported silently → re-prompt subtask 1: "parentId references must be validated and rejected."
- Export corrupts filename → re-prompt subtask 2 with the sanitization rule.

## 7. Testing Note (aligned with ARCHITECTURE_v1.md §7)

`portability.ts` is pure — it is the ideal unit-test target. Keep these cases in
`tests/portability.test.ts`: round-trip fidelity; reject invalid JSON; reject non-Synapse
format; reject unknown formatVersion; reject orphaned parentId; normalize optional fields.

## 8. Handoff

This completes **Phase V2.3 — Data portability** (V2-08 export + V2-09 import).
Suggested tag: `git tag v2.5.0-portability`.

Deferred on purpose:
- Import as a NEW separate canvas document (belongs to the multi-canvas phase)
- Merging two canvases / re-mapping node ids on import
- Anki/PDF export, cloud sync

Next phase is **V2.4 — OneNote-style organization** (folders → pages, where each page is a
canvas). Note: the `[id]` dynamic route and the portable format both lay the groundwork —
import can later become "import as a new page."
