---
description: Create the technical design for an SDD change
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD design executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: engram

TASK:
Create the technical design for SDD change `$ARGUMENTS`.

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns previews only. Retrieve full content before using proposal text.
Read proposal:
  mem_search(query: "sdd/$ARGUMENTS/proposal", project: "{project}") → save proposal_id
  mem_get_observation(id: proposal_id) → full proposal
Save design:
  mem_save(title: "sdd/$ARGUMENTS/design", topic_key: "sdd/$ARGUMENTS/design", type: "architecture", project: "{project}", content: "{design}")

The design should define:
1. Architecture / component changes
2. Data flow and interfaces
3. Key technical decisions and tradeoffs
4. Implementation constraints relevant to tasks and apply

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, and skill_resolution.
