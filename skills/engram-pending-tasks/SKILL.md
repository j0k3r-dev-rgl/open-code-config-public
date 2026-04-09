---
name: engram-pending-tasks
description: >
  Normalized pending task management for Engram memory system.
  Handles synonyms (pending, tech-debt, TODO, FIXME) and provides
  consistent schema for task tracking across sessions.
  Trigger: When user mentions "pending", "tech-debt", "TODO", "pendiente", 
  "deuda técnica", or asks about pending tasks.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

Load this skill when:
- User asks to save something as "pending", "pendiente", "tech-debt", "deuda técnica", "TODO", or "FIXME"
- User asks "what do I have pending?", "qué tengo pendiente?", "show my pending tasks"
- User wants to update task status: "mark as complete", "marcar como completado"
- User references past work that might have pending items

## Task Schema (Normalized)

Every pending task MUST follow this schema:

```yaml
title: "[PENDING] {brief description}"
type: "manual"        # manual | tech-debt | bug | feature
status: "pending"     # pending | in_progress | blocked | completed
priority: "medium"    # low | medium | high | critical
project: "{project-name}"
topic_key: "pending/{kebab-case-description}"
content: |
  **Description**: {what needs to be done}
  **Context**: {why it was created}
  **Status**: {pending | in_progress | blocked | completed}
  **Priority**: {low | medium | high | critical}
  **Created**: {ISO date}
  **Updated**: {ISO date}
  **Related to**: {other pending tasks or issues}
```

## Pending Index Artifact

To avoid broad or random searches, maintain a project-scoped index artifact.

```yaml
title: "pending-index/{project}"
topic_key: "pending-index/{project}"
type: "pattern"
project: "{project-name}"
scope: "project"
content: |
  ## Open Tasks
  - topic_key: pending/{task-slug}
    title: [PENDING] {brief description}
    type: tech-debt
    status: pending
    priority: medium
    updated: 2026-04-01T16:09:00Z

  ## Completed Tasks
  - topic_key: pending/{completed-task-slug}
    title: [PENDING] {brief description}
    status: completed
    updated: 2026-04-01T18:00:00Z
```

This index is the FIRST place to query when the user asks for pending tasks.

## Synonym Mapping

| User says (EN/ES) | Stored as | Search also |
|-------------------|-----------|-------------|
| "pending", "pendiente", "tarea" | `type: manual` | tech-debt, TODO, task |
| "tech-debt", "deuda técnica" | `type: tech-debt` | pending, TODO, deuda |
| "TODO", "FIXME" | `type: manual` | pending, tech-debt |
| "bug" (unresolved) | `type: bug` | issue, problem, problema |
| "feature", "mejora", "enhancement" | `type: feature` | improvement, mejora |

## Critical Patterns

### 1. ALWAYS normalize synonyms

When user says "tech-debt", save with `type: "tech-debt"` but also searchable as "pending".

When user says "pendiente", save with `type: "manual"` but searchable as "pending" or "tech-debt".

### 1.5. NEVER scan the repository for pending tasks by default

If the user asks for "pending tasks", "pendientes", "TODOs", or "tech debt", treat that as an Engram memory query first.

Do NOT inspect the repository for `TODO`, `FIXME`, or comments unless the user explicitly asks to scan the codebase.

### 1.6. Use deterministic topic namespaces

- Individual task: `pending/{task-slug}`
- Project index: `pending-index/{project}`

Query exact namespaces first. Avoid broad natural-language searches unless recovery is needed.

### 2. Use consistent topic_key format

```
topic_key: "pending/{kebab-case-short-description}"
```

Examples:
- "Revisar auth middleware" → `pending/revisar-auth-middleware`
- "Fix N+1 query in UserList" → `pending/fix-n-plus-one-userlist`
- "Add dark mode toggle" → `pending/add-dark-mode-toggle`

### 3. ALWAYS update `updated` timestamp

When changing status, update both `status` field AND `Updated` timestamp in content.

### 4. Proactive task creation

When user says:
- "I'll do this later" → Create pending task
- "This is a TODO" → Create pending task  
- "We should fix this" → Create pending task with appropriate type

## Workflows

### Save a New Pending Task

```typescript
// User: "Save this as pending: review auth middleware"
// User: "Guarda esto como pendiente: revisar auth middleware"

mem_save({
  title: "[PENDING] Review auth middleware",
  type: "manual",
  topic_key: "pending/review-auth-middleware",
  content: `
**Description**: Review auth middleware implementation
**Context**: User requested to review authentication middleware for potential issues
**Status**: pending
**Priority**: medium
**Created**: ${new Date().toISOString()}
**Updated**: ${new Date().toISOString()}
**Related to**: 
  `
})

// Then upsert the project index
mem_save({
  title: "pending-index/{auto-detected-project}",
  topic_key: "pending-index/{auto-detected-project}",
  type: "pattern",
  content: `
## Open Tasks
- topic_key: pending/review-auth-middleware
  title: [PENDING] Review auth middleware
  type: manual
  status: pending
  priority: medium
  updated: ${new Date().toISOString()}

## Completed Tasks
  `
})
```

### List All Pending Tasks

```typescript
// User: "What do I have pending?"
// User: "¿Qué tengo pendiente?"

// 1. Search the deterministic project index first
const index = await mem_search({
  query: "pending-index/{auto-detected-project}"
})

// 2. Read the full index content
const fullIndex = await mem_get_observation({ id: index[0].id })

// 3. If index is missing or stale, recover with exact namespace searches:
//    mem_search({ query: "pending/" })
// 4. Only if recovery is needed, use mem_context to find recently mentioned pending work
```

