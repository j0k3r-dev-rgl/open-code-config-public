---
name: sdd-init
description: Compact initialization rules for Spec-Driven Development in a project.
license: MIT
metadata:
  author: gentleman-programming
  version: "3.1"
---

## Purpose

Detect the project stack, testing capabilities, conventions, and persistence setup for SDD.

## Core Boundary

- Execute the init yourself.
- Do NOT delegate.
- Use bash only for real bootstrap filesystem work.

## Modes

- `engram`: persist context and testing capabilities to Engram only
- `openspec`: create `openspec/` structure and config
- `hybrid`: do both
- `none`: return context inline only

## What to Detect

### Project context

- stack and package manager
- architecture patterns
- lint, format, and type-check tools
- project instruction files and conventions

### Testing capabilities

- test runner and command
- unit / integration / e2e availability
- coverage command or absence
- quality tools: linter, formatter, type checker

## Strict TDD Rule

- Offer Strict TDD only when a real test runner exists
- If none exists, set `strict_tdd: false`
- Report this clearly in the summary

## Required Outputs

### 1. Testing capabilities cache

Persist `sdd/{project-name}/testing-capabilities` when mode is `engram` or `hybrid`.

Format:

```markdown
## Testing Capabilities

**Strict TDD Mode**: {enabled/disabled}
**Detected**: {date}

### Test Runner
- Command: `{command}`
- Framework: {name}

### Test Layers
| Layer | Available | Tool |
|-------|-----------|------|
| Unit | ✅ / ❌ | {tool} |
| Integration | ✅ / ❌ | {tool} |
| E2E | ✅ / ❌ | {tool} |

### Coverage
- Available: ✅ / ❌
- Command: `{command or —}`

### Quality Tools
| Tool | Available | Command |
|------|-----------|---------|
| Linter | ✅ / ❌ | {command} |
| Type checker | ✅ / ❌ | {command} |
| Formatter | ✅ / ❌ | {command} |
```

### 2. Project context

Persist `sdd-init/{project-name}` when mode is `engram` or `hybrid`.

### 3. OpenSpec bootstrap

When mode is `openspec` or `hybrid`, create:

```text
openspec/
├── config.yaml
├── specs/
└── changes/archive/
```

## Skill Registry

Always build `.atl/skill-registry.md`.

Scan:
- user skill directories
- project skill directories
- project convention files such as `AGENTS.md`, `agents.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `copilot-instructions.md`

If Engram exists, also persist `skill-registry`.

## Workflow

1. Detect stack and conventions.
2. Detect testing and quality capabilities.
3. Resolve Strict TDD availability.
4. Bootstrap OpenSpec only if mode requires it.
5. Build skill registry.
6. Persist testing capabilities.
7. Persist project context.
8. Return a compact summary with stack, testing, persistence mode, and TDD result.

## Rules

- Read only the manifests/configs needed to detect the project.
- Reuse discovered commands exactly; do not invent tools.
- Do NOT create `openspec/` in `engram` mode.
- This phase is infrastructure setup, so `.atl/skill-registry.md` is always allowed.
