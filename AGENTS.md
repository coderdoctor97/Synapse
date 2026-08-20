# 🛡️ AGENTS.md — Synapse Agent Operating Contract

> **This file is the built-in operating contract for Synapse. It is intended to be auto-loaded into every coding-agent session.**
>
> This document governs **how an agent reasons, plans, changes, validates, and reports work** in the Synapse repository.
>
> The authoritative project sources remain:
> 1. `SYNAPSE_STRICT_RULES.md` — authoritative strict rule set
> 2. `PROJECT_RULES.md` — project rules / source of truth
> 3. `ARCHITECTURE_v1.md` — architecture/build map
> 4. `SYNAPSE_GUARDIAN.md` + `scripts/guardian.mjs` — enforcement/validation
>
> **Rule priority:** LOCKED/authoritative repository rules always override agent assumptions, README descriptions, generic best practices, or user requests that do not explicitly authorize an override.

---

## 0. CORE AGENT PRINCIPLE — DO NOT IMPROVISE

The agent must optimize for **correctness, architectural consistency, minimal change surface, and verifiable behavior** — not for speed or the amount of code produced.

### Non-negotiable behavior

- Never invent a file, component, hook, API, state field, dependency, data shape, route, design pattern, or architectural relationship without verifying it in the repository.
- Never assume that a familiar framework pattern exists in this project just because it is common elsewhere.
- Never “clean up” unrelated code while implementing a feature.
- Never refactor unrelated code unless the requested feature genuinely requires it.
- Never silently reinterpret a requirement.
- Never silently work around a `LOCKED` rule.
- Never make a destructive architectural decision merely because it appears simpler.
- When uncertain about repository-specific behavior, inspect the repository and authoritative docs before acting.
- When a material ambiguity remains after inspection, ask the user rather than guessing.

**The goal is not merely to make the requested change work. The goal is to make it work without violating the existing system.**

---

# 1. MANDATORY SESSION INITIALIZATION

Before making any code change in a new task/session:

1. Read `AGENTS.md` fully. If context was truncated, re-read it.
2. Read `SYNAPSE_STRICT_RULES.md`.
3. Read `PROJECT_RULES.md`.
4. Read `ARCHITECTURE_v1.md`.
5. Inspect the relevant repository structure and existing implementation.
6. Load the applicable UI/UX skill(s) from `skills/` before making UI/UX changes.
7. Determine whether the requested change conflicts with any `LOCKED` rule.
8. Do **not** edit code yet.

### Source-of-truth rule

Treat documentation as follows:

| Source | Role |
|---|---|
| `SYNAPSE_STRICT_RULES.md` | Highest-authority strict constraints |
| `PROJECT_RULES.md` | Project rules and invariants |
| `ARCHITECTURE_v1.md` | Placement/build map |
| `AGENTS.md` | Agent workflow + enforcement behavior |
| Existing source code | Current implementation reality |
| `README.md` | Product/project documentation; do not use it to override repository reality |
| Generic framework knowledge | Lowest priority; use only where repository evidence is absent |

If documentation and source code appear inconsistent, **do not silently choose one**. Investigate the inconsistency and report it before making a risky assumption.

---

# 2. REQUEST INTAKE — FEATURE FIRST, CODE LATER

When the user requests a new feature, behavior change, redesign, refactor, bug fix, or integration:

### Phase A — Understand the request

First, restate the requested change in your own words in 1–5 concise bullets.

The restatement must identify:

- **Goal:** What outcome does the user want?
- **User-facing behavior:** What should the user be able to do or observe?
- **Scope:** What part of the product is affected?
- **Constraints already known:** What must remain unchanged?
- **Unknowns:** What cannot yet be determined safely?

Do not present the restatement as a final implementation plan.

### Phase B — Inspect before questioning

Before asking questions, inspect the repository enough to answer questions from existing evidence yourself.

Check, where relevant:

- current folder/file structure
- existing components
- reusable UI primitives
- hooks
- Zustand store/state
- domain operations
- persistence layer
- data types
- routes/pages
- tests
- existing styles/theme system
- existing similar features
- relevant skills
- guardian/rule enforcement

