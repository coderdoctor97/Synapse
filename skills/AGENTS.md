# AGENTS.md

This file is the single source of guidance for coding agents working in this repository. `CLAUDE.md` imports it and adds nothing but Claude Code specifics, so put repository facts here and do not maintain a second copy.

## What this repository is

A collection of agent skills for building great product interfaces (typography, colors, UI polish), distributed two ways: via `npx skills add jakubkrehel/skills`, and as the Claude Code plugin `interfaces` served by the marketplace in this same repository. It is documentation-only; there is no build, lint, or test tooling.

`.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` define the plugin and its marketplace. Both are named `interfaces`, so plugin users invoke skills as `/interfaces:better-interface` while skills-CLI users invoke `/better-interface`. Skills are discovered from `skills/` automatically, so adding a skill needs no manifest change. Bump `version` in `plugin.json` when you want plugin users to receive an update. Run `claude plugin validate .` and `claude plugin validate .claude-plugin/plugin.json` after touching either manifest.

`opencode.json` registers `skills/` under `skills.paths` so opencode loads the collection while this repository itself is open, which is for working on the skills rather than distributing them. opencode users install through the skills CLI's opencode target, and opencode exposes every discovered skill as a slash command on its own, so this repository carries no opencode command wrappers.

## Structure

Each skill lives in `skills/<skill-name>/`:

- `SKILL.md` is the entry point. YAML frontmatter with `name` (matching the directory) and `description` (one-line summary, "Use when..." guidance, and a "Triggers on ..." keyword list that agents match against). The body: a short philosophy paragraph (one or two lines, with hand-off lines naming sibling skills that own adjacent topics), a **Quick Reference** table linking to reference files, numbered **Core Principles**, and a **Common Mistakes** table. No review checklists and no trailing reference-file index; the Quick Reference is the only file listing.
- Supporting `.md` reference files carry depth beyond the principle statements: recipes, code patterns, lookup tables. A principle states the rule and links out for the recipe; it never restates the reference file in shorter form, and the reference file never restates the principle in longer form. Link via relative paths from the Quick Reference table.
- Every domain skill keeps its standalone review format in `review-output.md`, never in `SKILL.md`. These skills fire mostly on build tasks, where the format is dead weight in context. Two things reach it: a Quick Reference row, and a closing **Reporting** section — two lines stating that a standalone review is finished only once the findings are reported in that format. The Reporting section is what makes the pointer fire, because it sits where the agent lands before writing output; the Quick Reference row alone is read while orienting and misses that moment. `better-interface` owns the format whenever it orchestrates, and states that once, in its own principle 3 — the Reporting section names the precedence in a clause and defines nothing.
- Each rule lives in exactly one skill; other skills point to it by skill name in backticks (e.g. `better-layout`), never via cross-skill relative links.

Current skills: `better-interface` (cross-discipline review), `interface-review` (user-invoked change-scoped review), `better-ui` (interface polish details), `better-typography` (web typography), `better-colors` (color systems and color usage), `better-accessibility` (accessibility engineering), `better-layout` (layout structure), `better-writing` (UX writing and interface copy).

### Invocation

A user-invoked skill may invoke model-invoked skills, but it can never reach another user-invoked skill. That rule decides the setting; it is not a preference:

- `interface-review` is the only user-invoked skill. It carries `disable-model-invocation: true` in its frontmatter **and** `policy.allow_implicit_invocation: false` in its `agents/openai.yaml` — the Claude Code and Codex halves of the same switch, which must be set together or the skill behaves differently per harness. Its `description` is human-facing: a one-line summary with no trigger list, since nothing but a person can match against it.
- Every other skill is model-invoked and keeps a trigger list, because something must reach it: `better-interface` routes to every domain skill, and `interface-review` hands its review up to `better-interface`.
- `better-interface` therefore cannot start `interface-review`. Where it would want to, it asks the user to run it. Making `better-interface` user-invoked too would sever the upward handoff and force `interface-review` to restate severity, the cap, the format, and the verdict.

### Rule ownership

| Skill | Owns |
| --- | --- |
| `better-interface` | Review orchestration, mode parsing, project convention discovery, shared severity and its escalation triggers, consolidation, coverage, the finding cap, the output format including its change-scoped additions, and the verdict |
| `interface-review` | Change scope resolution including the empty-scope offer, blast radius from changed files to affected surfaces, and finding classification (`Introduced` / `Regression` / `Pre-existing`) |
| `better-accessibility` | Semantic HTML, keyboard and focus behavior, accessible names, forms, assistive technology, and accessibility requirements |
| `better-layout` | Spatial grouping, alignment, spacing, responsive structure, logical CSS properties, and spatial RTL behavior |
| `better-writing` | Source wording, terminology, voice, tone, labels, errors, and empty-state copy |
| `better-typography` | Visual text rendering, type systems, font behavior, wrapping mechanics, punctuation, and text-level bidi behavior |
| `better-colors` | Palette structure and step roles, palette construction, color token naming, color notation, gamut, rendered-pair contrast measurement, and color remediation |
| `better-ui` | Optional visual polish: surfaces, icons, and motion aesthetics after the underlying interaction is sound |

When a concern crosses domains, keep the rule in the owner above and let other skills name only the handoff or secondary effect. In particular:

- `better-accessibility` decides when contrast is required and whether the pair fails; `better-colors` owns measuring the rendered pair and changing its colors. Severity is `better-interface`'s in an orchestrated review; each domain skill defines severity only for its own standalone output.
- `better-accessibility` owns semantic heading structure; `better-typography` owns how heading levels render visually.
- `better-layout` owns logical CSS properties and spatial mirroring; `better-typography` owns language metadata, punctuation, and mixed-direction text.
- `better-typography` owns truncation mechanics; `better-layout` owns whether the surrounding layout has room or an expansion affordance; `better-writing` owns the source copy.
- `better-accessibility` owns reduced-motion requirements; `better-ui` owns the optional animation recipe used when motion is appropriate.
- `interface-review` owns what to review when the scope is a diff; `better-interface` owns how that review is routed, ranked, consolidated, and reported. The dependency runs one way: `interface-review` hands its scope and statuses up, and `better-interface` hosts every format and verdict rule that consumes them. Neither file may restate the other's rules.

## Authoring conventions

- Principles are prescriptive and specific: exact CSS properties, exact values (e.g. scale `0.25` → `1`, blur `4px` → `0px`), not vague advice.
- Match the degree of prescription to the decision: requirements may be unconditional, while design heuristics name the context and escape conditions before giving exact recipe values.
- Skills instruct agents to match the target project's existing styling system (Tailwind vs. plain CSS vs. CSS-in-JS) rather than impose one.
- Frontmatter `description` is the discovery surface; when adding or changing a skill's scope, update its trigger keywords accordingly. It is loaded on every turn, so it earns harder pruning than the body: one trigger per distinct branch, never two phrasings of the same one, and no identity the body already carries (which skills it coordinates, which modes it supports, how it does its work).
- Skills that own a domain use the `better-*` prefix. A user-invoked review entry point may drop it when a plainer name reads better on the command line, as `interface-review` does.
- A skill's name appears in three places: its directory, its frontmatter `name`, and `display_name` in its `agents/openai.yaml`. Renaming means changing all three, then `grep`ing for the old name to confirm nothing survived.
- Prefer counts and lists that cannot go stale. Say "every skill in this repository" rather than a number the next skill invalidates.
