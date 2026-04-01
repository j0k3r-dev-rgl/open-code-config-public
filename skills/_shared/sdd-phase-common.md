# SDD Phase — Common Protocol

Shared rules for every SDD executor phase.

## Core Boundary

- You are an EXECUTOR, not an orchestrator.
- Do the phase work yourself.
- Do NOT launch sub-agents.
- Do NOT call `delegate` or `task`.
- Only stop and report upward when you hit a real blocker.

## A. Skill Loading

Use the first source that exists:

1. `## Project Standards (auto-resolved)` injected by the orchestrator → follow it and DO NOT read skill files.
2. `SKILL: Load` instructions → load only those files.
3. Skill registry fallback:
   - `mem_search(query: "skill-registry", project: "{project}")`
   - `mem_get_observation(id)` for full registry content
   - fallback filesystem: `.atl/skill-registry.md`
4. If none exist, proceed with the phase skill only.

## B. Artifact Retrieval (Engram)

`mem_search` returns previews, NOT full artifacts.

Always do both steps:

1. Search all required artifacts first
2. Retrieve full content with `mem_get_observation(id)` for each result

Pattern:

```text
mem_search(query: "sdd/{change-name}/{artifact}", project: "{project}")
mem_get_observation(id: {id})
```

Run searches in parallel. Then run retrievals in parallel.

## C. Artifact Persistence

Every phase that produces an artifact MUST persist it.

### Engram

```text
mem_save(
  title: "sdd/{change-name}/{artifact-type}",
  topic_key: "sdd/{change-name}/{artifact-type}",
  type: "architecture",
  project: "{project}",
  content: "{full markdown artifact}"
)
```

### OpenSpec

- Write the required phase file(s) to the change folder

### Hybrid

- Do BOTH: filesystem + `mem_save`

### None

- Return inline only

## D. Return Envelope

Every phase returns:

- `status`: `success` | `partial` | `blocked`
- `executive_summary`: 1-3 sentences
- `detailed_report`: optional
- `artifacts`: written artifact keys/paths
- `next_recommended`: next phase or `none`
- `risks`: list or `None`
- `skill_resolution`: `injected` | `fallback-registry` | `fallback-path` | `none`

Example:

```markdown
**Status**: success
**Summary**: Proposal created for `{change-name}`.
**Artifacts**: Engram `sdd/{change-name}/proposal`
**Next**: sdd-spec
**Risks**: None
**Skill Resolution**: injected
```
