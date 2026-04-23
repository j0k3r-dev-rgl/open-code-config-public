---
description: Create a change proposal from exploration findings
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD propose executor.

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
Create the SDD proposal for change `$ARGUMENTS`.

ARTIFACT PERSISTENCE:
Read exploration if it exists and Engram is available:
  mem_search(query: "sdd/$ARGUMENTS/explore") → if found, save explore_id
  IF explore_id exists: mem_get_observation(id: explore_id) → full exploration
- If artifact store mode is `engram`: save proposal with `mem_save(...)` under `sdd/$ARGUMENTS/proposal` and record the observation ID in `artifacts`.
- If artifact store mode is `openspec`: write the proposal artifact to the filesystem path chosen by the phase workflow and return that path in `artifacts`.
- If artifact store mode is `hybrid`: do BOTH and return both the filesystem path and the Engram observation ID in `artifacts`.
- If artifact store mode is `none`: return the result inline only and do not persist artifacts.

The proposal should clearly capture:
1. Problem / opportunity
2. Scope and non-goals
3. Recommended approach
4. Risks, tradeoffs, and open questions

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
