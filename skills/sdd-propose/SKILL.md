---
name: sdd-propose
description: Compact proposal rules for defining a change before specs and implementation.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Turn exploration or direct user intent into a concise change proposal.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Exploration artifact or direct user description

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `proposal`
- Topic key: `sdd/{change-name}/proposal`

## Retrieval Rules

- Read exploration when it exists
- Read `sdd-init/{project}` when useful for project context
- In `openspec` or `hybrid`, also inspect relevant main specs when they shape the proposal

## Workflow

1. Define the problem and why the change matters.
2. Separate in-scope vs out-of-scope work.
3. State the high-level approach.
4. List affected areas with concrete paths when possible.
5. Identify risks, rollback, and success criteria.
6. Persist the artifact when required.

## Output Format

```markdown
# Proposal: {Change Title}

## Intent
{Problem and motivation}

## Scope

### In Scope
- {deliverable}

### Out of Scope
- {deferred item}

## Approach
{High-level approach}

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `path/to/area` | New/Modified/Removed | {what changes} |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| {risk} | Low/Med/High | {mitigation} |

## Rollback Plan
{How to revert safely}

## Dependencies
- {dependency or None}

## Success Criteria
- [ ] {measurable outcome}
```

## Rules

- Keep it concise and decision-oriented.
- Every proposal MUST include rollback and success criteria.
- Use concrete paths when you know them.
- In `openspec`, create or update `proposal.md`.
- If a proposal already exists, read it first and update it instead of overwriting blindly.
