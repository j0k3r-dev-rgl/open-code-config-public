/**
 * Engram — OpenCode plugin adapter
 *
 * Thin layer that connects OpenCode's event system to the Engram Go binary.
 * The Go binary runs as a local HTTP server and handles all persistence.
 *
 * Flow:
 *   OpenCode events → this plugin → HTTP calls → engram serve → SQLite
 *
 * Session resilience:
 *   Uses `ensureSession()` before any DB write. This means sessions are
 *   created on-demand — even if the plugin was loaded after the session
 *   started (restart, reconnect, etc.). The session ID comes from OpenCode's
 *   hooks (input.sessionID) rather than relying on a session.created event.
 */

import * as os from "node:os"
import * as path from "node:path"
import { execFileSync } from "node:child_process"
import { tool, type Plugin } from "@opencode-ai/plugin"

// ─── Configuration ───────────────────────────────────────────────────────────

const ENGRAM_PORT = parseInt(process.env.ENGRAM_PORT ?? "7437")
const ENGRAM_URL = `http://127.0.0.1:${ENGRAM_PORT}`
const ENGRAM_BIN = process.env.ENGRAM_BIN ?? Bun.which("engram") ?? "/home/linuxbrew/.linuxbrew/Cellar/engram/1.12.0-beta.1/bin/engram"
const ENGRAM_DB = path.join(os.homedir(), ".engram", "engram.db")

// Engram's own MCP tools — don't count these as "tool calls" for session stats
const ENGRAM_TOOLS = new Set([
  "mem_search",
  "mem_save",
  "mem_update",
  "mem_delete",
  "mem_suggest_topic_key",
  "mem_save_prompt",
  "mem_session_summary",
  "mem_context",
  "mem_stats",
  "mem_timeline",
  "mem_get_observation",
  "mem_session_start",
  "mem_session_end",
])

// ─── Memory Instructions ─────────────────────────────────────────────────────
// These get injected into the agent's context so it knows to call mem_save.
// IMPORTANT: the plugin resolves the canonical `project` at runtime and agents
// must treat that value as authoritative for every mem_* call. Agents must NOT
// derive project locally from cwd, basename, or custom heuristics.

