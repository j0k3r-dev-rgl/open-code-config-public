---
description: Break spec and design into implementation task slices
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD tasks executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator for this run

TASK:
Break SDD change `$ARGUMENTS` into clear implementation tasks.

ARTIFACT PERSISTENCE:
CRITICAL: when using Engram, `mem_search` returns previews only. Retrieve full content before using artifacts.
Read dependencies when Engram is available:
  mem_search(query: "sdd/$ARGUMENTS/spec", project: "{project}") → save spec_id
  mem_search(query: "sdd/$ARGUMENTS/design", project: "{project}") → save design_id
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
- If artifact store mode is `engram`: save tasks with `mem_save(...)` under `sdd/$ARGUMENTS/tasks` and record the observation ID in `artifacts`.
- If artifact store mode is `openspec`: write the tasks artifact to the filesystem path chosen by the phase workflow and return that path in `artifacts`.
- If artifact store mode is `hybrid`: do BOTH and return both the filesystem path and the Engram observation ID in `artifacts`.
- If artifact store mode is `none`: return the result inline only and do not persist artifacts.

The tasks should:
1. Be ordered and implementation-ready
2. Map back to spec requirements and design decisions
3. Be small enough for apply batches
4. Mark clear completion criteria per task

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
