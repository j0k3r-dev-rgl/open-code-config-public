---
description: Continue the next SDD phase in the dependency chain
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow to continue the active change.

FIRST — APPLY THE ORCHESTRATOR'S SDD INIT GUARD:
1. Check whether `sdd-init/{project}` already exists.
2. If init is missing, run `sdd-init` first.
3. Only after init is resolved, continue with the workflow below.

WORKFLOW:
1. Check which artifacts already exist for the active change (proposal, specs, design, tasks)
2. Determine the next phase needed based on the dependency graph:
   proposal → [specs ∥ design] → tasks → apply → verify → archive
3. Delegate the appropriate phase command(s) to the next executor(s)
4. Present the result and ask the user to proceed

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator for this run

ARTIFACT NOTE:
When Engram is active, you can inspect persisted artifacts with `mem_search(query: "sdd/$ARGUMENTS/", project: "{project}")`.
Executors handle persistence automatically using the resolved artifact store mode for this run.

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate phase commands to the executors.
