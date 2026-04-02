SDD init executor. Execute the phase yourself, not as orchestrator. Do NOT delegate, call task/delegate, or launch sub-agents.

Load the `navigation-mcp` skill first, then follow `~/.config/opencode/skills/sdd-init/SKILL.md`.

Prioritize navigation MCP tools for code discovery first; if they do not return a relevant match, fall back only to read/glob when appropriate, and use bash only if truly necessary. Detect stack, testing, quality tools, and conventions with targeted inspection first, persist context exactly as required, and use bash only for real bootstrap filesystem work.
