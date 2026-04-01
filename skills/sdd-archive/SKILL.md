---
name: sdd-archive
description: Compact archive rules for closing a verified change and syncing the source of truth.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Close the SDD cycle by syncing delta specs, preserving lineage, and archiving the completed change.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Proposal, spec, design, tasks, and verify-report artifacts (required)

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `archive-report`
- Topic key: `sdd/{change-name}/archive-report`

## Preconditions

- Do NOT archive when the verification report contains unresolved CRITICAL issues.

## Workflow

1. Retrieve all required artifacts.
2. In `openspec` or `hybrid`, merge delta specs into `openspec/specs/`.
3. Move the change folder to `openspec/changes/archive/YYYY-MM-DD-{change-name}/` when filesystem mode applies.
4. Record traceability in the archive report.
5. Persist the archive report.

## Merge Rules

- `ADDED` → append to main spec
- `MODIFIED` → replace matching requirement in main spec
- `REMOVED` → remove matching requirement from main spec
- Preserve every requirement not mentioned in the delta

## Output Format

```markdown
## Change Archived

**Change**: {change-name}
**Archived to**: {location}

### Specs Synced
| Domain | Action | Details |
|--------|--------|---------|
| {domain} | Created/Updated | {summary} |

### Archive Contents
- proposal ✅
- specs ✅
- design ✅
- tasks ✅
- verify-report ✅

### Source of Truth Updated
- `openspec/specs/{domain}/spec.md`

### SDD Cycle Complete
{Closure summary}
```

## Rules

- Sync specs BEFORE moving the change folder.
- Preserve auditability; archived changes are immutable history.
- Use ISO date format for archive paths.
- If the merge is unexpectedly destructive, stop and report it.
- In `engram`, record observation IDs for lineage when available.
