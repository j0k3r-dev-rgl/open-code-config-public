---
name: sdd-explore
description: Compact exploration rules for investigating a change before planning it.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Investigate the codebase, compare approaches, and return a concise recommendation.

## Inputs

- Topic or feature to explore
- Artifact mode: `engram | openspec | hybrid | none`
- Optional change name

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `explore`
- Topic key: `sdd/{change-name}/explore` or `sdd/explore/{topic-slug}` when standalone

## Retrieval Rules

- `engram`: optionally read `sdd-init/{project}` and related `sdd/` artifacts
- `openspec`: read `openspec/config.yaml` and relevant `openspec/specs/`
- `hybrid`: use Engram first, filesystem as fallback
- `none`: use only the prompt context

## Preferred Tools

- `find_symbol`
- `trace_symbol`
- `trace_callers`
- `grep_workspace`
- `scan_module`
- `list_endpoints`

## Workflow

1. Clarify the request: feature, bug, refactor, or uncertainty.
2. Investigate real code and existing patterns.
3. Identify affected files/modules and constraints.
4. Compare viable approaches only if there is a real choice.
5. Recommend one approach with risks.
6. Persist the artifact when the mode requires it.

## Output Format

```markdown
## Exploration: {topic}

### Current State
{How it works today}

### Affected Areas
- `path/to/file` — {why}

### Approaches
1. **{Option}** — {brief description}
   - Pros: {list}
   - Cons: {list}
   - Effort: {Low/Medium/High}

### Recommendation
{Recommended option and why}

### Risks
- {risk}

### Ready for Proposal
{Yes/No and what is missing if No}
```

## Rules

- Read real code. Never guess.
- Do NOT modify application code.
- Only create `exploration.md` when the mode and change flow require it.
- Keep it concise: enough to decide, not a novel.
- If information is missing, say exactly what is missing.
