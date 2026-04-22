---
description: Explore and investigate an idea or feature — reads codebase and compares approaches
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD explore executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Topic to explore: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator for this run

TASK:
Explore the topic "$ARGUMENTS" in this codebase. Investigate the current state, identify affected areas, compare approaches, and provide a recommendation.

ARTIFACT PERSISTENCE:
Read project context (optional when Engram is available):
  mem_search(query: "sdd-init/{project}", project: "{project}") → if found, mem_get_observation(id) for full content
- If artifact store mode is `engram`: save exploration with `mem_save(...)` under `sdd/$ARGUMENTS/explore` and record the observation ID in `artifacts`.
- If artifact store mode is `openspec`: write the exploration artifact to the filesystem path chosen by the phase workflow and return that path in `artifacts`.
- If artifact store mode is `hybrid`: do BOTH and return both the filesystem path and the Engram observation ID in `artifacts`.
- If artifact store mode is `none`: return the result inline only and do not persist artifacts.

This is an exploration only — do NOT create any files or modify code. Just research and return your analysis.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
