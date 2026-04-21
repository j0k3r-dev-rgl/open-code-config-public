---
description: Initialize SDD context — detects project stack and bootstraps persistence backend
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent (executor). Do NOT launch sub-agents or delegate work.

SKILL LOADING (follow in order):
1. If this prompt contains a `## Project Standards (auto-resolved)` block — follow those rules. Do NOT read any SKILL.md files.
2. Otherwise: read ~/.config/opencode/skills/sdd-init/SKILL.md and follow it exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: engram

TASK:
Initialize Spec-Driven Development in this project. Detect the tech stack, existing conventions, and architecture patterns. Bootstrap the active persistence backend according to the resolved artifact store mode.

ENGRAM PERSISTENCE (artifact store mode: engram):
After detecting the project context, save it:
  mem_save(title: "sdd-init/{project}", topic_key: "sdd-init/{project}", type: "architecture", project: "{project}", content: "{detected context}")
topic_key enables upserts — re-running init updates, not duplicates.

Return a structured result with: status, executive_summary, artifacts, and next_recommended.
