---
description: Guided SDD walkthrough — onboard a user through the full SDD cycle using their real codebase
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent (executor). Do NOT launch sub-agents or delegate work.

SKILL LOADING (follow in order):
1. If this prompt contains a `## Project Standards (auto-resolved)` block — follow those rules. Do NOT read any SKILL.md files.
2. Otherwise: read ~/.config/opencode/skills/sdd-onboard/SKILL.md and follow it exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: engram

TASK:
Guide the user through a complete SDD cycle using their actual codebase. This is a real change with real artifacts, not a toy example. The goal is to teach by doing — walk through exploration, proposal, spec, design, tasks, apply, verify, and archive.

ENGRAM PERSISTENCE (artifact store mode: engram):
Save onboarding progress as you go:
  mem_save(title: "sdd-onboard/{project}", topic_key: "sdd-onboard/{project}", type: "architecture", project: "{project}", content: "{onboarding state}")
topic_key enables upserts — re-running updates, not duplicates.

Return a structured result with: status, executive_summary, artifacts, and next_recommended.
