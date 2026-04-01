---
name: sdd-design
description: Compact design rules for translating proposal and specs into an implementation plan.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Produce the technical design that explains HOW the change will be implemented.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Proposal (required)
- Spec (optional if still being produced in parallel)

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `design`
- Topic key: `sdd/{change-name}/design`

## What to Read

- The real code that will be affected
- Existing patterns, interfaces, and file structure
- Relevant tests or quality constraints when they shape the design

## Preferred Tools

- `find_symbol`
- `trace_symbol`
- `trace_callers`
- `grep_workspace`
- `scan_module`
- `list_endpoints`

## Workflow

1. Retrieve proposal and spec artifacts.
2. Read the real code involved.
3. Decide the technical approach using existing patterns.
4. List concrete file changes.
5. Define interfaces/contracts only where necessary.
6. Define testing strategy and rollout notes.
7. Persist the artifact when required.

## Output Format

```markdown
# Design: {Change Title}

## Technical Approach
{Concise strategy}

## Architecture Decisions
### Decision: {Title}
**Choice**: {choice}
**Alternatives considered**: {alternatives}
**Rationale**: {why}

## Data Flow
{Short description or ASCII flow}

## File Changes
| File | Action | Description |
|------|--------|-------------|
| `path/to/file` | Create/Modify/Delete | {why} |

## Interfaces / Contracts
{Only the contracts that matter}

## Testing Strategy
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | {what} | {how} |

## Migration / Rollout
{Plan or "No migration required"}

## Open Questions
- [ ] {question or None}
```

## Rules

- Read code before deciding architecture.
- Use existing project patterns unless the change explicitly fixes them.
- Include rationale for every important decision.
- Prefer concrete file paths over abstract descriptions.
- If a blocker remains, state it instead of guessing.
