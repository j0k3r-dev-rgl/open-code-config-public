---
description: Initialize SDD context — detects project stack and bootstraps persistence backend
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the phase skill at `~/.config/opencode/skills/sdd-init/SKILL.md`, then follow them exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Initialize Spec-Driven Development in this project. Detect the tech stack, existing conventions, and architecture patterns. Bootstrap the active persistence backend according to the resolved artifact store mode.

PERSISTENCE:
Follow the resolved `artifact_store.mode` and the shared SDD persistence contract. Do not assume Engram is available unless the runtime actually exposes `mem_*` tools.

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
