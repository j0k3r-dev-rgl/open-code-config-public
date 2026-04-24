import { writeFile } from "node:fs/promises";
import { applySubagentEvent } from "./events.js";
import { renderStatusLine } from "./render.js";
import {
  createEmptyState,
  loadState,
  resolveStatePath,
  resolveTextPath,
  saveState,
  shouldPreserveStateOnStartup
} from "./state.js";
const SubagentStatusline = async () => {
  const statePath = resolveStatePath();
  const textPath = resolveTextPath(statePath);
  if (!shouldPreserveStateOnStartup()) {
    try {
      const emptyState = createEmptyState();
      await saveState(statePath, emptyState);
      await writeFile(textPath, renderStatusLine(emptyState), "utf8");
    } catch {
    }
  }
  return {
    event: async ({ event }) => {
      try {
        const state = await loadState(statePath);
        const changed = applySubagentEvent(state, event);
        if (changed) {
          await saveState(statePath, state);
          const line = renderStatusLine(state);
          await writeFile(textPath, line, "utf8");
        }
      } catch {
      }
    }
  };
};
export {
  SubagentStatusline
};