**Do not ask the user questions whose answers are already discoverable in the repository.**

### Phase C — Clarification gate

Only after repository inspection, ask the **minimum necessary set of targeted questions**.

Questions should be concrete and decision-oriented, for example:

1. Which existing behavior should this new behavior replace or extend?
2. Which existing component should remain the primary entry point?
3. Should this affect persisted data or remain UI-only?
4. What should happen in the edge case X?
5. Which of these two behaviors matches your intended UX?

Avoid vague questions such as “What do you want?” when the repository already gives useful context.

### IMPORTANT: DO NOT IMPLEMENT BEFORE THE GATE IS CLOSED

If a material requirement is unresolved, **stop before editing code**.

You may inspect, reason, map dependencies, and propose alternatives, but do not implement the ambiguous portion until the user answers.

---

# 3. ARCHITECTURE IMPACT ANALYSIS

After the request is sufficiently specified, identify the smallest architecture surface that must change.

Create a concise impact map:

| Area | Existing location | Expected action | Reason |
|---|---|---|---|
| UI | `...` | Reuse / edit / create | `...` |
| State | `...` | Reuse / edit / none | `...` |
| Domain logic | `...` | Reuse / edit / create | `...` |
| Persistence | `...` | Reuse / migration / none | `...` |
| Tests | `...` | Add / update / none | `...` |

The agent must explicitly classify each candidate file as:

- **MUST CHANGE** — required for the feature
- **MAY CHANGE** — potentially useful but not yet necessary
- **DO NOT CHANGE** — unrelated, locked, or unnecessary

### Minimal-change rule

Prefer this order:

1. Reuse existing component.
2. Reuse existing hook/util/operation.
3. Extend the closest existing implementation.
4. Add a new focused module only when reuse/extension is inappropriate.
5. Refactor existing architecture only when the feature cannot be implemented safely without it.

Do not create duplicate components, duplicate state, or duplicate business logic merely because a new feature is easier to implement that way.

---

# 4. DEPENDENCY + DATA SAFETY CHECK

Before implementation, explicitly determine whether the feature changes any of the following:

- persisted data
- TypeScript interfaces/types
- Zustand state
- state ownership
- localStorage schema
- node hierarchy behavior
- status behavior
- coordinate/layout rules
- routing
- package dependencies
- external services
- security/privacy boundaries

If persisted data or a `LOCKED` shape changes, follow the migration rules from `SYNAPSE_STRICT_RULES.md` and `PROJECT_RULES.md`.

**Never silently discard or reinterpret existing user data.**

---

# 5. PLAN GATE — EXPLAIN BEFORE EXECUTION

Before editing, provide an implementation plan.

The plan must include:

### A. Goal
One clear sentence describing the requested outcome.

### B. Files to change
List exact file paths and why each is needed.

### C. Files to preserve
List important existing components/modules that will be reused and preserved.

### D. Implementation sequence
Use a logical order such as:

1. Types/state if required
2. Pure/domain logic if required
3. Reusable component changes
4. Feature UI integration
5. Persistence/migration if required
6. Tests
7. Validation

### E. Risks / invariants
Identify which existing invariants could be affected and how they will be protected.

### F. Non-goals
Explicitly state what the agent will **not** change.

### Approval rule

For **non-trivial features**, stop after presenting the plan and wait for the user's approval before implementation.

For **tiny, unambiguous changes** that are clearly local and carry no architectural/data risk, implementation may proceed without a separate approval step, but the agent must still internally perform the same safety checks.

---

# 6. IMPLEMENTATION RULES

Once implementation is authorized:

### 6.1 Preserve existing architecture

- Follow the placement map in `ARCHITECTURE_v1.md`.
- Keep routing in `src/app/`.
- Keep UI in the established component structure.
- Keep reusable UI primitives reusable.
- Keep domain/business rules in the established domain layer.
- Keep persistence isolated to the existing persistence boundary.
- Keep state ownership consistent with the existing store architecture.

### 6.2 Prefer reuse

Before creating a new component/function/hook:

- search for an existing equivalent
- inspect how nearby features solve the same problem
- extend the closest existing abstraction when appropriate

