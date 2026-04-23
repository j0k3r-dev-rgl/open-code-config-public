---
description: Write the SDD specification from the approved proposal
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD spec executor.

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
Write the SDD specification for change `$ARGUMENTS`.

ARTIFACT PERSISTENCE:
CRITICAL: when using Engram, `mem_search` returns previews only. Retrieve full content before using proposal text.
Read proposal when Engram is available:
  mem_search(query: "sdd/$ARGUMENTS/proposal") → save proposal_id
  mem_get_observation(id: proposal_id) → full proposal
- If artifact store mode is `engram`: save spec with `mem_save(...)` under `sdd/$ARGUMENTS/spec` and record the observation ID in `artifacts`.
- If artifact store mode is `openspec`: write the spec artifact to the filesystem path chosen by the phase workflow and return that path in `artifacts`.
- If artifact store mode is `hybrid`: do BOTH and return both the filesystem path and the Engram observation ID in `artifacts`.
- If artifact store mode is `none`: return the result inline only and do not persist artifacts.

The spec should define:
1. Requirements / acceptance criteria
2. User or system scenarios
3. Behavioral expectations
4. Boundaries that verification can later check

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
