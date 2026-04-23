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

import { tool, type Plugin } from "@opencode-ai/plugin";
import * as os from "node:os";
import * as path from "node:path";

// ─── Configuration ───────────────────────────────────────────────────────────

const ENGRAM_PORT = parseInt(process.env.ENGRAM_PORT ?? "7437");
const ENGRAM_URL = `http://127.0.0.1:${ENGRAM_PORT}`;
const ENGRAM_BIN =
	process.env.ENGRAM_BIN ??
	Bun.which("engram") ??
	"/home/j0k3r/.linuxbrew/Cellar/engram/1.12.0/bin/engram";
const ENGRAM_DB = path.join(
	process.env.ENGRAM_DATA_DIR ?? path.join(os.homedir(), ".engram"),
	"engram.db",
);

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
]);

function normalizeEngramToolName(toolName: string): string {
	const normalized = toolName.trim().toLowerCase();
	const unscoped = normalized.split(/[.:/]/).pop() ?? normalized;
	return unscoped.replace(/^engram_/, "");
}

function isEngramTool(toolName: string): boolean {
	return ENGRAM_TOOLS.has(normalizeEngramToolName(toolName));
}

// ─── Memory Instructions ─────────────────────────────────────────────────────
// These get injected into the agent's context so it knows to call mem_save.

const MEMORY_INSTRUCTIONS = `## Engram Persistent Memory — Protocol

You have access to Engram, a persistent memory system that survives across sessions and compactions.

### PROJECT RESOLUTION (mandatory)

- NEVER pass an explicit \`project\` value to Engram memory tools unless the user explicitly asks for cross-project/manual targeting.
- Engram MUST resolve the current project automatically from the active workspace/session.
- This applies to \`mem_save\`, \`mem_search\`, \`mem_context\`, \`mem_session_summary\`, \`mem_save_prompt\`, and related memory calls.
- Your job is to provide the semantic payload (title, topic_key, content, query, etc.), not to choose the project name.

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

### WHEN TO SEARCH MEMORY

When the user asks to recall something — any variation of "remember", "recall", "what did we do",
"how did we solve", "recordar", "acordate", "qué hicimos", or references to past work:
1. First call \`mem_context\` — checks recent session history (fast, cheap)
2. If not found, call \`mem_search\` with relevant keywords (FTS5 full-text search)
3. If you find a match, use \`mem_get_observation\` for full untruncated content

Also search memory PROACTIVELY when:
- Starting work on something that might have been done before
- The user mentions a topic you have no context on — check if past sessions covered it
- The user's FIRST message references the project, a feature, or a problem — call \`mem_search\` with keywords from their message to check for prior work before responding

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
`;

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function engramFetch(
	path: string,
	opts: { method?: string; body?: any } = {},
): Promise<any> {
	try {
		const res = await fetch(`${ENGRAM_URL}${path}`, {
			method: opts.method ?? "GET",
			headers: opts.body ? { "Content-Type": "application/json" } : undefined,
			body: opts.body ? JSON.stringify(opts.body) : undefined,
		});
		return await res.json();
	} catch {
		// Engram server not running — silently fail
		return null;
	}
}

