---
description: Start a new SDD change — runs exploration then creates a proposal
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow for starting a new change named "$ARGUMENTS".

FIRST — APPLY THE ORCHESTRATOR'S SDD INIT GUARD:
1. Check whether `sdd-init/{project}` already exists.
2. If init is missing, run `sdd-init` first.
3. Only after init is resolved, continue with the workflow below.

THEN — ASK THE USER (before any further phase delegation):
1. Execution mode: **Automatic** (all phases back-to-back, show final result only) or **Interactive** (pause after each phase, ask before continuing)? Default: Interactive.
2. Artifact store: **engram** (fast, no files), **openspec** (file-based, git history), or **hybrid** (both)? Default: engram if available.
Cache both answers for the session — do NOT ask again.

WORKFLOW:
1. Delegate the explore phase command to the `sdd-explore` executor for this change
2. Present the exploration summary to the user (Interactive) or continue immediately (Automatic)
3. Delegate the propose phase command to the `sdd-propose` executor based on the exploration
4. Present the proposal summary and ask the user if they want to continue with specs and design (Interactive) or stop here (Automatic)

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator for this run

ARTIFACT NOTE:
Executors handle persistence automatically using the resolved artifact store mode for this run. When Engram is active, phase artifacts use topic keys like `sdd/$ARGUMENTS/{type}`.

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate phase commands to the executors.
