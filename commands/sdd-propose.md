---
description: Create a change proposal from exploration findings
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD propose executor.

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
Create the SDD proposal for change `$ARGUMENTS`.

ENGRAM PERSISTENCE (artifact store mode: engram):
Read exploration if it exists:
  mem_search(query: "sdd/$ARGUMENTS/explore", project: "{project}") → if found, save explore_id
  IF explore_id exists: mem_get_observation(id: explore_id) → full exploration
Save proposal:
  mem_save(title: "sdd/$ARGUMENTS/proposal", topic_key: "sdd/$ARGUMENTS/proposal", type: "architecture", project: "{project}", content: "{proposal}")

The proposal should clearly capture:
1. Problem / opportunity
2. Scope and non-goals
3. Recommended approach
4. Risks, tradeoffs, and open questions

Return a structured result with: status, executive_summary, artifacts, next_recommended, risks, and skill_resolution.
