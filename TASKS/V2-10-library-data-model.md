# TASK V2-10 — Library Data Model: Folders + Pages (Phase V2.4)

> Work protocol: ONE subtask per AI prompt. Test + `npm run build` + commit after each.
> NEVER combine subtasks. This is a STORAGE MODEL task governed by ARCHITECTURE_v1.md §10.
> The migration (subtask 1) must be verified before anything else is built on top.
> Requires: V2-08/09 (portability) complete and committed.

---

## 0. Agent Pre-Flight (include with every prompt)

Before writing any code:
1. Read `PROJECT_RULES.md` and `ARCHITECTURE_v1.md` — especially §9 (canvas index/list
   plan), §10 (persistence migration rule), and §7 (testing strategy).
2. Read `src/lib/types.ts`, `src/lib/persistence.ts`, and `src/lib/store.ts` to understand
   the current `Canvas`/`Node` shape and how the canvas is saved/loaded under
   `synapse:v1:canvas:<id>` (including the V2-07 `schemaVersion` and seeding behavior).
3. Read `src/app/canvas/[id]/page.tsx` and `src/app/page.tsx` to confirm how the `[id]`
   route and the `/` redirect currently behave. Do NOT change them in this task.
4. Do NOT proceed if anything is unclear — ask instead of guessing.

---

## 1. Goal

Introduce the library data model that V2-11 (sidebar) and V2-12 (page CRUD UI) will use:

- **Folders** that can organize pages (and nest later without a schema change).
- **Pages**, where each page is one canvas document.
- A **canvas index** in storage that lists folders + pages as lightweight metadata.

This subtask set is DATA ONLY. No UI, no store wiring, no routing changes. The result must
be fully covered by unit tests and must leave the running app behaving exactly as before.

OUT OF SCOPE (later tasks): sidebar UI (V2-11), page create/rename/delete UI + canvas-data
deletion with backup (V2-12), folder drag-reorder, nested-folder UI, exporting the whole
library, and changing the current `/canvas/default` navigation.

---

## 2. Locked Design Decisions (do NOT revisit)

| Decision | Value |
|---|---|
| Folder shape | `{ id, name, parentId: string \| null, createdAt, updatedAt }`. `parentId: null` = top-level. Supports future nesting with no schema change |
| Page metadata shape | `{ id, name, folderId: string \| null, createdAt, updatedAt }`. `folderId: null` = unorganized. **`page.id` === canvas id === storage key id === route `[id]`** |
| Index storage key | NEW key `synapse:v1:index`. Shape `{ schemaVersion: 1, folders: Record<string,Folder>, pages: Record<string,PageMeta> }` |
| Canvas data stays put | Node/viewport data remains under `synapse:v1:canvas:<id>`. The index NEVER stores nodes |
| Migration | If the index is missing/corrupt but the `default` canvas exists, create an index containing that canvas as a page. Never discard data. Persist the migrated index |
| Folder deletion semantics | Reparent its folders/pages to the deleted folder's parent (or root). NEVER deletes pages |
| Page deletion semantics | `deletePageMeta` removes metadata only. Actual canvas-data deletion + confirmation + backup belongs to V2-12 |
| Ordering | Deterministic by `createdAt` (matches the existing node ordering rule) |
| Pure logic location | NEW `src/lib/operations/library.ts`. No DOM, no React, no store |
| New pages vs seed | New pages will start EMPTY. The sample-tree seed applies only to the true first-launch default canvas. (Behavior wiring happens in V2-11/12 — do not change seeding here) |
| Store/UI | UNCHANGED in this task |

### Index shape (exact)

```json
{
  "schemaVersion": 1,
  "folders": {
    "<folderId>": { "id": "<folderId>", "name": "Medicine", "parentId": null, "createdAt": 0, "updatedAt": 0 }
  },
  "pages": {
    "<pageId>": { "id": "<pageId>", "name": "Eclampsia", "folderId": null, "createdAt": 0, "updatedAt": 0 }
  }
}
```

---

> NOTE: This file was auto-saved from the truncated prompt provided on 2026-08-16.
> The full subtask breakdown (Subtasks 1..N) was not included in the prompt.
> The implementation below follows the Locked Design Decisions and the task goal
> (DATA ONLY) and will treat Subtask 1 as: **Types + Index Persistence + Library Operations + Migration + Tests**, with subsequent subtasks to be confirmed when the full card is provided.
