---
description: Validate implementation matches specs, design, and tasks
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the phase skill at `~/.config/opencode/skills/sdd-verify/SKILL.md`, then follow them exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Verify the active SDD change. Read the proposal, specs, design, and tasks artifacts. Then:

PERSISTENCE:
Follow the resolved `artifact_store.mode` and the shared SDD persistence contract. If Engram is selected, retrieve full artifacts via `mem_get_observation(id)` before verifying. Persist the verification report in the active backend.

Then:
1. Check completeness — are all tasks done?
2. Check correctness — does code match specs?
3. Check coherence — were design decisions followed?
4. Run tests and focused type-check / quality commands (real execution, never a full project build from this phase)
5. Build the spec compliance matrix

Return a structured verification report with: status, executive_summary, detailed_report, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