const MEMORY_INSTRUCTIONS = `## Engram Persistent Memory — Protocol

You have access to Engram, a persistent memory system that survives across sessions and compactions.

### WHEN TO SAVE (mandatory — not optional)

Call \`mem_save\` IMMEDIATELY after any of these:
- Bug fix completed
- Architecture or design decision made
- Non-obvious discovery about the codebase
- Configuration change or environment setup
- Pattern established (naming, structure, convention)
- User preference or constraint learned

Format for \`mem_save\`:
- **title**: Verb + what — short, searchable (e.g. "Fixed N+1 query in UserList", "Chose Zustand over Redux")
- **type**: bugfix | decision | architecture | discovery | pattern | config | preference
- **scope**: \`project\` (default) | \`personal\`
- **topic_key** (optional, recommended for evolving decisions): stable key like \`architecture/auth-model\`
- **content**:
  **What**: One sentence — what was done
  **Why**: What motivated it (user request, bug, performance, etc.)
  **Where**: Files or paths affected
  **Learned**: Gotchas, edge cases, things that surprised you (omit if none)

Topic rules:
- Different topics must not overwrite each other (e.g. architecture vs bugfix)
- Reuse the same \`topic_key\` to update an evolving topic instead of creating new observations
- If unsure about the key, call \`mem_suggest_topic_key\` first and then reuse it
- Use \`mem_update\` when you have an exact observation ID to correct
- For EVERY \`mem_*\` call, use the runtime-resolved \`project\` value as-is
- NEVER recompute \`project\` locally from cwd, basename, or ad-hoc detection inside the agent

### WHEN TO SEARCH MEMORY

When the user asks to recall something — any variation of "remember", "recall", "what did we do",
"how did we solve", "recordar", "acordate", "qué hicimos", or references to past work:
1. First call \`mem_context\` — checks recent session history (fast, cheap)
2. Then prefer \`mem_recall_resolved_projects\` to search across the resolved project aliases (git remote, git root, cwd) and get hydrated results in one step
3. Use \`mem_search\` + \`mem_get_observation\` only as fallback when you need more targeted recovery

Also search memory PROACTIVELY when:
- Starting work on something that might have been done before
- The user mentions a topic you have no context on — check if past sessions covered it
- The user's FIRST message references the project, a feature, or a problem — prefer \`mem_recall_resolved_projects\` with keywords from their message to check for prior work before responding

### SESSION CLOSE PROTOCOL (mandatory)

Before ending a session or saying "done" / "listo" / "that's it", you MUST:
1. Call \`mem_session_summary\` with this structure:

## Goal
[What we were working on this session]

## Instructions
[User preferences or constraints discovered — skip if none]

## Discoveries
- [Technical findings, gotchas, non-obvious learnings]

## Accomplished
- [Completed items with key details]

## Next Steps
- [What remains to be done — for the next session]

## Relevant Files
- path/to/file — [what it does or what changed]

This is NOT optional. If you skip this, the next session starts blind.

### AFTER COMPACTION

If you see a message about compaction or context reset, or if you see "FIRST ACTION REQUIRED" in your context:
1. IMMEDIATELY call \`mem_session_summary\` with the compacted summary content — this persists what was done before compaction
2. Then call \`mem_context\` to recover any additional context from previous sessions
3. Only THEN continue working

Do not skip step 1. Without it, everything done before compaction is lost from memory.
`

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function engramFetch(
  path: string,
  opts: { method?: string; body?: any } = {}
): Promise<any> {
  try {
    const res = await fetch(`${ENGRAM_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    return await res.json()
  } catch {
    // Engram server not running — silently fail
    return null
  }
}

async function isEngramRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGRAM_URL}/health`, {
      signal: AbortSignal.timeout(500),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractProjectName(directory: string): string {
  // Try git remote origin URL
  try {
    const result = Bun.spawnSync(["git", "-C", directory, "remote", "get-url", "origin"])
    if (result.exitCode === 0) {
      const url = result.stdout?.toString().trim()
      if (url) {
        const name = url.replace(/\.git$/, "").split(/[/:]/).pop()
        if (name) return name
      }
    }
  } catch {}

  // Fallback: git root directory name (works in worktrees)
  try {
    const result = Bun.spawnSync(["git", "-C", directory, "rev-parse", "--show-toplevel"])
    if (result.exitCode === 0) {
      const root = result.stdout?.toString().trim()
      if (root) return root.split("/").pop() ?? "unknown"
    }
  } catch {}

  // Final fallback: cwd basename
  return directory.split("/").pop() ?? "unknown"
}

function resolveProjectCandidates(directory: string): string[] {
  const candidates: string[] = []

  try {
    const result = Bun.spawnSync(["git", "-C", directory, "remote", "get-url", "origin"])
    if (result.exitCode === 0) {
      const url = result.stdout?.toString().trim()
      if (url) {
        const name = url.replace(/\.git$/, "").split(/[/:]/).pop()?.trim().toLowerCase()
        if (name) candidates.push(name)
      }
    }
  } catch {}

  try {
    const result = Bun.spawnSync(["git", "-C", directory, "rev-parse", "--show-toplevel"])
    if (result.exitCode === 0) {
      const root = result.stdout?.toString().trim()
      if (root) {
        const name = path.basename(root).trim().toLowerCase()
        if (name) candidates.push(name)
      }
    }
  } catch {}

  const cwdName = path.basename(directory).trim().toLowerCase()
  if (cwdName) candidates.push(cwdName)

  return [...new Set(candidates.filter(Boolean))]
}

function truncate(str: string, max: number): string {
  if (!str) return ""
  return str.length > max ? str.slice(0, max) + "..." : str
}

/**
 * Strip <private>...</private> tags before sending to engram.
 * Double safety: the Go binary also strips, but we strip here too
 * so sensitive data never even hits the wire.
 */
function stripPrivateTags(str: string): string {
  if (!str) return ""
  return str.replace(/<private>[\s\S]*?<\/private>/gi, "[REDACTED]").trim()
}

function toArrayOutput(output: string): any[] {
  const trimmed = output?.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === "object") return [parsed]
  } catch {}

  const rows: any[] = []
  for (const line of trimmed.split(/\r?\n/)) {
    const row = line.trim()
    if (!row) continue
    try {
      const parsed = JSON.parse(row)
      if (Array.isArray(parsed)) rows.push(...parsed)
      else if (parsed && typeof parsed === "object") rows.push(parsed)
    } catch {}
  }
  return rows
}

function execSQLiteJson(query: string): any[] {
  try {
    const output = execFileSync("sqlite3", ["-json", ENGRAM_DB, query], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    })
    return toArrayOutput(output)
  } catch {
    return []
  }
}

function escapeSqlite(value: string): string {
  return value.replace(/'/g, "''")
}

function sanitizeFTSQuery(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, '""')}"`)
    .join(" AND ")
}

function truncateForRecall(str: string, max: number): string {
  if (!str) return ""
  return str.length > max ? str.slice(0, max) + "..." : str
}

