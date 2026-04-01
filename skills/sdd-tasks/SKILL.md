---
name: sdd-tasks
description: Compact task breakdown rules for turning design into executable implementation steps.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Convert proposal, spec, and design into small, dependency-ordered implementation tasks.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Proposal, spec, and design artifacts (required)

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `tasks`
- Topic key: `sdd/{change-name}/tasks`

## Task Quality Rules

Every task must be:

- specific
- actionable
- verifiable
- small enough for one session
- tied to a concrete file or scenario

## Workflow

1. Retrieve proposal, spec, and design.
2. Identify file changes and dependency order.
3. Group work by implementation phase.
4. Add testing/verification tasks tied to spec scenarios.
5. Persist the artifact when required.

## Output Format

```markdown
# Tasks: {Change Title}

## Phase 1: Foundation
- [ ] 1.1 {Concrete action with file path}

## Phase 2: Core Implementation
- [ ] 2.1 {Concrete action with file path}

## Phase 3: Integration
- [ ] 3.1 {Wiring task}

## Phase 4: Testing
- [ ] 4.1 {Test task tied to spec scenario}

## Phase 5: Cleanup
- [ ] 5.1 {Docs, cleanup, polish if needed}
```

## Rules

- Use hierarchical numbering: `1.1`, `1.2`, `2.1`...
- Order tasks by dependency.
- Never write vague tasks like “implement feature”.
- Testing tasks should reference the spec scenarios they validate.
- If the project uses TDD, express RED → GREEN → REFACTOR when relevant.
- In `openspec`, create or update `tasks.md`.
