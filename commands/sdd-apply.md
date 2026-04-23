---
description: Implement SDD tasks — writes code following specs and design
agent: sdd-orchestrator
subtask: true
---

This delegated phase command is the operational payload for the SDD apply executor.

Command contract:
- This file defines the phase-specific work for THIS run.
- The executor prompt remains minimal and enforces execution boundaries.
- If `## Project Standards (auto-resolved)` is present, apply it before doing work.
- Load the full base skill only if the executor prompt tells you it is necessary because this command and injected standards are insufficient.

The sdd-apply skill supports TDD workflow (RED-GREEN-REFACTOR cycle) when `strict_tdd: true` is detected. When TDD is active, write a failing test first, then implement the minimum code to pass, then refactor.

CONTEXT:
- Working directory: !`echo -n "$(pwd)"`
- Current project: !`echo -n "$(basename $(pwd))"`
- Artifact store mode: resolved by the orchestrator for this run

TASK:
Implement the remaining incomplete tasks for the active SDD change: $ARGUMENTS

ARTIFACT PERSISTENCE:
Use the resolved artifact store mode for this run.
- If artifact store mode is `engram` or `hybrid`:
  - CRITICAL: `mem_search` returns previews only. You MUST call `mem_get_observation(id)` for EVERY artifact.
  - STEP A — SEARCH (get IDs only, run in parallel):
    - `mem_search(query: "sdd/$ARGUMENTS/spec")` → save spec_id
    - `mem_search(query: "sdd/$ARGUMENTS/design")` → save design_id
    - `mem_search(query: "sdd/$ARGUMENTS/tasks")` → save tasks_id
  - STEP A2 — CHECK PREVIOUS PROGRESS (before starting work):
    - `mem_search(query: "sdd/$ARGUMENTS/apply-progress")` → if found, save progress_id
  - STEP B — RETRIEVE FULL CONTENT (mandatory, run in parallel):
    - `mem_get_observation(id: spec_id)` → full spec
    - `mem_get_observation(id: design_id)` → full design
    - `mem_get_observation(id: tasks_id)` → full tasks
    - IF progress_id exists: `mem_get_observation(id: progress_id)` → read previous progress and merge
  - Update tasks as you complete them:
    - `mem_update(id: {tasks-observation-id}, content: "{updated tasks with [x] marks}")`
  - Save progress:
    - `mem_save(title: "sdd/$ARGUMENTS/apply-progress", topic_key: "sdd/$ARGUMENTS/apply-progress", type: "architecture", content: "{progress report}")`
  - Record the saved observation ID for apply-progress in `artifacts`.
- If artifact store mode is `openspec` or `hybrid`:
  - Write the apply-progress/task updates to the filesystem path chosen by the phase workflow.
  - Record the written path in `artifacts`.
- If artifact store mode is `none`:
  - Return the result inline only and do not persist artifacts.

For each task:
1. Read the relevant spec scenarios (acceptance criteria)
2. Read the design decisions (technical approach)
3. Read existing code patterns in the project
4. Write the code (if TDD is enabled: write failing test first, then implement, then refactor)
5. Mark the task as complete [x]

Return a structured result with: status, executive_summary, detailed_report (optional), artifacts, next_recommended, risks, and skill_resolution.
