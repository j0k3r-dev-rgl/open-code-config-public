---
name: skill-registry
description: >
  Create or update the skill registry for the current project. Scans user skills and project conventions, writes .atl/skill-registry.md, and saves to engram if available.
  Trigger: When user says "update skills", "skill registry", "actualizar skills", "update registry", or after installing/removing skills.
license: MIT
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Purpose

You generate or update the **skill registry** — a project-aware catalog of relevant skills with **compact rules** (pre-digested, 5-15 line summaries) that any delegator injects directly into sub-agent prompts. Sub-agents do NOT read the registry or individual SKILL.md files — they receive compact rules pre-resolved in their launch prompt.

This skill filters available user skills based on the project's detected stack, language, and workflows to ensure sub-agents only receive relevant standards.

This is the foundation of the **Skill Resolver Protocol** (see `_shared/skill-resolver.md`). The registry is built ONCE (expensive), then read cheaply at every delegation.

## When to Run

- After installing or removing skills
- After setting up a new project
- When the user explicitly asks to update the registry
- As part of `sdd-init` (it calls this same logic)

## What to Do

### Step 1: Filter & Scan User Skills (STRICT FILESYSTEM SOURCE)

**MANDATORY: You MUST derive the list of skills ONLY from a current filesystem scan. Do NOT use skills from memory, prompt inventory, or available-skills lists unless they are verified on disk in this step.**

1. Glob for `*/SKILL.md` files in `~/.config/opencode/skills/` only.
2. **VERIFY EXISTENCE**: For every skill being considered, you MUST confirm the `SKILL.md` file exists on disk. If a skill exists in your prompt/context/inventory but NOT on disk, it is a "ghost skill" and MUST be excluded.
3. Filter the discovered skill list using these strict categories:
   - **stack-bound**: Include ONLY when hard project signals (language/framework/tooling) are present in the workspace.
     - **Match rule**: Skill triggers (e.g., "go", "react", "spring", "vitest") must match detected tech stack exactly.
     - **Hard Signal rule**: `go-testing` matches ONLY if `.go` or `go.mod` exists. Generic "testing" language in a prompt is NOT enough to include stack-bound skills.
   - **workflow-general**: Include automatically only for lightweight, broadly reusable project workflows that are clearly justified by the current task or workspace.
     - **Docs rule**: `documentation` or `RFC` match if the task involves writing specs or designs.
   - **intent-only**: NEVER auto-include in the `.atl/skill-registry.md`. These are specialized tools loaded ONLY when a user or task explicitly invokes them.
     - **Explicitly Skip**: `judgment-day`, `skill-creator`, `engram-pending-tasks`, `branch-pr`, `issue-creation`.
   - **ALWAYS SKIP**: `sdd-*`, `_shared`, and `skill-registry`.
4. For each RELEVANT skill found, read the **full SKILL.md** (if a SKILL.md exceeds 200 lines, focus on the frontmatter and Critical Patterns / Rules sections only) to extract:
   - `name` field (from frontmatter)
   - `description` field → extract the trigger text (after "Trigger:" in the description)
   - **Compact rules** — the actionable patterns and constraints (see Step 1b)
5. Build a table of: Trigger | Skill Name | Full Path

### Step 1b: Generate Compact Rules

For each skill found in Step 1, generate a **compact rules block** (5-15 lines max) containing ONLY:
- Actionable rules and constraints ("do X", "never Y", "prefer Z over W")
- Key patterns with one-line examples where critical
- Breaking changes or gotchas that would cause bugs if missed

**DO NOT include**: purpose/motivation, when-to-use, full code examples, installation steps, or anything the sub-agent doesn't need to APPLY the skill.

Format per skill:
```markdown
### {skill-name}
- Rule 1
- Rule 2
- ...
```

**Example** — compact rules for a React 19 skill:
```markdown
### react-19
- No useMemo/useCallback — React Compiler handles memoization automatically
- use() hook for promises/context, replaces useEffect for data fetching
- Server Components by default, add 'use client' only for interactivity/hooks
- ref is a regular prop — no forwardRef needed
- Actions: use useActionState for form mutations, useOptimistic for optimistic UI
- Metadata: export metadata object from page/layout, no <Head> component
```

**The compact rules are the MOST IMPORTANT output of this skill.** They are what sub-agents actually receive. Invest time making them accurate and concise.

### Step 2: Scan Project Conventions

1. Check the project root for `AGENTS.md` only.
2. If found: READ its contents and extract all referenced file paths. Include both the index file and every referenced path in the registry table.
3. The final table should include `AGENTS.md` AND all paths it references — zero extra hops for sub-agents.

### Step 3: Write the Registry

Build the registry markdown:

```markdown
# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| {trigger from frontmatter} | {skill name} | {full path to SKILL.md} |
| ... | ... | ... |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### {skill-name-1}
- Rule 1
- Rule 2
- ...

### {skill-name-2}
- Rule 1
- Rule 2
- ...

{repeat for each skill}

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| {index file} | {path} | Index — references files below |
| {referenced file} | {extracted path} | Referenced by {index file} |
| {standalone file} | {path} | |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
```

### Step 4: Persist the Registry

**This step is MANDATORY — do NOT skip it.**

#### A. Always write the file (guaranteed availability):

Create the `.atl/` directory in the project root if it doesn't exist, then write:

```
.atl/skill-registry.md
```

#### B. If engram is available, also save to engram (cross-session bonus):

```
mem_save(
  title: "skill-registry",
  topic_key: "skill-registry",
  type: "config",
  content: "{registry markdown from Step 3}"
)
```

`topic_key` ensures upserts — running again updates the same observation.

### Step 5: Return Summary

```markdown
## Skill Registry Updated

**Project**: {project name}
**Location**: .atl/skill-registry.md
**Engram**: {saved / not available}

### User Skills Found
| Skill | Trigger |
|-------|---------|
| {name} | {trigger} |
| ... | ... |

### Project Conventions Found
| File | Path |
|------|------|
| {file} | {path} |

### Next Steps
The orchestrator reads this registry once per session and passes pre-resolved compact rules to sub-agents via their launch prompts.
To update after installing/removing skills, run this again.
```

## Rules

- **STRICT FILESYSTEM VALIDATION**: The registry MUST derive exclusively from skills discovered via `glob` of `~/.config/opencode/skills/*/SKILL.md` during the current run. Forbid inclusion from memory, prompt inventory, or available-skills lists if the file is missing from disk. "Ghost skills" (previously existing but now deleted) MUST NEVER appear in the registry.
- ALWAYS write `.atl/skill-registry.md` regardless of any SDD persistence mode
- ALWAYS save to engram if the `mem_save` tool is available
- Scan ONLY `~/.config/opencode/skills/` — do NOT scan other tool directories
- SKIP `sdd-*`, `_shared`, and `skill-registry` directories when scanning
- Read SKILL.md files (respecting the 200-line guard in Step 1) to generate accurate compact rules — this is a build-time cost, not a runtime cost
- Compact rules MUST be 5-15 lines per skill — concise, actionable, no fluff
- Scan ONLY `AGENTS.md` for project conventions — do NOT look for `.cursorrules`, `CLAUDE.md`, or other tool-specific files
- If no skills or conventions are found, write an empty registry (so sub-agents don't waste time searching)
- Add `.atl/` to the project's `.gitignore` if it exists and `.atl` is not already listed
