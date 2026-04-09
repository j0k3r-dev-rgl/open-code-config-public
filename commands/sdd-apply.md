---
description: Implement SDD tasks — writes code following specs and design
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the phase skill at `~/.config/opencode/skills/sdd-apply/SKILL.md`, then follow them exactly.

The sdd-apply skill (v2.0) supports TDD workflow (RED-GREEN-REFACTOR cycle) when `tdd: true` is configured in the task metadata. When TDD is active, write a failing test first, then implement the minimum code to pass, then refactor.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Implement the remaining incomplete tasks for the active SDD change.

PERSISTENCE:
Follow the resolved `artifact_store.mode` and the shared SDD persistence contract. If Engram is selected, retrieve full artifacts via `mem_get_observation(id)` and persist both task updates and `apply-progress`. In `openspec` or `hybrid`, update `tasks.md` and persist `apply-progress.md` on the filesystem.

For each task:
1. Read the relevant spec scenarios (acceptance criteria)
2. Read the design decisions (technical approach)
3. Read existing code patterns in the project
4. Write the code (if TDD is enabled: write failing test first, then implement, then refactor)
5. Mark the task as complete [x]

Return a structured result with: status, executive_summary, detailed_report, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
