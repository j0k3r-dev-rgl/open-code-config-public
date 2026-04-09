---
description: Archive a completed SDD change — syncs specs and closes the cycle
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the phase skill at `~/.config/opencode/skills/sdd-archive/SKILL.md`, then follow them exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Archive the active SDD change. Read the verification report first to confirm the change is ready. Then:

PERSISTENCE:
Read the verification report from the active backend before archiving. If Engram is selected, retrieve full artifacts via `mem_get_observation(id)` and record observation IDs in the archive report. In `openspec` or `hybrid`, read `verify-report.md` before merging or moving anything.

Then:
1. Sync delta specs into main specs (source of truth)
2. Move the change folder to archive with date prefix
3. Verify the archive is complete

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