### 6.3 Styling consistency

Use the **actual styling system present in the repository** and existing design patterns.

Do not introduce Tailwind, Emotion, CSS Modules, styled-components, inline styling systems, or another styling approach merely because it is familiar or convenient.

When a styling system is locked by the authoritative project rules, follow that exact rule.

### 6.4 UI/UX changes

For UI/UX work:

1. Load the relevant skill(s) from `skills/`.
2. Inspect existing UI patterns.
3. Reuse existing components and tokens wherever possible.
4. Preserve interaction conventions already established by the project.
5. Avoid introducing a visually inconsistent one-off component.

### 6.5 No speculative improvements

Do not add:

- unrelated refactors
- “future-proof” abstractions without a concrete need
- new dependencies without necessity
- new architecture layers without necessity
- extra features not requested
- unrelated formatting churn
- unrelated renaming

---

# 7. LOCKED PROJECT RULES

The following project constraints currently remain LOCKED unless the authoritative strict rules explicitly change them.

## Identity

- **Name:** Synapse — Contextual Active Recall Canvas
- **Purpose:** Hierarchical outliner on an infinite canvas for progressive disclosure + active recall.
- **Core loop:** Build topic tree → Collapse All → Recall from memory → Expand to verify → Tag weak items → See the heat-map.
- **V1 philosophy:** local-first, lightweight, no backend, no accounts, no cloud.

## Tech stack

- Next.js 13+ / 14.x as defined by `package.json` and authoritative rules
- App Router via `src/app/`
- TypeScript strict mode
- Zustand for canonical state
- localStorage for V1 persistence through `src/lib/persistence.ts`
- No backend/API routes in V1
- Flat `Record<string, Node>` storage model

## Banned dependency rule

Do not install or introduce backend/database/auth/state-management replacement dependencies that are explicitly banned by `SYNAPSE_STRICT_RULES.md`.

If the user requests a banned dependency, explain the conflict and request the repository's explicit override mechanism rather than silently installing it.

---

# 8. V1 DATA MODEL — PROTECT PERSISTED DATA

The current locked model is:

```ts
type Status = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;
  content: string;
  parentId: string | null;
  position: { x: number; y: number };
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

Any addition/removal/rename of persisted fields requires the migration process defined by the authoritative rules.

Never silently discard old user data.

---

# 9. DOMAIN INVARIANTS — NEVER BREAK SILENTLY

Protect these established behaviors:

1. `parentId: null` means root.
2. Hierarchy is derived from the flat node record.
3. Collapsed ancestors hide their descendants.
4. Delete cascades to descendants exactly once.
5. Status cycle remains `none → failed → review → mastered → none`.
6. Heat-map aggregation follows the established direct-child rule.
7. World-space coordinates and viewport transforms remain consistent.
8. Canonical state remains in the established Zustand store.
9. Persistence remains inside `persistence.ts`.
10. Editing behavior remains consistent with the established save/cancel interaction.

If a requested feature would change one of these, stop and treat it as an architectural/data-model change rather than silently modifying the invariant.

---

# 10. VALIDATION — PROVE THE CHANGE

Before reporting a task as complete, run the required repository validation:

```bash
node scripts/guardian.mjs
npm run build
npm test
```

Also manually verify the affected interaction when relevant.

Examples include:

- create
- edit
- status cycle
- collapse/expand
- drag/pan/zoom where applicable
- delete
- reload/restore
- keyboard interaction
- affected UI states

### Failure rule

If validation fails:

1. Do not claim completion.
2. Identify the failing check.
3. Diagnose whether the failure is caused by the change.
4. Fix the issue if the fix is within scope.
5. Re-run validation.

Do not hide or ignore failures.

---

# 11. CONFLICT / OVERRIDE PROTOCOL

If any requested action conflicts with a `LOCKED` rule:

1. **STOP.**
2. State the exact conflict.
3. Identify the authoritative rule/source.
4. Explain the practical impact.
5. Ask for the project's explicit override syntax.
6. Do not implement the conflicting change until the override is explicitly granted.

Example:

> The requested change introduces a backend dependency, but the current V1 rules define Backend = NONE. I have not changed the architecture. Provide the repository-approved override if you want this constraint changed.

Never manufacture an override token or invent a migration strategy without evidence.

---

# 12. GIT / COMMIT POLICY — USER OWNS VERSION CONTROL

The agent must **not** manage commits by default.

- Never run `git commit` automatically.
- Never run `git push` automatically.
- Never run `git rebase` automatically.
- Never open or merge a PR automatically.
- Never stage files automatically as part of normal implementation.
- Never assume that a change is safe to commit merely because tests pass.

The user reviews changes and handles commits manually.

If the user explicitly instructs the agent to perform a Git action in that specific task, follow that explicit instruction only.

---

# 13. STOP CONDITIONS

The agent must stop implementation and ask the user when:

- a material requirement is ambiguous
- the repository contains conflicting authoritative rules
- a requested change requires changing a LOCKED invariant
- a persisted schema change is required but migration behavior is undefined
- a referenced file/component cannot be found
- the proposed implementation requires a dependency that conflicts with project rules
- the agent cannot verify an assumption that is important to correctness
- a requested behavior contradicts the current architecture and no approved migration/override exists

**Stopping is preferable to hallucinating.**

---

# 14. FEATURE REQUEST TEMPLATE — RECOMMENDED USER INPUT

Users can provide feature requests in this format:

```text
FEATURE:
[What I want to implement]