function createRecallResolvedProjectsTool(
  project: string,
  directory: string,
  migrateProject: (oldProject: string, newProject: string) => Promise<boolean>,
) {
  return tool({
    description: `Search Engram memories across all resolved project aliases (git remote, git root, cwd) and return hydrated results. If matches are found under multiple aliases, it can auto-migrate them into the canonical project.`,
    args: {
      query: tool.schema.string().describe("Full-text query to search in memory. Use natural language or keywords. Pass empty string to list recent memories."),
      limit: tool.schema.number().optional().describe("Maximum number of memories to return (default 8, max 20)."),
      auto_migrate: tool.schema.boolean().optional().describe("When true, migrate matching alias projects into the canonical project if hits are found in 2 or more project names."),
    },
    async execute(args: { query?: string; limit?: number; auto_migrate?: boolean }): Promise<string> {
      const aliases = resolveProjectCandidates(directory)
      const canonicalProject = aliases[0] || project
      const limit = Math.max(1, Math.min(Number(args.limit ?? 8) || 8, 20))
      const autoMigrate = args.auto_migrate ?? true
      const escapedProjects = aliases
        .map((name) => name.toLowerCase())
        .map(escapeSqlite)
        .map((name) => `'${name}'`)
        .join(", ")

      if (!escapedProjects) {
        return "No project aliases could be resolved for Engram recall."
      }

      const rawQuery = String(args.query ?? "").trim()
      const rows = rawQuery
        ? execSQLiteJson(`
            SELECT
              o.id,
              o.type,
              o.title,
              o.content,
              o.project,
              o.scope,
              o.topic_key,
              o.created_at,
              o.updated_at,
              bm25(observations_fts) AS score
            FROM observations_fts
            JOIN observations o ON o.id = observations_fts.rowid
            WHERE observations_fts MATCH '${escapeSqlite(sanitizeFTSQuery(rawQuery))}'
              AND lower(o.project) IN (${escapedProjects})
              AND o.deleted_at IS NULL
            ORDER BY score ASC, o.updated_at DESC
            LIMIT ${limit};
          `)
        : execSQLiteJson(`
            SELECT
              id,
              type,
              title,
              content,
              project,
              scope,
              topic_key,
              created_at,
              updated_at,
              0 AS score
            FROM observations
            WHERE lower(project) IN (${escapedProjects})
              AND deleted_at IS NULL
            ORDER BY updated_at DESC
            LIMIT ${limit};
          `)

      const hitsByProject = [...new Set(rows.map((row) => String(row.project || "").toLowerCase()).filter(Boolean))]

      const migrated: string[] = []
      if (autoMigrate && hitsByProject.length >= 2) {
        for (const alias of hitsByProject) {
          if (alias === canonicalProject.toLowerCase()) continue
          const ok = await migrateProject(alias, canonicalProject)
          if (ok) migrated.push(alias)
        }
      }

      const displayProjectFor = (rowProject: unknown): string => {
        const normalized = String(rowProject || "").toLowerCase()
        if (migrated.includes(normalized)) return canonicalProject
        return String(rowProject || canonicalProject)
      }

      if (rows.length === 0) {
        return [
          `## Engram Recall`,
          `- Canonical project: ${canonicalProject}`,
          `- Aliases searched: ${aliases.join(", ")}`,
          rawQuery ? `- Query: ${rawQuery}` : `- Query: <recent memories>`,
          ``,
          `No memories found across the resolved project aliases.`,
        ].join("\n")
      }

      const items = rows.map((row, index) => {
        const title = row.title || row.topic_key || `Observation #${row.id}`
        const content = truncateForRecall(String(row.content || ""), 1600)
        return [
          `### ${index + 1}. ${title}`,
          `- id: ${row.id}`,
          `- project: ${displayProjectFor(row.project)}`,
          `- type: ${row.type || "manual"}`,
          `- scope: ${row.scope || "project"}`,
          row.topic_key ? `- topic_key: ${row.topic_key}` : null,
          `- updated_at: ${row.updated_at || row.created_at || ""}`,
          ``,
          content,
        ].filter(Boolean).join("\n")
      })

      const migrationSummary = migrated.length > 0
        ? `- Auto-migrated aliases into canonical project: ${migrated.join(", ")} -> ${canonicalProject}`
        : hitsByProject.length >= 2
          ? `- Multiple project aliases detected: ${hitsByProject.join(", ")}`
          : null

      return [
        `## Engram Recall`,
        `- Canonical project: ${canonicalProject}`,
        `- Aliases searched: ${aliases.join(", ")}`,
        rawQuery ? `- Query: ${rawQuery}` : `- Query: <recent memories>`,
        `- Results: ${rows.length}`,
        migrationSummary,
        ``,
        ...items,
      ].filter(Boolean).join("\n")
    },
  })
}

