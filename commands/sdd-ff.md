---
description: Fast-forward all SDD planning phases — proposal through tasks
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow to fast-forward all planning phases for change "$ARGUMENTS".

FIRST — APPLY THE ORCHESTRATOR'S SDD INIT GUARD:
1. Check whether `sdd-init/{project}` already exists.
2. If init is missing, run `sdd-init` first.
3. Only after init is resolved, continue with the workflow below.

THEN — ASK THE USER (before any further phase delegation, only if not already cached this session):
1. Execution mode: **Automatic** (all phases back-to-back, show combined summary at the end) or **Interactive** (pause after each phase, ask before continuing)? Default: Automatic (ff is designed for speed).
2. Artifact store: **engram** (fast, no files), **openspec** (file-based, git history), or **hybrid** (both)? Default: engram if available.
Cache both answers for the session — do NOT ask again.

WORKFLOW:
Delegate these phase commands in sequence:
1. `sdd-propose` — create the proposal
2. `sdd-spec` — write specifications
3. `sdd-design` — create technical design
4. `sdd-tasks` — break down into implementation tasks

In Automatic mode: present a combined summary after ALL phases complete.
In Interactive mode: pause after each phase, show result, ask "¿Continuamos? / Continue?" before the next.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: resolved by the orchestrator for this run

ARTIFACT NOTE:
Executors handle persistence automatically using the resolved artifact store mode for this run. When Engram is active, phase artifacts use topic keys like `sdd/$ARGUMENTS/{type}` where type is: proposal, spec, design, tasks.

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate phase commands to the executors.
