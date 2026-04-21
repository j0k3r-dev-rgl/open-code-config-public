---
description: Validate implementation matches specs, design, and tasks
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent (executor). Do NOT launch sub-agents or delegate work.

SKILL LOADING (follow in order):
1. If this prompt contains a `## Project Standards (auto-resolved)` block — follow those rules. Do NOT read any SKILL.md files.
2. Otherwise: read ~/.config/opencode/skills/sdd-verify/SKILL.md and follow it exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: engram

TASK:
Verify the active SDD change: $ARGUMENTS

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns 300-char PREVIEWS, not full content. You MUST call mem_get_observation(id) for EVERY artifact.
STEP A — SEARCH (get IDs only, run in parallel):
  mem_search(query: "sdd/$ARGUMENTS/spec", project: "$ARGUMENTS") → save spec_id
  mem_search(query: "sdd/$ARGUMENTS/design", project: "$ARGUMENTS") → save design_id
  mem_search(query: "sdd/$ARGUMENTS/tasks", project: "$ARGUMENTS") → save tasks_id
  mem_search(query: "sdd/$ARGUMENTS/apply-progress", project: "$ARGUMENTS") → save progress_id
STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
  mem_get_observation(id: tasks_id) → full tasks
  mem_get_observation(id: progress_id) → full apply progress
Save report:
  mem_save(title: "sdd/$ARGUMENTS/verify-report", topic_key: "sdd/$ARGUMENTS/verify-report", type: "architecture", project: "$ARGUMENTS", content: "{verification report}")

Then:
1. Check completeness — are all tasks done?
2. Check correctness — does code match specs?
3. Check coherence — were design decisions followed?
4. Run tests and build (real execution)
5. Build the spec compliance matrix

Return a structured verification report with: status, executive_summary, detailed_report, artifacts, and next_recommended.