GOAL:
[Why I want it / desired outcome]

USER EXPERIENCE:
[What the user should be able to do or see]

KNOWN CONSTRAINTS:
[Things that must remain unchanged]

REFERENCES:
[Existing screen/component/file/feature to follow, if any]

DO NOT CHANGE:
[Anything explicitly protected]

SUCCESS CRITERIA:
[How we will know the feature is correct]
```

The agent should still inspect the repository rather than trusting this template blindly.

---

# 15. REQUIRED AGENT RESPONSE FLOW FOR NEW FEATURES

For a normal non-trivial feature request, the preferred interaction is:

### Step 1 — Understand
> “I understand the feature as…”

### Step 2 — Inspect
> “I found these existing components/files/patterns…”

### Step 3 — Clarify
> “Before implementation, I need these decisions…”

### Step 4 — Architecture map
> “These are the files that should change; these should remain untouched…”

### Step 5 — Plan
> “Here is the implementation plan…”

### Step 6 — Approval gate
> Wait for user approval for non-trivial work.

### Step 7 — Implement
> Make the smallest safe change.

### Step 8 — Validate
> Run guardian, build, tests, and relevant manual verification.

### Step 9 — Report
> State exactly what changed, what was preserved, what was tested, and any remaining limitations.

This sequence is intentionally designed to reduce hallucination, accidental scope expansion, duplicate abstractions, and unrelated regressions.

---

# 16. CHANGE REPORT FORMAT

After implementation, report:

### Changed
- Exact files changed
- What each change does

### Preserved
- Existing components/logic reused
- Important architecture/invariants preserved

### Validation
- `node scripts/guardian.mjs` → pass/fail
- `npm run build` → pass/fail
- `npm test` → pass/fail
- Relevant manual checks → pass/fail/not applicable

### Notes
- Any limitation
- Any follow-up that is genuinely required

Do not claim a check passed unless it was actually run.

---

# 17. FINAL SHIELD RULE

**READ → INSPECT → CLARIFY → MAP → PLAN → APPROVE → IMPLEMENT → VALIDATE → REPORT.**

Never invert this order for a non-trivial task.

When uncertain, prefer **inspection over assumption**, **reuse over duplication**, **minimal change over refactor**, and **asking over hallucinating**.

---

## 🔒 ACTIVE SOURCES

This contract is enforced alongside:

- `SYNAPSE_STRICT_RULES.md`
- `PROJECT_RULES.md`
- `ARCHITECTURE_v1.md`
- `SYNAPSE_GUARDIAN.md`
- `scripts/guardian.mjs`
- applicable files under `skills/`

**If any lower-priority document conflicts with an authoritative/LOCKED rule, the authoritative/LOCKED rule wins.**
