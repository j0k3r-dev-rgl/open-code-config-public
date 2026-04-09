---
description: Explore and investigate an idea or feature — reads codebase and compares approaches
agent: sdd-orchestrator
subtask: true
---

You are an SDD sub-agent. Read the shared phase protocol at `~/.config/opencode/skills/_shared/sdd-phase-common.md` and the phase skill at `~/.config/opencode/skills/sdd-explore/SKILL.md`, then follow them exactly.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Topic to explore: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator and passed at launch time

TASK:
Explore the topic "$ARGUMENTS" in this codebase. Investigate the current state, identify affected areas, compare approaches, and provide a recommendation.

PERSISTENCE:
Read and persist artifacts according to the resolved `artifact_store.mode`. If Engram is selected, remember that `mem_search` previews are truncated and full content requires `mem_get_observation(id)`.

This is an exploration only — do NOT create any files or modify code. Just research and return your analysis.

Return a structured result with: status, executive_summary, detailed_report, artifacts, next_recommended, risks, skill_resolution, and persistence_mode.
