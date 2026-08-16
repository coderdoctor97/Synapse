# Task Log — V2-04 Collapse Visibility Audit

**Audit result: V2-04 routed to new feature request V2-04b (hide node).**

## Stage 0 answers (human + AI-assisted)

| # | Question | Answer |
|---|---|---|
| Q1 | Did child #2's OWN children disappear, while child #1 / #3 / #4 branches stayed fully visible? | **YES** — verified by AI code inspection (read-only): `Node.tsx` chevron toggles only `c.nodes[node.id].isCollapsed`; `visibleOrder()` in `hierarchy.ts` excludes the whole subtree of any collapsed ancestor via recursion; siblings untouched. Human did not observe manually ("don't know exactly"), but the code path is provably correct. |
| Q2 | Was the chevron hard to notice before you deliberately looked for it? | **YES** — human answer. Chevron is 20px, resting color `var(--muted)` `#64748b`, no background; blends into white cards. No opacity/visibility rule hides it (only `.icon-btn` action buttons are opacity-0 at rest). |
| Q3 | Were you actually expecting child #2's CARD ITSELF to vanish (exactly 3 cards left)? | **YES** — human answer (clarified): user wants a hide-node feature. |

## Routing decision

- Table: Q3 YES → **Path C — new-feature decision gate, STOP.**
- Per card: nothing was built inside V2-04. No repo files changed for this task.
- Per card: asked for a full task card for **V2-04b — Hide/show individual nodes** before any code.

## Path C design sketch (from the card, for the future V2-04b card)

- Add `isHidden: boolean` (default `false`) to `Node` in `src/lib/types.ts`.
- Schema change → add/bump `schemaVersion` and migrate old saved canvases on load,
  per ARCHITECTURE_v1.md §10. Never discard existing user data.
- `visibleOrder()` excludes hidden nodes (and, by decision, either their subtree too
  or only the node itself).
- UI: an eye toggle in the node's action row; parents show a "N hidden" chip;
  a way to unhide (parent chip click or a toolbar "show hidden" toggle).
- Heatmap aggregation must decide whether hidden children still count.

## Handoff notes for the V2-04b card (and future tasks)

- **V2-03 still uncommitted** at the time of this audit: `src/app/globals.css` modified
  in working tree, HEAD still `v2.2`. Commit before starting V2-04b:
  `fix(contrast): separate cards from canvas background` (body: `--shadow-md` shared
  token; dot-grid `#c3cad8` hardcoded; empty-card intentionally keeps `--line-2`).
- Chevron visibility issue (Q2 = YES) was NOT built — Path A was skipped due to Path C
  routing. It can be folded into a future CSS polish card (22px hit area, 14px icon,
  `#475569` resting color, accent hover) or bundled with V2-05 theme work.
- Workaround until V2-04b exists: collapse the PARENT branch to hide a group.