### Update Task Status

```typescript
// User: "The auth middleware task is done"
// User: "La tarea del auth middleware ya está lista"

// 1. Find the task
const results = await mem_search({
  query: "pending/review-auth-middleware"
});

// 2. Update it
if (results && results[0]) {
  mem_update({
    id: results[0].id,
    content: `
**Description**: Review auth middleware implementation
**Context**: User requested to review authentication middleware
**Status**: completed
**Priority**: medium
**Created**: {original-date}
**Updated**: ${new Date().toISOString()}
**Related to**: 
    `
  });
}

// 3. Update the project index too
mem_save({
  title: "pending-index/{auto-detected-project}",
  topic_key: "pending-index/{auto-detected-project}",
  type: "pattern",
  content: `
## Open Tasks

## Completed Tasks
- topic_key: pending/review-auth-middleware
  title: [PENDING] Review auth middleware
  status: completed
  updated: ${new Date().toISOString()}
  `
})
```

### Mark as In Progress

```typescript
// User: "I'm working on the auth middleware now"
// User: "Estoy trabajando en el auth middleware"

// Update status to "in_progress"
```

### Mark as Blocked

```typescript
// User: "Can't proceed with this, waiting for API changes"
// User: "No puedo avanzar, estoy esperando cambios en la API"

// Update status to "blocked" and add blocker info in Related to
```

## Commands

### Quick Status Check
```bash
# Find the project index first
mem_search(query: "pending-index/{project}")

# Then read full content
mem_get_observation(id: <index-id>)
```

### Find by Type
```bash
# Recovery search across deterministic task namespace
mem_search(query: "pending/")
```

### Find by Priority
```bash
# Read the project index and inspect critical items there
# Priority filtering happens from the index content, not broad search
```

## Decision Tree

```
User mentions "pending", "pendiente", "TODO", "tech-debt"?
├── Is it a NEW task?
│   └── SAVE `pending/{task-slug}` and UPSERT `pending-index/{project}`
├── Is it asking about EXISTING tasks?
│   └── QUERY `pending-index/{project}` first
└── Is it updating a task?
    ├── "done", "completado", "finished", "listo" → update task + update index
    ├── "working", "trabajando", "in progress" → update task + update index
    └── "blocked", "bloqueado", "waiting" → update task + update index
```

## Multi-language Support

### Supported Phrases (EN/ES)

**Creating tasks:**
- "Save as pending", "Guardar como pendiente", "Agregar pendiente"
- "This is a TODO", "Esto es un TODO", "Agregar TODO"
- "Add tech-debt", "Agregar deuda técnica", "Esto es tech-debt"

**Querying tasks:**
- "What do I have pending?", "¿Qué tengo pendiente?"
- "Show my pending tasks", "Mostrar mis pendientes"
- "List TODOs", "Listar TODOs", "Ver deuda técnica"

**Updating tasks:**
- "Mark as done", "Marcar como hecho", "Completar tarea"
- "Task is finished", "La tarea está terminada"
- "Update status", "Actualizar estado"

## Examples

### Example 1: Creating a tech-debt item

**User:** "We need to refactor the database queries, add it as tech-debt"

**Action:**
```typescript
mem_save({
  title: "[PENDING] Refactor database queries",
  type: "tech-debt",
  project: "my-app",
  topic_key: "pending/refactor-database-queries",
  content: `
**Description**: Refactor database queries for better performance
**Context**: User identified need to refactor queries during current session
**Status**: pending
**Priority**: medium
**Created**: 2024-01-15T10:30:00Z
**Updated**: 2024-01-15T10:30:00Z
**Related to**: 
  `
})

mem_save({
  title: "pending-index/my-app",
  topic_key: "pending-index/my-app",
  type: "pattern",
  project: "my-app",
  content: `
## Open Tasks
- topic_key: pending/refactor-database-queries
  title: [PENDING] Refactor database queries
  type: tech-debt
  status: pending
  priority: medium
  updated: 2024-01-15T10:30:00Z

## Completed Tasks
  `
})
```

### Example 2: Querying pending tasks

**User:** "¿Qué tengo pendiente?"

**Action:**
```typescript
// 1. Read the project index
const tasksIndex = await mem_search({
  query: "pending-index/my-app",
  project: "my-app"
});

// 2. Get the full index observation
const pending = await mem_get_observation({ id: tasksIndex[0].id });
```

### Example 3: Completing a task

**User:** "The database refactor is done"

**Action:**
```typescript
// 1. Find
const results = await mem_search({
  query: "pending/refactor-database-queries",
  project: "my-app"
});

// 2. Update
if (results[0]) {
  await mem_update({
    id: results[0].id,
    content: `...updated with status: completed...`
  });
}

await mem_save({
  title: "pending-index/my-app",
  topic_key: "pending-index/my-app",
  type: "pattern",
  project: "my-app",
  content: `
## Open Tasks

## Completed Tasks
- topic_key: pending/refactor-database-queries
  title: [PENDING] Refactor database queries
  status: completed
  updated: 2024-01-15T12:00:00Z
  `
})
```

## Resources

- **Templates**: See [assets/](assets/) for task creation templates
- **Engram Plugin**: `/home/j0k3r/.config/opencode/plugins/engram.ts`
- **Engram Convention**: `/home/j0k3r/.config/opencode/skills/_shared/engram-convention.md`
