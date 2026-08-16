# PROJECT_RULES.md — Synapse
> This file is the single source of truth for how Synapse must be built.
> Every AI agent working on this codebase MUST read this file before making any change.
> If a request conflicts with this file, stop and ask — do not improvise.

---

## 1. PROJECT IDENTITY

- **Name:** Synapse — Contextual Active Recall Canvas
- **Purpose:** A hierarchical outliner on an infinite canvas for progressive disclosure and active recall. Built for medical students preparing for high-volume exams.
- **Core loop:** Build a topic tree → Collapse everything → Recall from memory → Expand to verify → Tag weak items → See the heat-map.
- **Principles:** Local-first. Lightweight. No backend. No accounts. No cloud.

---

## 2. TECH STACK (LOCKED)

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 13+ App Router | LOCKED |
| Language | TypeScript (strict) | LOCKED |
| State | Zustand | LOCKED |
| Persistence | localStorage (V1) | LOCKED |
| Backend | NONE. No API routes, no database | LOCKED |
| Node storage | Flat dictionary `Record<string, Node>`, never nested | LOCKED |

Do NOT introduce new frameworks, databases, state libraries, or backend services without explicit approval.

---

## 3. DATA MODEL (LOCKED FOR V1)

```ts
type NodeStatus = 'none' | 'failed' | 'review' | 'mastered';

interface Node {
  id: string;                    // UUID
  content: string;               // Plain text only in V1
  parentId: string | null;       // null = root node
  position: { x: number; y: number };
  status: NodeStatus;
  isCollapsed: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Canvas {
  id: string;
  name: string;
  nodes: Record<string, Node>;
  viewport: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}