async function isEngramRunning(): Promise<boolean> {
	try {
		const res = await fetch(`${ENGRAM_URL}/health`, {
			signal: AbortSignal.timeout(500),
		});
		return res.ok;
	} catch {
		return false;
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeProjectName(name: string): string {
	return name.trim().toLowerCase();
}

function resolveProjectNames(directory: string): {
	canonical: string;
	variants: string[];
	remote: string;
	gitRoot: string;
	cwd: string;
} {
	const cwd = directory.split("/").pop() ?? "unknown";

	let gitRoot = cwd;
	try {
		const result = Bun.spawnSync([
			"git",
			"-C",
			directory,
			"rev-parse",
			"--show-toplevel",
		]);
		if (result.exitCode === 0) {
			const root = result.stdout?.toString().trim();
			if (root) gitRoot = root.split("/").pop() ?? cwd;
		}
	} catch {}

	let remote = gitRoot;
	try {
		const result = Bun.spawnSync([
			"git",
			"-C",
			directory,
			"remote",
			"get-url",
			"origin",
		]);
		if (result.exitCode === 0) {
			const url = result.stdout?.toString().trim();
			if (url) {
				const name = url
					.replace(/\.git$/, "")
					.split(/[/:]/)
					.pop();
				if (name) remote = name;
			}
		}
	} catch {}

	const ordered = [remote, gitRoot, cwd].map(normalizeProjectName);
	const variants = Array.from(new Set(ordered.filter(Boolean)));

	return {
		canonical: variants[0] ?? "unknown",
		variants,
		remote: normalizeProjectName(remote),
		gitRoot: normalizeProjectName(gitRoot),
		cwd: normalizeProjectName(cwd),
	};
}

function truncate(str: string, max: number): string {
	if (!str) return "";
	return str.length > max ? str.slice(0, max) + "..." : str;
}

function escapeSqlString(value: string): string {
	return value.replace(/'/g, "''");
}

function execSQLite(query: string): { ok: boolean; stdout: string; stderr: string } {
	const sqliteBin = Bun.which("sqlite3") ?? "sqlite3";
	try {
		const result = Bun.spawnSync([sqliteBin, ENGRAM_DB, query], {
			stdout: "pipe",
			stderr: "pipe",
			stdin: "ignore",
		});
		return {
			ok: result.exitCode === 0,
			stdout: result.stdout?.toString().trim() ?? "",
			stderr: result.stderr?.toString().trim() ?? "",
		};
	} catch (error) {
		return {
			ok: false,
			stdout: "",
			stderr: error instanceof Error ? error.message : "sqlite3 execution failed",
		};
	}
}

function migrateProjectRows(oldProject: string, newProject: string): {
	ok: boolean;
	observations: number;
	sessions: number;
	prompts: number;
	error?: string;
} {
	const oldEscaped = escapeSqlString(normalizeProjectName(oldProject));
	const newEscaped = escapeSqlString(normalizeProjectName(newProject));
	const query = [
		"BEGIN;",
		`UPDATE observations SET project='${newEscaped}' WHERE lower(project)='${oldEscaped}';`,
		"SELECT changes();",
		`UPDATE sessions SET project='${newEscaped}' WHERE lower(project)='${oldEscaped}';`,
		"SELECT changes();",
		`UPDATE user_prompts SET project='${newEscaped}' WHERE lower(project)='${oldEscaped}';`,
		"SELECT changes();",
		"COMMIT;",
	].join(" ");

	const result = execSQLite(query);
	if (!result.ok) {
		return {
			ok: false,
			observations: 0,
			sessions: 0,
			prompts: 0,
			error: result.stderr || "sqlite migration failed",
		};
	}

	const counts = result.stdout
		.split(/\r?\n/)
		.map((line) => Number.parseInt(line.trim(), 10))
		.filter((value) => Number.isFinite(value));

	return {
		ok: true,
		observations: counts[0] ?? 0,
		sessions: counts[1] ?? 0,
		prompts: counts[2] ?? 0,
	};
}

function readProjectFootprint(projectName: string): {
	observations: number;
	sessions: number;
	prompts: number;
	total: number;
} {
	const projectEscaped = escapeSqlString(normalizeProjectName(projectName));
	const query = [
		`SELECT COUNT(*) FROM observations WHERE lower(project)='${projectEscaped}';`,
		`SELECT COUNT(*) FROM sessions WHERE lower(project)='${projectEscaped}';`,
		`SELECT COUNT(*) FROM user_prompts WHERE lower(project)='${projectEscaped}';`,
	].join(" ");

	const result = execSQLite(query);
	if (!result.ok) {
		return { observations: 0, sessions: 0, prompts: 0, total: 0 };
	}

	const counts = result.stdout
		.split(/\r?\n/)
		.map((line) => Number.parseInt(line.trim(), 10))
		.filter((value) => Number.isFinite(value));

	const observations = counts[0] ?? 0;
	const sessions = counts[1] ?? 0;
	const prompts = counts[2] ?? 0;

	return {
		observations,
		sessions,
		prompts,
		total: observations + sessions + prompts,
	};
}

function resolveMigrationPlan(directory: string): {
	canonical: string;
	aliases: string[];
	detected: {
		remote: string;
		gitRoot: string;
		cwd: string;
		gitRootCwd: string | null;
		parentDir: string | null;
		parentCwd: string | null;
	};
	footprints: Map<string, { observations: number; sessions: number; prompts: number; total: number }>;
} {
	const current = resolveProjectNames(directory);
	const resolvedDir = path.resolve(directory);
	const parentDirRaw = path.basename(path.dirname(resolvedDir));
	const parentDir =
		parentDirRaw && parentDirRaw !== "." && parentDirRaw !== path.basename(resolvedDir)
			? normalizeProjectName(parentDirRaw)
			: null;
	const parentCwd =
		parentDir && current.cwd ? normalizeProjectName(`${parentDir}/${current.cwd}`) : null;
	const gitRootCwd =
		current.gitRoot && current.cwd && current.gitRoot !== current.cwd
			? normalizeProjectName(`${current.gitRoot}/${current.cwd}`)
			: null;

	const orderedCandidates = [
		current.remote,
		current.gitRoot,
		current.cwd,
		parentDir,
		parentCwd,
		gitRootCwd,
	].filter((value): value is string => Boolean(value));
	const candidates = Array.from(new Set(orderedCandidates));

	const footprints = new Map<
		string,
		{ observations: number; sessions: number; prompts: number; total: number }
	>();
	for (const candidate of candidates) {
		footprints.set(candidate, readProjectFootprint(candidate));
	}

	let canonical = current.canonical;
	let bestTotal = footprints.get(canonical)?.total ?? -1;
	for (const candidate of candidates) {
		const total = footprints.get(candidate)?.total ?? 0;
		if (total > bestTotal) {
			bestTotal = total;
			canonical = candidate;
		}
	}

	return {
		canonical,
		aliases: candidates.filter((name) => name !== canonical),
		detected: {
			remote: current.remote,
			gitRoot: current.gitRoot,
			cwd: current.cwd,
			gitRootCwd,
			parentDir,
			parentCwd,
		},
		footprints,
	};
}

/**
 * Strip <private>...</private> tags before sending to engram.
 * Double safety: the Go binary also strips, but we strip here too
 * so sensitive data never even hits the wire.
 */
function stripPrivateTags(str: string): string {
	if (!str) return "";
	return str.replace(/<private>[\s\S]*?<\/private>/gi, "[REDACTED]").trim();
}

// ─── Plugin Export ───────────────────────────────────────────────────────────

export const Engram: Plugin = async (ctx) => {
	const migrationPlan = resolveMigrationPlan(ctx.directory);
	const project = migrationPlan.canonical;

	// Track tool counts per session (in-memory only, not critical)
	const toolCounts = new Map<string, number>();

	// Track which sessions we've already ensured exist in engram
	const knownSessions = new Set<string>();

	// Track sub-agent session IDs so we can suppress their tool-hook registrations.
	// Sub-agents (Task() calls) have a parentID or a title ending in " subagent)".
	// We must not register them as top-level Engram sessions — they cause session
	// inflation (e.g. 170 sessions for 1 real conversation, issue #116).
	const subAgentSessions = new Set<string>();

	/**
	 * Ensure a session exists in engram. Idempotent — calls POST /sessions
	 * which uses INSERT OR IGNORE. Safe to call multiple times.
	 *
	 * Silently skips sub-agent sessions (tracked in `subAgentSessions`).
	 */
	async function ensureSession(sessionId: string): Promise<void> {
		if (!sessionId || knownSessions.has(sessionId)) return;
		// Do not register sub-agent sessions in Engram (issue #116).
		if (subAgentSessions.has(sessionId)) return;
		knownSessions.add(sessionId);
		await engramFetch("/sessions", {
			method: "POST",
			body: {
				id: sessionId,
				project,
				directory: ctx.directory,
			},
		});
	}

	// Try to start engram server if not running
	const running = await isEngramRunning();
	if (!running) {
		try {
			Bun.spawn([ENGRAM_BIN, "serve"], {
				stdout: "ignore",
				stderr: "ignore",
				stdin: "ignore",
			});
			await new Promise((r) => setTimeout(r, 500));
		} catch {
			// Binary not found or can't start — plugin will silently no-op
		}
	}

	// Auto-migrate any detected aliases to the canonical project.
	// This keeps memories unified even if project names changed over time.
	for (const alias of migrationPlan.aliases) {
		migrateProjectRows(alias, project);
	}

	// Auto-import: if .engram/manifest.json exists in the project repo,
	// run `engram sync --import` to load any new chunks into the local DB.
	// This is how git-synced memories get loaded when cloning a repo or
	// pulling changes. Each chunk is imported only once (tracked by ID).
	try {
		const manifestFile = `${ctx.directory}/.engram/manifest.json`;
		const file = Bun.file(manifestFile);
		if (await file.exists()) {
			Bun.spawn([ENGRAM_BIN, "sync", "--import"], {
				cwd: ctx.directory,
				stdout: "ignore",
				stderr: "ignore",
				stdin: "ignore",
			});
		}
	} catch {
		// Manifest doesn't exist or binary not found — silently skip
	}

	return {
		tool: {
			engram_migrate_canonical_project: tool({
				description:
					"Resolve Engram project variants for the current repo and migrate all detected aliases to the canonical project automatically. Takes no parameters.",
				args: {},
				async execute(): Promise<string> {
					const plan = resolveMigrationPlan(ctx.directory);
					const aliases = plan.aliases;

					if (aliases.length === 0) {
						return [
							"✅ No hay aliases para migrar.",
							`Canónico: ${plan.canonical}`,
							`Detectados: remote=${plan.detected.remote}, git_root=${plan.detected.gitRoot}, cwd=${plan.detected.cwd}${plan.detected.parentDir ? `, parent=${plan.detected.parentDir}` : ""}${plan.detected.parentCwd ? `, parent/cwd=${plan.detected.parentCwd}` : ""}${plan.detected.gitRootCwd ? `, git_root/cwd=${plan.detected.gitRootCwd}` : ""}`,
						].join("\n");
					}

					const migrated: string[] = [];
					const failed: string[] = [];
					let totalObservations = 0;
					let totalSessions = 0;
					let totalPrompts = 0;

					for (const alias of aliases) {
						const result = migrateProjectRows(alias, plan.canonical);

						if (!result.ok) {
							failed.push(alias);
							continue;
						}

						totalObservations += result.observations;
						totalSessions += result.sessions;
						totalPrompts += result.prompts;
						migrated.push(
							`${alias} (obs=${result.observations}, sessions=${result.sessions}, prompts=${result.prompts})`,
						);
					}

					const lines = [
						failed.length === 0
							? "✅ Migración de memorias completada."
							: "⚠️ Migración completada con errores parciales.",
						`Canónico: ${plan.canonical}`,
						`Detectados: remote=${plan.detected.remote}, git_root=${plan.detected.gitRoot}, cwd=${plan.detected.cwd}${plan.detected.parentDir ? `, parent=${plan.detected.parentDir}` : ""}${plan.detected.parentCwd ? `, parent/cwd=${plan.detected.parentCwd}` : ""}${plan.detected.gitRootCwd ? `, git_root/cwd=${plan.detected.gitRootCwd}` : ""}`,
						`Migrados: ${migrated.length > 0 ? migrated.join(", ") : "ninguno"}`,
						`Totales movidos: obs=${totalObservations}, sessions=${totalSessions}, prompts=${totalPrompts}`,
						`Footprint previo: ${Array.from(plan.footprints.entries())
							.map(([name, f]) => `${name}(obs=${f.observations}, sessions=${f.sessions}, prompts=${f.prompts})`)
							.join(", ")}`,
					];

					if (failed.length > 0) {
						lines.push(`Fallidos: ${failed.join(", ")}`);
					}

					return lines.join("\n");
				},
			}),
		},

		// ─── Event Listeners ───────────────────────────────────────────

		event: async ({ event }) => {
			// --- Session Created ---
			if (event.type === "session.created") {
				// Bug fix (#116): session data is nested under event.properties.info,
				// not event.properties directly.
				const info = (event.properties as any)?.info;
				const sessionId = info?.id;
				const parentID = info?.parentID;
				const title: string = info?.title ?? "";

				// Sub-agent sessions (created via Task()) must NOT be registered as
				// top-level Engram sessions. They cause massive session inflation
				// (e.g. 170 sessions for 1 real conversation).
				//
				// Detection heuristics:
				//   - parentID is set on all Task() sub-agent sessions
				//   - title ends with " subagent)" as a secondary signal
				const isSubAgent = !!parentID || title.endsWith(" subagent)");

				if (sessionId && !isSubAgent) {
					await ensureSession(sessionId);
				} else if (sessionId && isSubAgent) {
					// Remember this as a sub-agent session so tool-hook calls
					// to ensureSession() are also suppressed for it.
					subAgentSessions.add(sessionId);
				}
			}

			// --- Session Deleted ---
			if (event.type === "session.deleted") {
				// Same properties.info path as session.created.
				const info = (event.properties as any)?.info;
				const sessionId = info?.id;
				if (sessionId) {
					toolCounts.delete(sessionId);
					knownSessions.delete(sessionId);
					subAgentSessions.delete(sessionId);
				}
			}
		},

		// ─── User Prompt Capture ──────────────────────────────────────
		// chat.message is called once per user message, before the LLM sees it.
		// input.sessionID is always reliable here (no knownSessions workaround).
		// output.message is typed as UserMessage (role:"user" already guaranteed).
		// output.parts contains TextPart[] with the actual message text.

		"tool.execute.before": async (input, output) => {
			if (!isEngramTool(input.tool)) return;

			const toolOutput = output as any;
			const args = toolOutput?.args;
			if (args && typeof args === "object" && "project" in args) {
				delete args.project;
			}
		},

		"chat.message": async (input, output) => {
			// Skip sub-agent sessions — they inflate session counts (issue #116)
			if (subAgentSessions.has(input.sessionID)) return;

			const sessionId = input.sessionID;

			// Extract text from parts (type:"text")
			const content = output.parts
				.filter((p) => p.type === "text")
				.map((p) => (p as any).text ?? "")
				.join("\n")
				.trim();

			// Also fallback to summary if parts yield nothing
			const fallback =
				!content && output.message.summary
					? `${output.message.summary.title ?? ""}\n${output.message.summary.body ?? ""}`.trim()
					: "";

			const finalContent = content || fallback;

			// Only capture non-trivial prompts (>10 chars)
			if (finalContent.length > 10) {
				await ensureSession(sessionId);
				await engramFetch("/prompts", {
					method: "POST",
					body: {
						session_id: sessionId,
						content: stripPrivateTags(truncate(finalContent, 2000)),
						project,
					},
				});
			}
		},

		// ─── Tool Execution Hook ─────────────────────────────────────
		// Count tool calls per session (for session end stats).
		// Also ensures the session exists — handles plugin reload / reconnect.
		// Passive capture: when a Task tool completes, POST its output to
		// the passive capture endpoint so the server extracts learnings.

		"tool.execute.after": async (input, output) => {
			if (isEngramTool(input.tool)) return;

			// input.sessionID comes from OpenCode — always available
			const sessionId = input.sessionID;
			if (sessionId) {
				await ensureSession(sessionId);
				toolCounts.set(sessionId, (toolCounts.get(sessionId) ?? 0) + 1);
			}

			// Passive capture: extract learnings from Task tool output
			if (input.tool === "Task" && output && sessionId) {
				const text =
					typeof output === "string" ? output : JSON.stringify(output);
				if (text.length > 50) {
					await engramFetch("/observations/passive", {
						method: "POST",
						body: {
							session_id: sessionId,
							content: stripPrivateTags(text),
							project,
							source: "task-complete",
						},
					});
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
				output.system[output.system.length - 1] += "\n\n" + MEMORY_INSTRUCTIONS;
			} else {
				output.system.push(MEMORY_INSTRUCTIONS);
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
				await ensureSession(input.sessionID);
			}

			// Inject context from previous sessions
			const data = await engramFetch(
				`/context?project=${encodeURIComponent(project)}`,
			);
			if (data?.context) {
				output.context.push(data.context);
			}

			// Tell the compressor to instruct the new agent to persist the
			// compacted summary to Engram. The new agent reads the compacted
			// summary and this instruction, then saves it as a session summary.
			output.context.push(
				`CRITICAL INSTRUCTION FOR COMPACTED SUMMARY:\n` +
					`The agent has access to Engram persistent memory via MCP tools.\n` +
					`You MUST include the following instruction at the TOP of the compacted summary:\n\n` +
					`"FIRST ACTION REQUIRED: Call mem_session_summary with the content of this compacted summary. ` +
					`Do NOT pass an explicit project; let Engram autodetect it from the active workspace/session. ` +
					`This preserves what was accomplished before compaction. Do this BEFORE any other work."\n\n` +
					`This is NOT optional. Without this, everything done before compaction is lost from memory.`,
			);
		},
	};
};
