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
- Artifact store mode: engram

TASK:
Verify the active SDD change: $ARGUMENTS

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns 300-char PREVIEWS, not full content. You MUST call mem_get_observation(id) for EVERY artifact.
STEP A — SEARCH (get IDs only, run in parallel):
  mem_search(query: "sdd/$ARGUMENTS/spec", project: "{project}") → save spec_id
  mem_search(query: "sdd/$ARGUMENTS/design", project: "{project}") → save design_id
  mem_search(query: "sdd/$ARGUMENTS/tasks", project: "{project}") → save tasks_id
  mem_search(query: "sdd/$ARGUMENTS/apply-progress", project: "{project}") → save progress_id
STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
  mem_get_observation(id: tasks_id) → full tasks
  mem_get_observation(id: progress_id) → full apply progress
Save report:
  mem_save(title: "sdd/$ARGUMENTS/verify-report", topic_key: "sdd/$ARGUMENTS/verify-report", type: "architecture", project: "{project}", content: "{verification report}")

Then:
1. Check completeness — are all tasks done?
2. Check correctness — does code match specs?
3. Check coherence — were design decisions followed?
4. Run tests and build (real execution)
5. Build the spec compliance matrix

Return a structured verification report with: status, executive_summary, detailed_report, artifacts, next_recommended, risks, and skill_resolution.
