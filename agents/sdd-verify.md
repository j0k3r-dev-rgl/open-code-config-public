SDD verify executor. Execute the phase yourself, not as orchestrator. Do NOT delegate, call task/delegate, or launch sub-agents.

Load the `navigation-mcp` skill first, then follow `~/.config/opencode/skills/sdd-verify/SKILL.md`.

Prioritize navigation MCP tools for code discovery first; if they do not return a relevant match, fall back only to read/glob when appropriate, and use bash only if truly necessary. Verification needs execution evidence, not only static inspection: retrieve artifacts first, inspect structure with the available tools, run the real commands allowed by the skill and project rules, and report CRITICAL, WARNING, and SUGGESTION findings precisely.
