---
description: Validate implementation matches specs, design, and tasks
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD verify executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator for this run

TASK:
Verify the active SDD change: $ARGUMENTS

ARTIFACT PERSISTENCE:
Use the resolved artifact store mode for this run.
- If artifact store mode is `engram` or `hybrid`:
  - CRITICAL: `mem_search` returns previews only. You MUST call `mem_get_observation(id)` for EVERY artifact.
  - STEP A — SEARCH (get IDs only, run in parallel):
    - `mem_search(query: "sdd/$ARGUMENTS/spec", project: "{project}")` → save spec_id
    - `mem_search(query: "sdd/$ARGUMENTS/design", project: "{project}")` → save design_id
    - `mem_search(query: "sdd/$ARGUMENTS/tasks", project: "{project}")` → save tasks_id
    - `mem_search(query: "sdd/$ARGUMENTS/apply-progress", project: "{project}")` → save progress_id
  - STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
    - `mem_get_observation(id: spec_id)` → full spec
    - `mem_get_observation(id: design_id)` → full design
    - `mem_get_observation(id: tasks_id)` → full tasks
    - `mem_get_observation(id: progress_id)` → full apply progress
  - Save report with `mem_save(...)` under `sdd/$ARGUMENTS/verify-report` and record the observation ID in `artifacts`.
- If artifact store mode is `openspec` or `hybrid`:
  - Write the verify artifact to the filesystem path chosen by the phase workflow.
  - Record the written path in `artifacts`.
- If artifact store mode is `none`:
  - Return the result inline only and do not persist artifacts.

Then:
1. Check completeness — are all tasks done?
2. Check correctness — does code match specs?
3. Check coherence — were design decisions followed?
4. Run tests and build (real execution)
5. Build the spec compliance matrix

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
