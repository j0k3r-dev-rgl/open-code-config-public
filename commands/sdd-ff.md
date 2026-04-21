---
description: Fast-forward all SDD planning phases — proposal through tasks
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow to fast-forward all planning phases for change "$ARGUMENTS".

FIRST — ASK THE USER (before any delegation, only if not already cached this session):
1. Execution mode: **Automatic** (all phases back-to-back, show combined summary at the end) or **Interactive** (pause after each phase, ask before continuing)? Default: Automatic (ff is designed for speed).
2. Artifact store: **engram** (fast, no files), **openspec** (file-based, git history), or **hybrid** (both)? Default: engram if available.
Cache both answers for the session — do NOT ask again.

WORKFLOW:
Run these sub-agents in sequence:
1. sdd-propose — create the proposal
2. sdd-spec — write specifications
3. sdd-design — create technical design
4. sdd-tasks — break down into implementation tasks

In Automatic mode: present a combined summary after ALL phases complete.
In Interactive mode: pause after each phase, show result, ask "¿Continuamos? / Continue?" before the next.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: engram (override with user choice above)

ENGRAM NOTE:
Sub-agents handle persistence automatically. Each phase saves its artifact to engram with topic_key "sdd/$ARGUMENTS/{type}" where type is: proposal, spec, design, tasks.

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate to sub-agents.
