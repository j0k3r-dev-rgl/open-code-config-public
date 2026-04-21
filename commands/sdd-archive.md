---
description: Archive a completed SDD change — syncs specs and closes the cycle
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent (executor). Do NOT launch sub-agents or delegate work.

SKILL LOADING (follow in order):
1. If this prompt contains a `## Project Standards (auto-resolved)` block — follow those rules. Do NOT read any SKILL.md files.
2. Otherwise: read ~/.config/opencode/skills/sdd-archive/SKILL.md and follow it exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: engram

TASK:
Archive the active SDD change: $ARGUMENTS

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns 300-char PREVIEWS, not full content. You MUST call mem_get_observation(id) for EVERY artifact.
STEP A — SEARCH (get IDs only, run in parallel):
  mem_search(query: "sdd/$ARGUMENTS/proposal", project: "$ARGUMENTS") → save proposal_id
  mem_search(query: "sdd/$ARGUMENTS/spec", project: "$ARGUMENTS") → save spec_id
  mem_search(query: "sdd/$ARGUMENTS/design", project: "$ARGUMENTS") → save design_id
  mem_search(query: "sdd/$ARGUMENTS/tasks", project: "$ARGUMENTS") → save tasks_id
  mem_search(query: "sdd/$ARGUMENTS/verify-report", project: "$ARGUMENTS") → save verify_id
STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
  mem_get_observation(id: proposal_id) → full proposal
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
  mem_get_observation(id: tasks_id) → full tasks
  mem_get_observation(id: verify_id) → full verification report
Record all observation IDs in the archive report for traceability.
Save:
  mem_save(title: "sdd/$ARGUMENTS/archive-report", topic_key: "sdd/$ARGUMENTS/archive-report", type: "architecture", project: "$ARGUMENTS", content: "{archive report with observation IDs}")

Then:
1. Sync delta specs into main specs (source of truth)
2. Move the change folder to archive with date prefix
3. Verify the archive is complete

Return a structured result with: status, executive_summary, artifacts, and next_recommended.
