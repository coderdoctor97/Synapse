# Synapse

> **Contextual Active Recall Canvas** — A hierarchical note-taking tool that preserves the big picture while enabling friction-free active recall.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-13+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

---

## 🎯 The Problem

Medical students (and anyone facing high-volume, interconnected information) are forced to choose between:

- **📄 Linear notes** (PDFs, Word, OneNote) — Great for context, but completely passive. No built-in way to test yourself.
- **🃏 Flashcards** (Anki) — Excellent for spaced repetition, but destroy the big picture. You memorize isolated facts without understanding how they connect.

**The result?** Fragmented knowledge. You know *that* magnesium sulfate is used for eclampsia, but you can't recall *where* it fits in the broader management protocol.

---

## 💡 The Solution

**Synapse** is a lightweight, local-first hierarchical outliner on an infinite canvas that lets you:

1. **Map interconnected topics** as a tree (e.g., *Eclampsia* → *Management* → *Magnesium Sulfate Protocol*)
2. **Collapse the entire canvas** to test your high-level framework
3. **Expand nodes one-by-one** to verify your memory — *without losing context*
4. **Tag weak areas** with visual status flags (red = failed, yellow = review, green = mastered)
5. **See a heat-map** of your knowledge gaps when the tree is collapsed

**Progressive Disclosure + Contextual Active Recall** = No more choosing between structure and testing.

---

## ✨ Core Features (V1)

| Feature | Description | Why It Matters |
|---------|-------------|----------------|
| **Hierarchical Nodes** | Parent-child relationships that preserve topic structure | Never lose the "big picture" |
| **Global Toggle** | Collapse all / expand all with one click | Test your mental framework instantly |
| **Individual Collapse** | Click any node to hide/show its children | Drill down exactly where you need practice |
| **Status Tagging** | Mark nodes as Mastered (🟢), Review (🟡), or Failed (🔴) | Self-directed metacognition |
| **Heat-Mapping** | Collapsed parents show aggregated child statuses | Visual knowledge gap analysis |
| **Infinite Canvas** | Pan and zoom to organize large topic maps | Scale from a single lecture to an entire syllabus |
| **Local-First** | Auto-saves to browser storage, zero backend | Privacy, speed, offline-first |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/synapse.git
cd synapse

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use

### 1. **Create Your First Topic Tree**
- Click anywhere on the canvas to create a root node (e.g., "Hypertensive Disorders in Pregnancy")
- Click the `+` icon on a node to add a child (e.g., "Pre-eclampsia", "Eclampsia")
- Build out your hierarchy to match how the topic is structured in your mind

### 2. **Test Yourself with Progressive Disclosure**
- Click **"Collapse All"** in the toolbar — only your root nodes remain visible
- Look at "Eclampsia" and try to recall its management protocol mentally
- Click to expand and verify your answer
- Keep drilling down level-by-level

