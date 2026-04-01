# engram-pending-tasks

Skill local para normalizar el manejo de tareas pendientes en Engram usando namespaces determinísticos como `pending/{task-slug}` y `pending-index/{project}`.

## Purpose

Esta skill le indica al agente cómo:

- guardar tareas pendientes en memoria persistente
- listar pendientes desde un índice por proyecto
- actualizar estados como `pending`, `in_progress`, `blocked` y `completed`
- tratar sinónimos como `pending`, `pendiente`, `TODO`, `FIXME` y `tech-debt`

## Agent Config

Para que el agente pueda usar esta skill, agrega estas piezas de configuración.

### 1. Registrar la skill en `available_skills`

Si tu runtime usa un bloque de skills disponibles, agrega una entrada como esta:

```xml
<skill>
  <name>engram-pending-tasks</name>
  <description>Normalized pending task management for Engram memory system. Handles synonyms (pending, tech-debt, TODO, FIXME) and provides consistent schema for task tracking across sessions.</description>
  <location>file:///home/j0k3r/.config/opencode/skills/engram-pending-tasks/SKILL.md</location>
</skill>
```

### 2. Agregar la regla de auto-carga en `AGENTS.md`

Incluye la skill en la tabla de auto-load:

```md
| Context | Skill to load |
| ------- | ------------- |
| Managing pending tasks, TODOs, tech-debt with Engram ("what's pending?", "guardar como pendiente") | engram-pending-tasks |
```

### 3. Declarar el trigger en las instrucciones del agente

Agrega una regla explícita como esta:

```md
Load `engram-pending-tasks` when the user mentions pending tasks, TODOs, FIXME, tech-debt, "pendiente", "deuda técnica", or asks what is still pending.
```

### 4. Mantener el protocolo Engram alineado

El agente también debe tener reglas que refuercen este flujo:

```md
- Save individual pending items under `pending/{task-slug}`
- Upsert the project index under `pending-index/{project}`
- Query `pending-index/{project}` first when listing pending tasks
- Do not scan the repository for TODO/FIXME unless the user explicitly asks for a codebase scan
```

## Minimal Integration Example

```md
## Skills (Auto-load based on context)

| Context | Skill to load |
| ------- | ------------- |
| Managing pending tasks, TODOs, tech-debt with Engram ("what's pending?", "guardar como pendiente") | engram-pending-tasks |
```

## Included Files

- `SKILL.md` - guía principal de uso, schema, decision tree y workflows
- `README.md` - guía mínima de configuración para registrar esta skill en un agente

## Notes

- Esta skill no reemplaza el protocolo general de Engram; lo especializa para pendientes.
- Si el agente ya tiene reglas de memoria persistente, esta skill debe complementar esas reglas, no duplicarlas de forma inconsistente.
