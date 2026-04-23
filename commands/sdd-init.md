---
description: Initialize SDD context — detects project stack and bootstraps persistence backend
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD init executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator for this run

TASK:
Initialize Spec-Driven Development in this project. Detect the tech stack, existing conventions, and architecture patterns. Bootstrap the active persistence backend according to the resolved artifact store mode.

ARTIFACT PERSISTENCE:
- If artifact store mode is `engram`: save project context with `mem_save(title: "sdd-init/{project}", topic_key: "sdd-init/{project}", type: "architecture", content: "{detected context}")` and record the saved observation ID in `artifacts`.
- If artifact store mode is `openspec`: write the init artifact to the filesystem path chosen by the phase workflow and return that path in `artifacts`.
- If artifact store mode is `hybrid`: do BOTH and return both the filesystem path and the Engram observation ID in `artifacts`.
- If artifact store mode is `none`: return the result inline only and do not persist artifacts.

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
