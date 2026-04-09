---
description: Continue the next SDD phase in the dependency chain
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow to continue the active change.

WORKFLOW:
1. Read the persisted DAG state for the active change first (`sdd/{change-name}/state` in Engram or `openspec/changes/{change-name}/state.yaml` in OpenSpec)
2. If state is unavailable, check which artifacts already exist for the active change (proposal, specs, design, tasks, apply-progress, verify-report)
3. Determine the next phase needed based on the dependency graph:
   proposal → [spec, design] → tasks → apply → verify → archive
4. Launch the appropriate sub-agent(s) for the next phase
5. Present the result and ask the user to proceed

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator and cached for the session

PERSISTENCE NOTE:
Use persisted state first. In Engram mode, recover via topic key and then retrieve the full observation. In OpenSpec mode, read `state.yaml`. Use broad artifact search only as a fallback.

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate to sub-agents.
