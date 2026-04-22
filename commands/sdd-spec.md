---
description: Write the SDD specification from the approved proposal
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD spec executor.

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
Write the SDD specification for change `$ARGUMENTS`.

ENGRAM PERSISTENCE (artifact store mode: engram):
CRITICAL: mem_search returns previews only. Retrieve full content before using proposal text.
Read proposal:
  mem_search(query: "sdd/$ARGUMENTS/proposal", project: "{project}") → save proposal_id
  mem_get_observation(id: proposal_id) → full proposal
Save spec:
  mem_save(title: "sdd/$ARGUMENTS/spec", topic_key: "sdd/$ARGUMENTS/spec", type: "architecture", project: "{project}", content: "{specification}")

The spec should define:
1. Requirements / acceptance criteria
2. User or system scenarios
3. Behavioral expectations
4. Boundaries that verification can later check

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, and skill_resolution.
