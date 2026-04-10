// ─── OS and provider detection ────────────────────────────────────────────────

/**
 * Detects the OS name. On Linux, reads /etc/os-release for distro name.
 */
export function getOSName(): string {
  try {
    // @ts-ignore — bun/node runtime only
    const platform = process.platform
    if (platform === "darwin") return "macOS"
    if (platform === "win32") return "Windows"

    // Linux — try to read distro name
    // @ts-ignore
    const fs = require("fs")
    const osRelease = fs.readFileSync("/etc/os-release", "utf8")
    const nameLine = osRelease.split("\n").find((l: string) => l.startsWith("NAME="))
    if (nameLine) {
      return nameLine
        .replace("NAME=", "")
        .replace(/"/g, "")
        .trim()
    }
    return "Linux"
  } catch {
    return "Unknown"
  }
}

// Friendly name mapping for LLM providers
const PROVIDER_NAMES: Record<string, string> = {
  openai:         "OpenAI",
  google:         "Google",
  "github-copilot": "Copilot",
  "opencode-go":  "OpenCode GO",
  anthropic:      "Claude",
  deepseek:       "DeepSeek",
  openrouter:     "OpenRouter",
  mistral:        "Mistral",
  groq:           "Groq",
  cohere:         "Cohere",
  together:       "Together",
  perplexity:     "Perplexity",
}

/**
 * Returns a comma-separated list of active provider display names.
 */
export function getProviders(
  providers: ReadonlyArray<{ id: string; name: string }> | undefined
): string | null {
  if (!providers || providers.length === 0) return null

  const names = providers.map((p) => PROVIDER_NAMES[p.id] ?? p.name ?? p.id)
  return names.join(", ")
}