// ─── Plugin Export ───────────────────────────────────────────────────────────

export const Engram: Plugin = async (ctx) => {
  const oldProject = ctx.directory.split("/").pop() ?? "unknown"
  const project = extractProjectName(ctx.directory)

  // Track tool counts per session (in-memory only, not critical)
  const toolCounts = new Map<string, number>()

  // Track which sessions we've already ensured exist in engram
  const knownSessions = new Set<string>()

  // Track sub-agent session IDs so we can suppress their tool-hook registrations.
  // Sub-agents (Task() calls) have a parentID or a title ending in " subagent)".
  // We must not register them as top-level Engram sessions — they cause session
  // inflation (e.g. 170 sessions for 1 real conversation, issue #116).
  const subAgentSessions = new Set<string>()

  /**
   * Ensure a session exists in engram. Idempotent — calls POST /sessions
   * which uses INSERT OR IGNORE. Safe to call multiple times.
   *
   * Silently skips sub-agent sessions (tracked in `subAgentSessions`).
   */
  async function ensureSession(sessionId: string): Promise<void> {
    if (!sessionId || knownSessions.has(sessionId)) return
    // Do not register sub-agent sessions in Engram (issue #116).
    if (subAgentSessions.has(sessionId)) return
    knownSessions.add(sessionId)
    await engramFetch("/sessions", {
      method: "POST",
      body: {
        id: sessionId,
        project,
        directory: ctx.directory,
      },
    })
  }

  async function migrateProject(oldProject: string, newProject: string): Promise<boolean> {
    if (!oldProject || !newProject) return false
    if (oldProject === newProject) return false
    const result = await engramFetch("/projects/migrate", {
      method: "POST",
      body: { old_project: oldProject, new_project: newProject },
    })
    return result !== null
  }

  // Try to start engram server if not running
  const running = await isEngramRunning()
  if (!running) {
    try {
      Bun.spawn([ENGRAM_BIN, "serve"], {
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      })
      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // Binary not found or can't start — plugin will silently no-op
    }
  }

  // Migrate project name if it changed (one-time, idempotent)
  // Must run AFTER server startup to ensure the endpoint is available
  if (oldProject !== project) {
    await migrateProject(oldProject, project)
  }

  // Auto-import: if .engram/manifest.json exists in the project repo,
  // run `engram sync --import` to load any new chunks into the local DB.
  // This is how git-synced memories get loaded when cloning a repo or
  // pulling changes. Each chunk is imported only once (tracked by ID).
  try {
    const manifestFile = `${ctx.directory}/.engram/manifest.json`
    const file = Bun.file(manifestFile)
    if (await file.exists()) {
      Bun.spawn([ENGRAM_BIN, "sync", "--import"], {
        cwd: ctx.directory,
        stdout: "ignore",
        stderr: "ignore",
        stdin: "ignore",
      })
    }
  } catch {
    // Manifest doesn't exist or binary not found — silently skip
  }

  return {
    tool: {
      mem_recall_resolved_projects: createRecallResolvedProjectsTool(project, ctx.directory, migrateProject),
    },

    // ─── Event Listeners ───────────────────────────────────────────

    event: async ({ event }) => {
      // --- Session Created ---
      if (event.type === "session.created") {
        // Bug fix (#116): session data is nested under event.properties.info,
        // not event.properties directly.
        const info = (event.properties as any)?.info
        const sessionId = info?.id
        const parentID = info?.parentID
        const title: string = info?.title ?? ""

        // Sub-agent sessions (created via Task()) must NOT be registered as
        // top-level Engram sessions. They cause massive session inflation
        // (e.g. 170 sessions for 1 real conversation).
        //
        // Detection heuristics:
        //   - parentID is set on all Task() sub-agent sessions
        //   - title ends with " subagent)" as a secondary signal
        const isSubAgent = !!parentID || title.endsWith(" subagent)")

        if (sessionId && !isSubAgent) {
          await ensureSession(sessionId)
        } else if (sessionId && isSubAgent) {
          // Remember this as a sub-agent session so tool-hook calls
          // to ensureSession() are also suppressed for it.
          subAgentSessions.add(sessionId)
        }
      }

      // --- Session Deleted ---
      if (event.type === "session.deleted") {
        // Same properties.info path as session.created.
        const info = (event.properties as any)?.info
        const sessionId = info?.id
        if (sessionId) {
          toolCounts.delete(sessionId)
          knownSessions.delete(sessionId)
          subAgentSessions.delete(sessionId)
        }
      }

    },

    // ─── User Prompt Capture ──────────────────────────────────────
    // chat.message is called once per user message, before the LLM sees it.
    // input.sessionID is always reliable here (no knownSessions workaround).
    // output.message is typed as UserMessage (role:"user" already guaranteed).
    // output.parts contains TextPart[] with the actual message text.

    "chat.message": async (input, output) => {
      // Skip sub-agent sessions — they inflate session counts (issue #116)
      if (subAgentSessions.has(input.sessionID)) return

      const sessionId = input.sessionID

      // Extract text from parts (type:"text")
      const content = output.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as any).text ?? "")
        .join("\n")
        .trim()

      // Also fallback to summary if parts yield nothing
      const fallback = !content && output.message.summary
        ? `${output.message.summary.title ?? ""}\n${output.message.summary.body ?? ""}`.trim()
        : ""

      const finalContent = content || fallback

      // Only capture non-trivial prompts (>10 chars)
      if (finalContent.length > 10) {
        await ensureSession(sessionId)
        await engramFetch("/prompts", {
          method: "POST",
          body: {
            session_id: sessionId,
            content: stripPrivateTags(truncate(finalContent, 2000)),
            project,
          },
        })
      }
    },

    // ─── Tool Execution Hook ─────────────────────────────────────
    // Count tool calls per session (for session end stats).
    // Also ensures the session exists — handles plugin reload / reconnect.
    // Passive capture: when a Task tool completes, POST its output to
    // the passive capture endpoint so the server extracts learnings.

    "tool.execute.after": async (input, output) => {
      if (ENGRAM_TOOLS.has(input.tool.toLowerCase())) return

      // input.sessionID comes from OpenCode — always available
      const sessionId = input.sessionID
      if (sessionId) {
        await ensureSession(sessionId)
        toolCounts.set(sessionId, (toolCounts.get(sessionId) ?? 0) + 1)
      }

      // Passive capture: extract learnings from Task tool output
      if (input.tool === "Task" && output && sessionId) {
        const text = typeof output === "string" ? output : JSON.stringify(output)
        if (text.length > 50) {
          await engramFetch("/observations/passive", {
            method: "POST",
            body: {
              session_id: sessionId,
              content: stripPrivateTags(text),
              project,
              source: "task-complete",
            },
          })
        }
      }
    },

    // ─── System Prompt: Always-on memory instructions ──────────
    // Injects MEMORY_INSTRUCTIONS into the system prompt of every message.
    // This ensures the agent ALWAYS knows about Engram, even after compaction.
    //
    // We append to the last existing system entry instead of pushing a new one.
    // Some models (Qwen3.5, Mistral/Ministral via llama.cpp) reject multiple
    // system messages — their Jinja chat templates only allow a single system
    // block at the beginning. By concatenating, we avoid adding extra system
    // messages that would break these models. See: GitHub issue #23.

    "experimental.chat.system.transform": async (_input, output) => {
      if (output.system.length > 0) {
        output.system[output.system.length - 1] += "\n\n" + MEMORY_INSTRUCTIONS
      } else {
        output.system.push(MEMORY_INSTRUCTIONS)
      }
    },

    // ─── Compaction Hook: Persist memory + inject context ──────────
    // Compaction is triggered by the system (not the agent) when context
    // gets too long. The old agent "dies" and a new one starts with the
    // compacted summary. This is our chance to:
    // 1. Auto-save a session checkpoint (the agent can't do this itself)
    // 2. Inject context from previous sessions into the compaction prompt
    // 3. Tell the compressor to remind the new agent to save memories

    "experimental.session.compacting": async (input, output) => {
      if (input.sessionID) {
        await ensureSession(input.sessionID)
      }

      // Inject context from previous sessions
      const data = await engramFetch(
        `/context?project=${encodeURIComponent(project)}`
      )
      if (data?.context) {
        output.context.push(data.context)
      }

      // Tell the compressor to instruct the new agent to persist the
      // compacted summary to Engram. The new agent reads the compacted
      // summary and this instruction, then saves it as a session summary.
      output.context.push(
        `CRITICAL INSTRUCTION FOR COMPACTED SUMMARY:\n` +
        `The agent has access to Engram persistent memory via MCP tools.\n` +
        `You MUST include the following instruction at the TOP of the compacted summary:\n\n` +
        `"FIRST ACTION REQUIRED: Call mem_session_summary with the content of this compacted summary. ` +
        `Use project: '${project}'. This preserves what was accomplished before compaction. Do this BEFORE any other work."\n\n` +
        `This is NOT optional. Without this, everything done before compaction is lost from memory.`
      )
    },
  }
}
