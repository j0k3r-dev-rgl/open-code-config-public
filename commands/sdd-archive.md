---
description: Archive a completed SDD change — syncs specs and closes the cycle
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD archive executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: engram

TASK:
Archive the active SDD change: $ARGUMENTS

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns 300-char PREVIEWS, not full content. You MUST call mem_get_observation(id) for EVERY artifact.
STEP A — SEARCH (get IDs only, run in parallel):
  mem_search(query: "sdd/$ARGUMENTS/proposal", project: "{project}") → save proposal_id
  mem_search(query: "sdd/$ARGUMENTS/spec", project: "{project}") → save spec_id
  mem_search(query: "sdd/$ARGUMENTS/design", project: "{project}") → save design_id
  mem_search(query: "sdd/$ARGUMENTS/tasks", project: "{project}") → save tasks_id
  mem_search(query: "sdd/$ARGUMENTS/verify-report", project: "{project}") → save verify_id
STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
  mem_get_observation(id: proposal_id) → full proposal
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
  mem_get_observation(id: tasks_id) → full tasks
  mem_get_observation(id: verify_id) → full verification report
Record all observation IDs in the archive report for traceability.
Save:
  mem_save(title: "sdd/$ARGUMENTS/archive-report", topic_key: "sdd/$ARGUMENTS/archive-report", type: "architecture", project: "{project}", content: "{archive report with observation IDs}")

Then:
1. Sync delta specs into main specs (source of truth)
2. Move the change folder to archive with date prefix
3. Verify the archive is complete

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, and skill_resolution.