### 3. **Tag Your Weak Spots**
- After expanding a node, click the status indicator to cycle through:
  - ⚪ **None** (default)
  - 🔴 **Failed** (couldn't recall)
  - 🟡 **Review** (partially remembered)
  - 🟢 **Mastered** (confident)

### 4. **See Your Knowledge Heat-Map**
- Collapse parent nodes to see aggregated child statuses
- A badge shows: `3 failed, 2 review, 5 mastered`
- Focus your next study session on red-heavy branches

### 5. **Your Work Auto-Saves**
- Everything saves to browser localStorage automatically
- Refresh the page — your canvas loads exactly as you left it

---

## 🏗️ Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | Next.js 13+ (App Router) | Modern React, built-in routing |
| **Language** | TypeScript | Type safety for complex tree logic |
| **State** | Zustand | Lightweight, no boilerplate |
| **Storage** | localStorage | Local-first, zero backend for V1 |
| **Styling** | Tailwind CSS | Rapid UI iteration |

---

## 🗂️ Project Structure

```
synapse/
├── src/
│   ├── app/                   # Next.js pages
│   │   ├── page.tsx          # Canvas list
│   │   └── canvas/[id]/      # Main canvas view
│   ├── components/
│   │   ├── Canvas/           # Core canvas components
│   │   └── ui/               # Reusable UI elements
│   ├── lib/
│   │   ├── operations/       # Business logic (CRUD, hierarchy)
│   │   ├── store.ts          # Zustand state management
│   │   ├── persistence.ts    # localStorage wrapper
│   │   └── types.ts          # TypeScript definitions
│   └── hooks/                # Custom React hooks
└── tests/                    # Unit tests
```

---

## 🛣️ Roadmap

### ✅ V1 (Current) — Core Active Recall Engine
- [x] Hierarchical node management
- [x] Global collapse/expand
- [x] Status tagging + heat-mapping
- [x] Local persistence

### 🔜 V2 — Usability Enhancements
- [ ] Markdown / rich text support
- [ ] Drag-to-reparent nodes
- [ ] Keyboard shortcuts (collapse with `Space`, expand with `Enter`)
- [ ] Undo/Redo
- [ ] Search within canvas

### 🔮 V3+ — Ecosystem Features
- [ ] Export to Anki / PDF
- [ ] Cloud sync (optional, self-hosted)
- [ ] Mobile app (React Native)
- [ ] Plugin system (community extensions)
- [ ] Shared canvases (study groups)

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# V1 Manual Test Checklist
- [ ] Create 3-level node hierarchy
- [ ] Collapse all → only roots visible
- [ ] Expand individual node
- [ ] Tag node as "Failed" → parent shows red badge
- [ ] Refresh page → state restored
- [ ] Pan canvas, zoom in/out
```

---

## 🤝 Contributing

We welcome contributions! This project is built for students, by students (and developers who care about learning tools).

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Guidelines
- Write TypeScript (no `any` types unless absolutely necessary)
- Test your changes manually against the V1 checklist
- Keep it simple — resist scope creep (see [SCOPE.md](SCOPE.md))

---

## 🚫 Anti-Scope Creep Policy

**Synapse is NOT:**
- ❌ A clone of Roam/Obsidian (no bi-directional links)
- ❌ A spaced repetition scheduler (use Anki for that)
- ❌ A collaborative whiteboard (use Miro/FigJam)
- ❌ A drawing tool (we're text-first)

**We intentionally focus on:**
- ✅ Preserving hierarchical context
- ✅ Enabling friction-free active recall
- ✅ Visual metacognitive feedback

See our [design philosophy doc](PHILOSOPHY.md) for details.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

**TL;DR:** Use it for free, modify it, share it. We only ask that you credit the project.

---

## 🙏 Acknowledgments

Built for medical students grinding through NEET PG, USMLE Step 1/2, PLAB, and any other exam that demands both deep understanding *and* rapid recall.

Inspired by:
- [Anki](https://apps.ankiweb.net/) — for proving spaced repetition works
- [Roam Research](https://roamresearch.com/) — for showing outlining could be spatial
- [Workflowy](https://workflowy.com/) — for hierarchical simplicity
- The frustration of forgetting where clinical facts fit in the bigger diagnostic picture

---

## 📬 Contact

- **Issues/Bugs:** [GitHub Issues](https://github.com/yourusername/synapse/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/synapse/discussions)
- **Twitter/X:** [@yourhandle](https://twitter.com/yourhandle)

---

## 🌟 Star History

If this project helps you ace your exams, consider giving it a ⭐ — it helps other students find it!

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/synapse&type=Date)](https://star-history.com/#yourusername/synapse&Date)

---

<p align="center">
  <i>Made with ❤️ and far too much coffee during exam season</i>
</p>

---

## 📸 Screenshots

> Coming soon! Drop screenshots here after V1 build:
> - Canvas with expanded hierarchy
> - Collapsed view with heat-map badges
> - Status tagging in action

---

**Pro tip:** Start by mapping out one high-yield topic (e.g., "Shock" or "Acid-Base Disorders"). If you can collapse it, recall the framework, expand to verify, and tag your weak spots — you've just built a better study system than 90% of your classmates. 🎓
