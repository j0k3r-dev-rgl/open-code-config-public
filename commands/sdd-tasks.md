---
description: Break an SDD change into implementation tasks
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the skill file at `~/.config/opencode/skills/sdd-tasks/SKILL.md`, then follow them exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Create or update the implementation task breakdown for the active SDD change.

PERSISTENCE:
Follow the resolved `artifact_store.mode` and the shared SDD persistence contract.

Return a structured result with: status, executive_summary, detailed_report, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
