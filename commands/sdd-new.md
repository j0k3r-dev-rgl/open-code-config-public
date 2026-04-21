---
description: Start a new SDD change — runs exploration then creates a proposal
agent: sdd-orchestrator
---

Follow the SDD orchestrator workflow for starting a new change named "$ARGUMENTS".

FIRST — ASK THE USER (before any delegation):
1. Execution mode: **Automatic** (all phases back-to-back, show final result only) or **Interactive** (pause after each phase, ask before continuing)? Default: Interactive.
2. Artifact store: **engram** (fast, no files), **openspec** (file-based, git history), or **hybrid** (both)? Default: engram if available.
Cache both answers for the session — do NOT ask again.

WORKFLOW:
1. Launch sdd-explore sub-agent to investigate the codebase for this change
2. Present the exploration summary to the user (Interactive) or continue immediately (Automatic)
3. Launch sdd-propose sub-agent to create a proposal based on the exploration
4. Present the proposal summary and ask the user if they want to continue with specs and design (Interactive) or stop here (Automatic)

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Change name: $ARGUMENTS
- Artifact store mode: engram (override with user choice above)

ENGRAM NOTE:
Sub-agents handle persistence automatically. Each phase saves its artifact to engram with topic_key "sdd/$ARGUMENTS/{type}".

Read the orchestrator instructions to coordinate this workflow. Do NOT execute phase work inline — delegate to sub-agents.
