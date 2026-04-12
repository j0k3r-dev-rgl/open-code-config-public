---
description: Validate implementation matches specs, design, and tasks
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the skill file at ~/.config/opencode/skills/sdd-verify/SKILL.md FIRST, then follow its instructions exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Resolved project: {project} (provided by runtime/orchestrator; do not recalculate locally)
- Artifact store mode: engram

TASK:
Verify the active SDD change. Read the proposal, specs, design, and tasks artifacts. Then:

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns 300-char PREVIEWS, not full content. Prefer mem_recall_resolved_projects first; if you fall back to mem_search, you MUST call mem_get_observation(id) for EVERY artifact.
STEP A — SEARCH (get IDs only):
  prefer mem_recall_resolved_projects(query: "sdd/{change-name}/spec")
  prefer mem_recall_resolved_projects(query: "sdd/{change-name}/design")
  prefer mem_recall_resolved_projects(query: "sdd/{change-name}/tasks")
  fallback: mem_search(query: "sdd/{change-name}/spec", project: "{project}") → save spec_id
  fallback: mem_search(query: "sdd/{change-name}/design", project: "{project}") → save design_id
  fallback: mem_search(query: "sdd/{change-name}/tasks", project: "{project}") → save tasks_id
STEP B — RETRIEVE FULL CONTENT (mandatory):
  mem_get_observation(id: spec_id) → full spec
  mem_get_observation(id: design_id) → full design
  mem_get_observation(id: tasks_id) → full tasks
Save report:
  mem_save(title: "sdd/{change-name}/verify-report", topic_key: "sdd/{change-name}/verify-report", type: "architecture", project: "{project}", content: "{verification report}")

Then:
1. Check completeness — are all tasks done?
2. Check correctness — does code match specs?
3. Check coherence — were design decisions followed?
4. Run tests and build (real execution)
5. Build the spec compliance matrix

Return a structured verification report with: status, executive_summary, detailed_report, artifacts, and next_recommended.
