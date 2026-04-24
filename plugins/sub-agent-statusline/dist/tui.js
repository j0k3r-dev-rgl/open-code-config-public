// src/tui.tsx
import { memo as _$memo } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { execFileSync } from "child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { writeFile as writeFile2 } from "fs/promises";
import os2 from "os";
import { dirname as dirname2, join as join2 } from "path";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";

// src/state.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import os from "os";
function statusColor(status) {
  if (status === "done") return "green";
  if (status === "error") return "red";
  return "yellow";
}
function safeTimestamp(input, fallback) {
  if (typeof input !== "string") return fallback;
  return Number.isNaN(Date.parse(input)) ? fallback : input;
}
function toFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
function sanitizeTokens(input) {
  if (!input || typeof input !== "object") return void 0;
  const raw = input;
  const tokens = {
    input: toFiniteNumber(raw.input),
    output: toFiniteNumber(raw.output),
    total: toFiniteNumber(raw.total),
    contextPercent: toFiniteNumber(raw.contextPercent)
  };
  if (tokens.input === void 0 && tokens.output === void 0 && tokens.total === void 0 && tokens.contextPercent === void 0) {
    return void 0;
  }
  return tokens;
}
function mergeTokens(existing, incoming) {
  if (!existing && !incoming) return void 0;
  return {
    input: incoming?.input ?? existing?.input,
    output: incoming?.output ?? existing?.output,
    total: incoming?.total ?? existing?.total,
    contextPercent: incoming?.contextPercent ?? existing?.contextPercent
  };
}
function resolveElapsedMs(child, nowMs) {
  const startedMs = Date.parse(child.startedAt);
  if (Number.isNaN(startedMs)) return 0;
  const endSource = child.endedAt ?? child.updatedAt;
  const endMs = child.endedAt ? Date.parse(endSource) : nowMs;
  if (Number.isNaN(endMs)) return 0;
  return Math.max(0, endMs - startedMs);
}
function refreshDerivedFields(state, now = /* @__PURE__ */ new Date()) {
  const nowISO = now.toISOString();
  const nowMs = now.getTime();
  for (const [id, child] of Object.entries(state.children)) {
    const startedAt = safeTimestamp(child.startedAt, nowISO);
    const updatedAt = safeTimestamp(child.updatedAt, nowISO);
    const endedAt = child.endedAt ? safeTimestamp(child.endedAt, updatedAt) : void 0;
    const status = child.status === "done" || child.status === "error" || child.status === "running" ? child.status : "running";
    state.children[id] = {
      ...child,
      startedAt,
      updatedAt,
      endedAt,
      status,
      color: statusColor(status),
      tokens: sanitizeTokens(child.tokens),
      elapsedMs: resolveElapsedMs(
        {
          ...child,
          startedAt,
          updatedAt,
          endedAt,
          status,
          color: statusColor(status)
        },
        nowMs
      )
    };
  }
  state.updatedAt = safeTimestamp(state.updatedAt, nowISO);
}
var STATUS_DIRNAME = "opencode-subagent-statusline";
var STATUS_FILENAME = "state.json";
function sanitizeInstanceName(input) {
  return input.replace(/[^A-Za-z0-9._-]/g, "_");
}
function resolveDefaultInstanceName() {
  const fromEnv = process.env.OPENCODE_SUBAGENT_STATUSLINE_INSTANCE;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    const safe = sanitizeInstanceName(fromEnv);
    if (safe.length > 0) {
      return safe;
    }
  }
  return `pid-${process.pid}`;
}
function createEmptyState() {
  return {
    children: {},
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function resolveStatePath() {
  const fromEnv = process.env.OPENCODE_SUBAGENT_STATUSLINE_STATE;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv;
  }
  const runtimeDir = process.env.XDG_RUNTIME_DIR ?? os.tmpdir();
  const instance = resolveDefaultInstanceName();
  return join(runtimeDir, STATUS_DIRNAME, instance, STATUS_FILENAME);
}
function resolveTextPath(statePath) {
  return join(dirname(statePath), "status.txt");
}
async function saveState(statePath, state) {
  refreshDerivedFields(state);
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}
function upsertRunningChild(state, input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const observedUpdatedAt = safeTimestamp(input.updatedAt, now);
  const observedStartedAt = safeTimestamp(input.startedAt, observedUpdatedAt);
  const existing = state.children[input.id];
  const shouldKeepCompletedTiming = existing?.status === "done" || existing?.status === "error";
  const next = {
    id: input.id,
    title: input.title,
    parentID: input.parentID,
    messageID: input.messageID ?? existing?.messageID,
    source: input.source ?? existing?.source ?? "session",
    status: shouldKeepCompletedTiming ? existing.status : "running",
    color: statusColor(shouldKeepCompletedTiming ? existing.status : "running"),
    startedAt: existing?.startedAt ?? observedStartedAt,
    updatedAt: observedUpdatedAt,
    endedAt: shouldKeepCompletedTiming ? existing.endedAt : void 0,
    elapsedMs: existing?.elapsedMs,
    tokens: existing?.tokens
  };
  state.children[input.id] = next;
  state.updatedAt = observedUpdatedAt;
  return true;
}
function markChildStatus(state, childID, status, endedAt) {
  const existing = state.children[childID];
  if (!existing) {
    return false;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const observedEndedAt = safeTimestamp(endedAt, now);
  const nextChild = {
    ...existing,
    status,
    color: statusColor(status),
    updatedAt: observedEndedAt,
    endedAt: observedEndedAt
  };
  state.children[childID] = {
    ...nextChild,
    elapsedMs: resolveElapsedMs(nextChild, Date.now())
  };
  state.updatedAt = observedEndedAt;
  return true;
}
function upsertChildDetails(state, childID, input) {
  const existing = state.children[childID];
  if (!existing) return false;
  const nextTitle = typeof input.title === "string" && input.title.trim().length > 0 ? input.title : existing.title;
  const mergedTokens = mergeTokens(existing.tokens, input.tokens);
  const detailsChanged = nextTitle !== existing.title || JSON.stringify(mergedTokens) !== JSON.stringify(existing.tokens);
  const shouldTouch = existing.status === "running";
  if (!detailsChanged && !shouldTouch) return false;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const observedUpdatedAt = safeTimestamp(input.updatedAt, now);
  state.children[childID] = {
    ...existing,
    title: nextTitle,
    tokens: mergedTokens,
    updatedAt: observedUpdatedAt
  };
  state.updatedAt = observedUpdatedAt;
  return true;
}
function getCounts(state) {
  const counts = { running: 0, done: 0, error: 0 };
  for (const child of Object.values(state.children)) {
    if (child.status === "running") counts.running += 1;
    if (child.status === "done") counts.done += 1;
    if (child.status === "error") counts.error += 1;
  }
  return counts;
}

// src/events.ts
function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function extractCreatedChild(event) {
  const info = event.properties?.info;
  const parentID = asString(info?.parentID);
  if (!parentID) return null;
  const id = asString(info?.id) ?? asString(event.properties?.id);
  if (!id) return null;
  const title = asString(info?.title) ?? "subagent";
  const startedAt = extractEventTimestamp(event, [
    "started",
    "start",
    "created",
    "updated"
  ]);
  const updatedAt = extractEventTimestamp(event, ["updated", "created", "started", "start"]) ?? startedAt;
  return { id, title, parentID, startedAt, updatedAt };
}
function extractSessionID(event) {
  return asString(event.properties?.sessionID) ?? asString(event.properties?.sessionId) ?? asString(event.properties?.info?.sessionID) ?? asString(event.properties?.info?.sessionId) ?? asString(event.sessionID) ?? asString(event.sessionId) ?? asString(event.properties?.info?.id) ?? asString(event.properties?.id);
}
function isRecord(value) {
  return !!value && typeof value === "object";
}
function toIsoTimestamp(value) {
  if (typeof value === "string") {
    if (value.trim().length === 0) return void 0;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return void 0;
    return new Date(parsed).toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) return void 0;
    const millis = value < 1e10 ? value * 1e3 : value;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? void 0 : parsed.toISOString();
  }
  return void 0;
}
function extractEventTimestamp(event, keys) {
  const part = isRecord(event.properties?.part) ? event.properties?.part : void 0;
  const state = isRecord(part?.state) ? part?.state : void 0;
  const sources = [
    isRecord(event.properties?.info?.time) ? event.properties?.info?.time : void 0,
    isRecord(part?.time) ? part?.time : void 0,
    isRecord(part?.timestamps) ? part?.timestamps : void 0,
    isRecord(state?.time) ? state?.time : void 0,
    isRecord(state?.timestamps) ? state?.timestamps : void 0,
    state,
    part
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const candidate = toIsoTimestamp(source[key]);
      if (candidate) return candidate;
    }
  }
  return void 0;
}
function extractSubtaskChild(event) {
  const part = event.properties?.part;
  if (!isRecord(part) || part.type !== "subtask") return null;
  const partID = asString(part.id);
  const parentID = asString(part.sessionID) ?? extractSessionID(event);
  const messageID = asString(part.messageID);
  if (!partID || !parentID || !messageID) return null;
  const description = asString(part.description);
  const command = asString(part.command);
  const agent = asString(part.agent);
  const title = description || command || agent || "subtask";
  const startedAt = extractEventTimestamp(event, [
    "started",
    "start",
    "created",
    "updated"
  ]);
  const updatedAt = extractEventTimestamp(event, ["updated", "created", "started", "start"]) ?? startedAt;
  return {
    id: `subtask:${partID}`,
    title,
    parentID,
    messageID,
    startedAt,
    updatedAt
  };
}
function extractToolChild(event) {
  const part = event.properties?.part;
  if (!isRecord(part) || part.type !== "tool") return null;
  const tool = asString(part.tool);
  if (tool !== "delegate" && tool !== "task") return null;
  const partID = asString(part.id);
  const parentID = asString(part.sessionID) ?? extractSessionID(event);
  const messageID = asString(part.messageID);
  const state = isRecord(part.state) ? part.state : void 0;
  if (!partID || !parentID || !messageID || !state) return null;
  const rawStatus = asString(state.status);
  const status = rawStatus === "completed" ? "done" : rawStatus === "error" ? "error" : "running";
  const input = isRecord(state.input) ? state.input : {};
  const description = asString(input.description);
  const subagentType = asString(input.subagent_type);
  const title = asString(state.title) || description || subagentType || tool;
  const startedAt = extractEventTimestamp(event, [
    "started",
    "start",
    "created",
    "updated"
  ]);
  const updatedAt = extractEventTimestamp(event, ["updated", "completed", "created", "started", "start"]) ?? startedAt;
  const endedAt = status === "done" || status === "error" ? extractEventTimestamp(event, ["completed", "ended", "updated"]) : void 0;
  return {
    id: `tool:${partID}`,
    title,
    parentID,
    messageID,
    status,
    startedAt,
    updatedAt,
    endedAt
  };
}
function extractCompletedAssistantMessage(event) {
  const info = event.properties?.info;
  if (!isRecord(info)) return null;
  if (info.role !== "assistant") return null;
  const time = info.time;
  if (!isRecord(time) || typeof time.completed !== "number") return null;
  const sessionID = asString(info.sessionID) ?? extractSessionID(event);
  const messageID = asString(info.id);
  if (!sessionID || !messageID) return null;
  return { sessionID, messageID };
}
function extractDetailTargetIDs(event) {
  const ids = /* @__PURE__ */ new Set();
  const part = event.properties?.part;
  if (isRecord(part)) {
    const partID = asString(part.id);
    if (part.type === "subtask" && partID) {
      ids.add(`subtask:${partID}`);
    }
    if (part.type === "tool") {
      const tool = asString(part.tool);
      if ((tool === "delegate" || tool === "task") && partID) {
        ids.add(`tool:${partID}`);
      }
    }
  }
  const sessionID = extractSessionID(event);
  if (sessionID) ids.add(sessionID);
  return [...ids];
}
function normalizePercent(value) {
  if (value > 0 && value <= 1) {
    return value * 100;
  }
  return value;
}
function extractChildDetails(event) {
  const details = {};
  details.updatedAt = extractEventTimestamp(event, [
    "updated",
    "completed",
    "created",
    "started",
    "start"
  ]);
  const titleCandidates = [
    event.properties?.info?.title,
    event.properties?.title,
    event.properties?.info?.name,
    event.properties?.name,
    event.title,
    event.name
  ];
  for (const candidate of titleCandidates) {
    const title = asString(candidate);
    if (title) {
      details.title = title;
      break;
    }
  }
  const tokenHints = {};
  const visited = /* @__PURE__ */ new Set();
  const walk = (node, depth) => {
    if (!isRecord(node) || depth > 6) return;
    if (visited.has(node)) return;
    visited.add(node);
    for (const [rawKey, rawValue] of Object.entries(node)) {
      const key = rawKey.toLowerCase();
      const asNumber = typeof rawValue === "number" ? rawValue : typeof rawValue === "string" && rawValue.trim().length > 0 ? Number(rawValue) : void 0;
      if (typeof asNumber === "number" && Number.isFinite(asNumber)) {
        if (key.includes("context") && key.includes("percent")) {
          tokenHints.contextPercent = normalizePercent(asNumber);
        } else if (key.includes("context") && key.includes("usage")) {
          tokenHints.contextPercent = normalizePercent(asNumber);
        } else if ((key.includes("input") || key.includes("prompt")) && key.includes("token")) {
          tokenHints.input = asNumber;
        } else if ((key.includes("output") || key.includes("completion")) && key.includes("token")) {
          tokenHints.output = asNumber;
        } else if (key.includes("total") && key.includes("token")) {
          tokenHints.total = asNumber;
        } else if (key === "tokens" || key === "token") {
          tokenHints.total = asNumber;
        }
      }
      if (isRecord(rawValue)) {
        walk(rawValue, depth + 1);
      }
    }
  };
  walk(event, 0);
  if (tokenHints.input !== void 0 || tokenHints.output !== void 0 || tokenHints.total !== void 0 || tokenHints.contextPercent !== void 0) {
    details.tokens = tokenHints;
  }
  return details;
}
function applySubagentEvent(state, event) {
  const e = event ?? {};
  const type = asString(e.type);
  if (!type) return false;
  if (type === "session.created" || type === "session.updated") {
    const child = extractCreatedChild(e);
    if (child) {
      const details = extractChildDetails(e);
      let changed2 = upsertRunningChild(state, child);
      changed2 = upsertChildDetails(state, child.id, details) || changed2;
      return changed2;
    }
    return false;
  }
  if (type === "session.idle") {
    const childID = extractSessionID(e);
    if (!childID) return false;
    const endedAt = extractEventTimestamp(e, ["completed", "ended", "updated"]);
    const details = extractChildDetails(e);
    let changed2 = markChildStatus(state, childID, "done", endedAt);
    changed2 = upsertChildDetails(state, childID, details) || changed2;
    return changed2;
  }
  if (type === "session.error") {
    const childID = extractSessionID(e);
    if (!childID) return false;
    const endedAt = extractEventTimestamp(e, ["completed", "ended", "updated"]);
    const details = extractChildDetails(e);
    let changed2 = markChildStatus(state, childID, "error", endedAt);
    changed2 = upsertChildDetails(state, childID, details) || changed2;
    return changed2;
  }
  let changed = false;
  if (type === "message.part.updated") {
    const subtask = extractSubtaskChild(e);
    if (subtask) {
      changed = upsertRunningChild(state, {
        ...subtask,
        source: "subtask",
        startedAt: subtask.startedAt,
        updatedAt: subtask.updatedAt
      }) || changed;
    }
    const tool = extractToolChild(e);
    if (tool) {
      const childChanged = upsertRunningChild(state, {
        ...tool,
        source: "tool",
        startedAt: tool.startedAt,
        updatedAt: tool.updatedAt
      });
      changed = childChanged || changed;
      if (tool.status === "done" || tool.status === "error") {
        changed = markChildStatus(state, tool.id, tool.status, tool.endedAt ?? tool.updatedAt) || changed;
      }
    }
  }
  if (type === "message.updated") {
    const completed = extractCompletedAssistantMessage(e);
    if (completed) {
      for (const child of Object.values(state.children)) {
        if (child.source === "subtask" && child.status === "running" && child.parentID === completed.sessionID && child.messageID === completed.messageID) {
          changed = markChildStatus(state, child.id, "done") || changed;
        }
      }
    }
  }
  if (type === "message.updated" || type === "message.part.updated") {
    const details = extractChildDetails(e);
    for (const childID of extractDetailTargetIDs(e)) {
      if (state.children[childID]) {
        changed = upsertChildDetails(state, childID, details) || changed;
      }
    }
  }
  return changed;
}

// src/render.ts
var ansi = {
  reset: "\x1B[0m",
  gray: "\x1B[90m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  red: "\x1B[31m"
};
function colorsEnabled() {
  if (process.env.NO_COLOR) return false;
  const fromEnv = process.env.OPENCODE_SUBAGENT_STATUSLINE_COLOR;
  if (fromEnv === "0") return false;
  return true;
}
function paint(text, color, enabled) {
  if (!enabled) return text;
  return `${color}${text}${ansi.reset}`;
}
function formatDuration(elapsedMs2) {
  const totalSeconds = Math.max(0, Math.floor((elapsedMs2 ?? 0) / 1e3));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function formatNumber(value) {
  return Math.max(0, Math.round(value)).toLocaleString("en-US");
}
function resolveTokenTotal(child) {
  const total = child.tokens?.total;
  if (typeof total === "number" && Number.isFinite(total)) {
    return total;
  }
  const inTokens = child.tokens?.input;
  const outTokens = child.tokens?.output;
  if (typeof inTokens === "number" || typeof outTokens === "number") {
    return (inTokens ?? 0) + (outTokens ?? 0);
  }
  return void 0;
}
function formatPercentUsed(percent) {
  const rounded = Math.round(percent * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
    return `${Math.round(rounded)}% used`;
  }
  return `${rounded.toFixed(1)}% used`;
}
function formatTokenCount(total) {
  const label = total === 1 ? "token" : "tokens";
  return `${formatNumber(total)} ${label}`;
}
function formatContextDetails(child) {
  const total = resolveTokenTotal(child);
  const percent = child.tokens?.contextPercent;
  const hasPercent = typeof percent === "number" && Number.isFinite(percent);
  const hasTotal = typeof total === "number" && Number.isFinite(total);
  if (hasTotal && hasPercent) {
    return `${formatTokenCount(total)} \xB7 ${formatPercentUsed(percent)}`;
  }
  if (hasTotal) {
    return formatTokenCount(total);
  }
  if (hasPercent) {
    return formatPercentUsed(percent);
  }
  return void 0;
}
function formatContext(child) {
  const details = formatContextDetails(child);
  if (!details) return "";
  return `ctx ${details}`;
}
function childColor(child) {
  if (child.color === "green") return ansi.green;
  if (child.color === "red") return ansi.red;
  return ansi.yellow;
}
function byPriority(a, b) {
  const rank = (status) => {
    if (status === "running") return 0;
    if (status === "error") return 1;
    return 2;
  };
  const diff = rank(a.status) - rank(b.status);
  if (diff !== 0) return diff;
  return b.updatedAt.localeCompare(a.updatedAt);
}
function renderStatusLine(state) {
  const allChildren = Object.values(state.children);
  const hasMatchingSubtask = (child) => child.source === "tool" && allChildren.some(
    (candidate) => candidate.source === "subtask" && candidate.parentID === child.parentID && candidate.messageID === child.messageID
  );
  const children = allChildren.filter((child) => !hasMatchingSubtask(child)).sort(byPriority);
  const running = children.filter((c) => c.status === "running").length;
  const done = children.filter((c) => c.status === "done").length;
  const error = children.filter((c) => c.status === "error").length;
  const colorOn = colorsEnabled();
  const aggregate = `\u21B3 ${running} running \xB7 ${done} done \xB7 ${error} error`;
  if (children.length === 0) return aggregate;
  const details = children.map((child) => {
    const context = formatContext(child);
    const label = [child.title, formatDuration(child.elapsedMs), context].filter((part) => part.length > 0).join(" ");
    return paint(label, childColor(child), colorOn);
  }).join(paint(" \xB7 ", ansi.gray, colorOn));
  return `${aggregate} \xB7 ${details}`;
}

// src/tui.tsx
var TUI_PLUGIN_ID = "subagent-statusline.tui";
var ELAPSED_TICK_MS = 1e3;
var FALLBACK_SIDEBAR_WIDTH = 46;
var MIN_ROW_WIDTH = 24;
var MIN_LABEL_WIDTH = 8;
var DONE_TOKEN_REHYDRATE_THROTTLE_MS = 2e3;
var DONE_TOKEN_REHYDRATE_MAX_ATTEMPTS = 15;
var CLOCK_ICON = "\uF017";
var TOKEN_ICON = "\uF51E";
var doneTokenCache = /* @__PURE__ */ new Map();
function debugLog(input) {
  if (!process.env.OPENCODE_SUBAGENT_STATUSLINE_DEBUG_EVENTS) return;
  try {
    const path = join2(process.env.XDG_RUNTIME_DIR ?? os2.tmpdir(), "opencode-subagent-statusline", "tui-events.log");
    mkdirSync(dirname2(path), {
      recursive: true
    });
    const line = JSON.stringify({
      time: (/* @__PURE__ */ new Date()).toISOString(),
      ...input
    });
    appendFileSync(path, `${line}
`, "utf8");
  } catch {
  }
}
function debugEvent(event) {
  const e = event;
  const part = e.properties?.part;
  debugLog({
    kind: "event",
    type: e.type,
    sessionID: e.properties?.sessionID,
    partType: part?.type,
    tool: part?.tool,
    toolStatus: part?.state?.status
  });
}
function cloneState(state) {
  return {
    updatedAt: state.updatedAt,
    children: Object.fromEntries(Object.entries(state.children).map(([id, child]) => [id, {
      ...child,
      tokens: child.tokens ? {
        ...child.tokens
      } : void 0
    }]))
  };
}
function mergeTokenState(existing, incoming) {
  if (!existing && !incoming) return void 0;
  return {
    input: incoming?.input ?? existing?.input,
    output: incoming?.output ?? existing?.output,
    total: incoming?.total ?? existing?.total,
    contextPercent: incoming?.contextPercent ?? existing?.contextPercent
  };
}
function hasTokenTotal(tokens) {
  return typeof tokens?.total === "number" && Number.isFinite(tokens.total);
}
function sameTokens(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function asRecord(value) {
  return value && typeof value === "object" ? value : void 0;
}
function tokenStateFromMessageData(data) {
  const parsed = safeRead(() => JSON.parse(data));
  return parsed?.tokens;
}
function resolveOpenCodeDataDir() {
  return join2(process.env.XDG_DATA_HOME ?? join2(os2.homedir(), ".local", "share"), "opencode");
}
function resolveOpenCodeDbPath() {
  return process.env.OPENCODE_SUBAGENT_STATUSLINE_OPENCODE_DB ?? join2(resolveOpenCodeDataDir(), "opencode.db");
}
function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}
function readDoneTokensFromOpenCodeDb(sessionID) {
  const dbPath = resolveOpenCodeDbPath();
  if (!existsSync(dbPath)) return void 0;
  const output = safeRead(() => execFileSync("sqlite3", [dbPath, `select data from message where session_id='${escapeSqlString(sessionID)}' and json_extract(data, '$.tokens.total') is not null order by time_created desc;`], {
    encoding: "utf8",
    timeout: 1e3,
    maxBuffer: 1024 * 1024
  }));
  if (!output) return void 0;
  let tokens;
  for (const line of output.split("\n")) {
    const hydrated = tokenStateFromMessageData(line.trim());
    tokens = mergeTokenState(tokens, hydrated);
    if (hasTokenTotal(tokens)) break;
  }
  return tokens;
}
function readDoneTokensFromOpenCodeLogs(sessionID) {
  const logDir = join2(resolveOpenCodeDataDir(), "log");
  if (!existsSync(logDir)) return void 0;
  const files = safeRead(() => readdirSync(logDir).filter((file) => file.endsWith(".log")).sort().reverse().slice(0, 8));
  if (!files) return void 0;
  const tokenPattern = /"tokens"\s*:\s*(\{[^\n]*?\})/g;
  let tokens;
  for (const file of files) {
    const contents = safeRead(() => readFileSync(join2(logDir, file), "utf8"));
    if (!contents || !contents.includes(sessionID)) continue;
    for (const line of contents.split("\n")) {
      if (!line.includes(sessionID) || !line.includes('"tokens"')) continue;
      for (const match of line.matchAll(tokenPattern)) {
        const hydrated = safeRead(() => JSON.parse(match[1] ?? "{}"));
        tokens = mergeTokenState(tokens, hydrated);
        if (hasTokenTotal(tokens)) return tokens;
      }
    }
  }
  return tokens;
}
function rehydrateDoneChildTokens(child) {
  if (child.status !== "done") return void 0;
  if (hasTokenTotal(child.tokens)) return void 0;
  if (!child.id.startsWith("ses_")) return void 0;
  const nowMs = Date.now();
  const cached = doneTokenCache.get(child.id);
  if (cached?.tokens) return cached.tokens;
  if (cached && cached.attempts >= DONE_TOKEN_REHYDRATE_MAX_ATTEMPTS) {
    return void 0;
  }
  if (cached && nowMs - cached.checkedAtMs < DONE_TOKEN_REHYDRATE_THROTTLE_MS) {
    return void 0;
  }
  const tokens = readDoneTokensFromOpenCodeDb(child.id) ?? readDoneTokensFromOpenCodeLogs(child.id);
  doneTokenCache.set(child.id, {
    attempts: (cached?.attempts ?? 0) + 1,
    checkedAtMs: nowMs,
    tokens
  });
  if (tokens) {
    debugLog({
      kind: "state.tokens.rehydrated.done",
      id: child.id,
      title: child.title,
      tokens
    });
  }
  return tokens;
}
function safeRead(read) {
  try {
    return read();
  } catch {
    return void 0;
  }
}
function messageIDOf(message) {
  const record = asRecord(message);
  if (!record) return void 0;
  const id = record.id ?? record.messageID ?? record.messageId;
  return typeof id === "string" && id.length > 0 ? id : void 0;
}
function pushSessionCandidates(api, sessionID, candidates) {
  if (!sessionID) return;
  const status = safeRead(() => api.state.session.status(sessionID));
  if (status) candidates.push(status);
  const messages = safeRead(() => api.state.session.messages(sessionID));
  if (!messages) return;
  candidates.push(messages);
  for (const message of messages) {
    const messageID = messageIDOf(message);
    if (!messageID) continue;
    const parts = safeRead(() => api.state.part(messageID));
    if (parts) candidates.push(parts);
  }
}
function hydrateChildTokensFromTuiState(api, child) {
  const candidates = [];
  pushSessionCandidates(api, child.id, candidates);
  if (child.messageID) {
    const parentParts = safeRead(() => api.state.part(child.messageID));
    if (parentParts) candidates.push(parentParts);
    const parentMessages = safeRead(() => api.state.session.messages(child.parentID));
    const parentMessage = parentMessages?.find((message) => messageIDOf(message) === child.messageID);
    if (parentMessage) candidates.push(parentMessage);
  }
  let tokens;
  for (const candidate of candidates) {
    tokens = mergeTokenState(tokens, extractChildDetails(candidate).tokens);
  }
  tokens = mergeTokenState(tokens, rehydrateDoneChildTokens(child));
  return tokens;
}
function hydrateStateTokensFromTuiState(api, state) {
  let changed = false;
  for (const child of Object.values(state.children)) {
    const hydrated = hydrateChildTokensFromTuiState(api, child);
    const nextTokens = mergeTokenState(child.tokens, hydrated);
    if (!sameTokens(child.tokens, nextTokens)) {
      child.tokens = nextTokens;
      child.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      changed = true;
    }
  }
  if (changed) {
    state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    debugLog({
      kind: "state.tokens.hydrated",
      children: Object.values(state.children).map((child) => ({
        id: child.id,
        title: child.title,
        tokens: child.tokens
      }))
    });
  }
  return changed;
}
function persistStateSnapshot(statePath, textPath, state) {
  const snapshot = cloneState(state);
  void (async () => {
    try {
      await saveState(statePath, snapshot);
      await writeFile2(textPath, renderStatusLine(snapshot), "utf8");
    } catch {
    }
  })();
}
function elapsedMs(child, nowMs) {
  if (child.status !== "running") {
    return child.elapsedMs ?? 0;
  }
  const started = Date.parse(child.startedAt);
  if (Number.isNaN(started)) return child.elapsedMs ?? 0;
  return Math.max(0, nowMs - started);
}
function statusIcon(status) {
  if (status === "done") return "\u2713";
  if (status === "error") return "\u2715";
  return "\u25CF";
}
function statusColor2(status, theme) {
  if (status === "done") return theme.success;
  if (status === "error") return theme.error;
  return theme.warning;
}
function normalizeTitle(value) {
  return value.toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}
function relatedTitles(a, b) {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}
function isGenericToolWrapper(child) {
  if (child.source !== "tool") return false;
  const title = normalizeTitle(child.title);
  return title === "delegate" || title === "task";
}
function collapseToolWrappers(children) {
  const realChildren = children.filter((child) => child.source !== "tool");
  return children.filter((child) => {
    if (child.source !== "tool") return true;
    if (isGenericToolWrapper(child) && realChildren.some((real) => real.parentID === child.parentID)) {
      return false;
    }
    return !realChildren.some((real) => real.parentID === child.parentID && relatedTitles(real.title, child.title));
  });
}
function toFinitePositiveInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : void 0;
}
function resolveSidebarWidth(ctx) {
  const source = asRecord(ctx);
  if (!source) return void 0;
  const direct = toFinitePositiveInt(source.width) ?? toFinitePositiveInt(source.columns) ?? toFinitePositiveInt(source.cols);
  if (direct) return direct;
  const size = asRecord(source.size);
  const viewport = asRecord(source.viewport);
  const bounds = asRecord(source.bounds);
  return toFinitePositiveInt(size?.width) ?? toFinitePositiveInt(viewport?.width) ?? toFinitePositiveInt(bounds?.width);
}
function ellipsize(value, maxChars) {
  if (maxChars <= 0) return "";
  if (value.length <= maxChars) return value;
  if (maxChars <= 1) return "\u2026";
  return `${value.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}
function splitParentheticalTitle(title) {
  const match = title.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return {
    label: title
  };
  const label = match[1]?.trim();
  const parenthetical = match[2]?.trim();
  if (!label || !parenthetical) return {
    label: title
  };
  return {
    label,
    parenthetical
  };
}
function resolveTokenTotal2(child) {
  const total = child.tokens?.total;
  if (typeof total === "number" && Number.isFinite(total)) {
    return total;
  }
  const input = child.tokens?.input;
  const output = child.tokens?.output;
  if (typeof input === "number" || typeof output === "number") {
    return Math.max(0, (input ?? 0) + (output ?? 0));
  }
  return void 0;
}
function formatCompactTokenCount(total) {
  const value = Math.max(0, total);
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M tok`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k tok`;
  return `${Math.round(value)} tok`;
}
function formatCompactPercent(percent) {
  return `${Math.max(0, Math.round(percent))}%`;
}
function contextVariants(child) {
  const total = resolveTokenTotal2(child);
  const percent = child.tokens?.contextPercent;
  const hasTotal = typeof total === "number" && Number.isFinite(total);
  const hasPercent = typeof percent === "number" && Number.isFinite(percent);
  if (!hasTotal && !hasPercent) return [""];
  const tokenPart = hasTotal ? formatCompactTokenCount(total) : "";
  const percentPart = hasPercent ? formatCompactPercent(percent) : "";
  if (tokenPart && percentPart) {
    return [`${tokenPart} ${percentPart}`, percentPart, tokenPart, ""];
  }
  return [tokenPart || percentPart, ""];
}
function rowWidthBudget(sidebarWidth) {
  const width = sidebarWidth ?? FALLBACK_SIDEBAR_WIDTH;
  return Math.max(MIN_ROW_WIDTH, Math.min(width, 120));
}
function formatChildRowLine(input) {
  const elapsed = formatDuration(elapsedMs(input.child, input.nowMs));
  const width = rowWidthBudget(input.sidebarWidth);
  const title = splitParentheticalTitle(input.child.title);
  for (const meta of contextVariants(input.child)) {
    const detailChars = 2 + elapsed.length + (meta ? 3 + meta.length : 0);
    const labelBudget = Math.min(width - 2, width - Math.max(0, detailChars - width));
    if (labelBudget >= MIN_LABEL_WIDTH || meta.length === 0) {
      return {
        label: ellipsize(title.label, Math.max(1, labelBudget)),
        parenthetical: title.parenthetical,
        elapsed,
        meta
      };
    }
  }
  return {
    label: ellipsize(title.label, MIN_LABEL_WIDTH),
    parenthetical: title.parenthetical,
    elapsed,
    meta: ""
  };
}
function SidebarSubagents(props) {
  const children = createMemo(() => collapseToolWrappers(Object.values(props.state().children).filter((child) => child.parentID === props.sessionID)).sort(byPriority));
  const otherChildren = createMemo(() => collapseToolWrappers(Object.values(props.state().children).filter((child) => child.parentID !== props.sessionID)).sort(byPriority));
  const counts = createMemo(() => {
    const result = {
      running: 0,
      done: 0,
      error: 0
    };
    for (const child of children()) {
      if (child.status === "running") result.running += 1;
      if (child.status === "done") result.done += 1;
      if (child.status === "error") result.error += 1;
    }
    return result;
  });
  const ChildRow = (rowProps) => {
    const child = () => rowProps.child;
    const line = createMemo(() => formatChildRowLine({
      child: child(),
      nowMs: props.nowMs(),
      sidebarWidth: props.sidebarWidth?.()
    }));
    return (() => {
      var _el$ = _$createElement("box"), _el$2 = _$createElement("box"), _el$3 = _$createElement("text"), _el$4 = _$createElement("text"), _el$5 = _$createElement("box"), _el$6 = _$createElement("text");
      _$insertNode(_el$, _el$2);
      _$insertNode(_el$, _el$5);
      _$setProp(_el$, "flexDirection", "column");
      _$insertNode(_el$2, _el$3);
      _$insertNode(_el$2, _el$4);
      _$setProp(_el$2, "flexDirection", "row");
      _$insert(_el$3, () => statusIcon(child().status));
      _$insert(_el$4, () => ` ${line().label}`);
      _$insert(_el$, _$createComponent(Show, {
        get when() {
          return line().parenthetical;
        },
        children: (parenthetical) => (() => {
          var _el$8 = _$createElement("text");
          _$insert(_el$8, () => `  ${parenthetical()}`);
          _$effect((_$p) => _$setProp(_el$8, "fg", props.theme.textMuted, _$p));
          return _el$8;
        })()
      }), _el$5);
      _$insertNode(_el$5, _el$6);
      _$setProp(_el$5, "flexDirection", "row");
      _$setProp(_el$5, "paddingLeft", 2);
      _$insert(_el$6, () => `${CLOCK_ICON} ${line().elapsed}`);
      _$insert(_el$5, _$createComponent(Show, {
        get when() {
          return line().meta.length > 0;
        },
        get children() {
          var _el$7 = _$createElement("text");
          _$insert(_el$7, () => ` ${TOKEN_ICON} ${line().meta}`);
          _$effect((_$p) => _$setProp(_el$7, "fg", props.theme.textMuted, _$p));
          return _el$7;
        }
      }), null);
      _$effect((_p$) => {
        var _v$ = statusColor2(child().status, props.theme), _v$2 = props.theme.text, _v$3 = props.theme.textMuted;
        _v$ !== _p$.e && (_p$.e = _$setProp(_el$3, "fg", _v$, _p$.e));
        _v$2 !== _p$.t && (_p$.t = _$setProp(_el$4, "fg", _v$2, _p$.t));
        _v$3 !== _p$.a && (_p$.a = _$setProp(_el$6, "fg", _v$3, _p$.a));
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0
      });
      return _el$;
    })();
  };
  const AggregateBar = () => (() => {
    var _el$9 = _$createElement("box"), _el$0 = _$createElement("text"), _el$1 = _$createElement("text"), _el$11 = _$createElement("text"), _el$12 = _$createElement("text"), _el$14 = _$createElement("text");
    _$insertNode(_el$9, _el$0);
    _$insertNode(_el$9, _el$1);
    _$insertNode(_el$9, _el$11);
    _$insertNode(_el$9, _el$12);
    _$insertNode(_el$9, _el$14);
    _$setProp(_el$9, "flexDirection", "row");
    _$setProp(_el$9, "paddingRight", 1);
    _$insert(_el$0, () => `\u25CF ${counts().running} running`);
    _$insertNode(_el$1, _$createTextNode(` \xB7 `));
    _$insert(_el$11, () => `\u2713 ${counts().done} done`);
    _$insertNode(_el$12, _$createTextNode(` \xB7 `));
    _$insert(_el$14, () => `\u2715 ${counts().error} error`);
    _$effect((_p$) => {
      var _v$4 = props.theme.warning, _v$5 = props.theme.textMuted, _v$6 = props.theme.success, _v$7 = props.theme.textMuted, _v$8 = props.theme.error;
      _v$4 !== _p$.e && (_p$.e = _$setProp(_el$0, "fg", _v$4, _p$.e));
      _v$5 !== _p$.t && (_p$.t = _$setProp(_el$1, "fg", _v$5, _p$.t));
      _v$6 !== _p$.a && (_p$.a = _$setProp(_el$11, "fg", _v$6, _p$.a));
      _v$7 !== _p$.o && (_p$.o = _$setProp(_el$12, "fg", _v$7, _p$.o));
      _v$8 !== _p$.i && (_p$.i = _$setProp(_el$14, "fg", _v$8, _p$.i));
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0
    });
    return _el$9;
  })();
  return (() => {
    var _el$15 = _$createElement("box"), _el$16 = _$createElement("text"), _el$18 = _$createElement("box");
    _$insertNode(_el$15, _el$16);
    _$insertNode(_el$15, _el$18);
    _$setProp(_el$15, "flexDirection", "column");
    _$insertNode(_el$16, _$createTextNode(`Subagents`));
    _$insert(_el$15, _$createComponent(AggregateBar, {}), _el$18);
    _$setProp(_el$18, "flexDirection", "column");
    _$insert(_el$18, _$createComponent(For, {
      get each() {
        return children();
      },
      children: (child) => _$createComponent(ChildRow, {
        child
      })
    }), null);
    _$insert(_el$18, _$createComponent(Show, {
      get when() {
        return _$memo(() => children().length === 0)() && otherChildren().length > 0;
      },
      get children() {
        return [(() => {
          var _el$19 = _$createElement("text");
          _$insertNode(_el$19, _$createTextNode(`Other sessions`));
          _$effect((_$p) => _$setProp(_el$19, "fg", props.theme.textMuted, _$p));
          return _el$19;
        })(), _$createComponent(For, {
          get each() {
            return otherChildren();
          },
          children: (child) => _$createComponent(ChildRow, {
            child
          })
        })];
      }
    }), null);
    _$effect((_$p) => _$setProp(_el$16, "fg", props.theme.text, _$p));
    return _el$15;
  })();
}
function HomeBottomStatus(props) {
  const counts = createMemo(() => getCounts(props.state()));
  const visible = createMemo(() => counts().running > 0 || counts().error > 0);
  return _$createComponent(Show, {
    get when() {
      return visible();
    },
    get children() {
      var _el$21 = _$createElement("box"), _el$22 = _$createElement("box"), _el$23 = _$createElement("text"), _el$24 = _$createElement("text"), _el$26 = _$createElement("text"), _el$27 = _$createElement("text"), _el$29 = _$createElement("text");
      _$insertNode(_el$21, _el$22);
      _$setProp(_el$21, "paddingLeft", 1);
      _$setProp(_el$21, "paddingRight", 1);
      _$insertNode(_el$22, _el$23);
      _$insertNode(_el$22, _el$24);
      _$insertNode(_el$22, _el$26);
      _$insertNode(_el$22, _el$27);
      _$insertNode(_el$22, _el$29);
      _$setProp(_el$22, "flexDirection", "row");
      _$insert(_el$23, () => `\u25CF ${counts().running}`);
      _$insertNode(_el$24, _$createTextNode(` \xB7 `));
      _$insert(_el$26, () => `\u2713 ${counts().done}`);
      _$insertNode(_el$27, _$createTextNode(` \xB7 `));
      _$insert(_el$29, () => `\u2715 ${counts().error}`);
      _$effect((_p$) => {
        var _v$9 = props.theme.warning, _v$0 = props.theme.textMuted, _v$1 = props.theme.success, _v$10 = props.theme.textMuted, _v$11 = props.theme.error;
        _v$9 !== _p$.e && (_p$.e = _$setProp(_el$23, "fg", _v$9, _p$.e));
        _v$0 !== _p$.t && (_p$.t = _$setProp(_el$24, "fg", _v$0, _p$.t));
        _v$1 !== _p$.a && (_p$.a = _$setProp(_el$26, "fg", _v$1, _p$.a));
        _v$10 !== _p$.o && (_p$.o = _$setProp(_el$27, "fg", _v$10, _p$.o));
        _v$11 !== _p$.i && (_p$.i = _$setProp(_el$29, "fg", _v$11, _p$.i));
        return _p$;
      }, {
        e: void 0,
        t: void 0,
        a: void 0,
        o: void 0,
        i: void 0
      });
      return _el$21;
    }
  });
}
async function hydratePreviousSubagents(api, currentSessionID, statePath, textPath, setState) {
  if (!currentSessionID) return false;
  try {
    const directory = api.state.path.directory;
    const sessionClient = api.client.session;
    let topLevelHydrationFailed = false;
    const [childrenResp, messagesResp, statusResp] = await Promise.all([(async () => {
      const response = await safeReadAsync(() => sessionClient?.children?.({
        sessionID: currentSessionID,
        directory
      }) ?? Promise.resolve({
        data: []
      }));
      if (!response) topLevelHydrationFailed = true;
      return response;
    })(), (async () => {
      const response = await safeReadAsync(() => sessionClient?.messages?.({
        sessionID: currentSessionID,
        directory
      }) ?? Promise.resolve({
        data: []
      }));
      if (!response) topLevelHydrationFailed = true;
      return response;
    })(), (async () => {
      const response = await safeReadAsync(() => sessionClient?.status?.({
        directory
      }) ?? Promise.resolve({
        data: {}
      }));
      if (!response) topLevelHydrationFailed = true;
      return response;
    })()]);
    const children = Array.isArray(childrenResp?.data) ? childrenResp.data : [];
    const messages = Array.isArray(messagesResp?.data) ? messagesResp.data : [];
    const allStatuses = asRecord(statusResp?.data) ?? {};
    let childHydrationFailed = false;
    const childMessageResults = await Promise.all(children.map(async (child) => {
      const session = asRecord(child);
      const childID = typeof session?.id === "string" ? session.id : void 0;
      if (!childID) {
        return {
          childID: void 0,
          completedAt: void 0,
          hasError: false
        };
      }
      const childMessagesResp = await safeReadAsync(() => sessionClient?.messages?.({
        sessionID: childID,
        directory
      }) ?? Promise.resolve({
        data: []
      }));
      if (!childMessagesResp) {
        childHydrationFailed = true;
      }
      const childMessages = Array.isArray(childMessagesResp?.data) ? childMessagesResp.data : [];
      return {
        childID,
        ...summarizeAssistantMessages(childMessages)
      };
    }));
    const childErrors = new Set(childMessageResults.filter((result) => result.childID && result.hasError).map((result) => result.childID));
    const childCompletedAt = new Map(childMessageResults.filter((result) => result.childID && result.completedAt).map((result) => [result.childID, result.completedAt]));
    setState((current) => {
      const next = cloneState(current);
      let changed = false;
      for (const rawSession of children) {
        const session = asRecord(rawSession);
        if (!session || typeof session.id !== "string") continue;
        const fakeEvent = {
          type: "session.created",
          properties: {
            sessionID: session.id,
            info: session
          }
        };
        if (applySubagentEvent(next, fakeEvent)) changed = true;
        const status = asRecord(allStatuses[session.id]);
        const isBusy = status?.type === "busy";
        const endedAt = childCompletedAt.get(session.id) ?? sessionTimestamp(session, "updated");
        if (!isBusy && endedAt) {
          const childStatus = childErrors.has(session.id) ? "error" : "done";
          if (markChildStatus(next, session.id, childStatus, endedAt)) changed = true;
        }
      }
      for (const rawMessage of messages) {
        const message = asRecord(rawMessage);
        const info = asRecord(message?.info);
        const parts = Array.isArray(message?.parts) ? message.parts : [];
        const parentMessageID = messageIDOf(message);
        const isAssistant = info?.role === "assistant";
        const time = asRecord(info?.time);
        const eventInfo = time ? {
          time
        } : void 0;
        const completedAt = timestampFromUnknown(time?.completed);
        const isCompleted = typeof completedAt === "string";
        const hasError = !!info?.error;
        for (const rawPart of parts) {
          const part = asRecord(rawPart);
          if (!part) continue;
          const partWithMessageID = typeof part.messageID === "string" && part.messageID.length > 0 ? part : parentMessageID ? {
            ...part,
            messageID: parentMessageID
          } : part;
          if (part.type === "subtask" || part.type === "tool" && (part.tool === "delegate" || part.tool === "task")) {
            const fakeEvent = {
              type: "message.part.updated",
              properties: {
                sessionID: currentSessionID,
                info: eventInfo,
                part: partWithMessageID
              }
            };
            if (applySubagentEvent(next, fakeEvent)) changed = true;
            if (part.type === "subtask" && isAssistant && isCompleted) {
              const childID = `subtask:${part.id}`;
              const status = hasError ? "error" : "done";
              if (markChildStatus(next, childID, status, completedAt)) changed = true;
            }
          }
        }
      }
      if (!changed) return current;
      persistStateSnapshot(statePath, textPath, next);
      return next;
    });
    if (topLevelHydrationFailed || childHydrationFailed) return false;
    return true;
  } catch (err) {
    debugLog({
      kind: "hydration.error",
      sessionID: currentSessionID,
      error: String(err)
    });
    return false;
  }
}
async function safeReadAsync(read) {
  try {
    return await read();
  } catch {
    return void 0;
  }
}
function summarizeAssistantMessages(messages) {
  let completedAt;
  let hasError = false;
  const assistantMessages = messages.map((rawMessage) => asRecord(rawMessage)).map((message) => asRecord(message?.info)).filter((info) => info?.role === "assistant").sort((left, right) => messageTimeMillis(left) - messageTimeMillis(right));
  for (const info of assistantMessages) {
    const time = asRecord(info.time);
    const candidate = timestampFromUnknown(time?.completed);
    if (info.error) {
      hasError = true;
    } else if (candidate) {
      completedAt = candidate;
      hasError = false;
    }
  }
  return {
    completedAt,
    hasError
  };
}
function messageTimeMillis(info) {
  const time = asRecord(info?.time);
  return timestampMillisFromUnknown(time?.completed) ?? timestampMillisFromUnknown(time?.updated) ?? timestampMillisFromUnknown(time?.created) ?? 0;
}
function sessionTimestamp(session, key) {
  const time = asRecord(session.time);
  return timestampFromUnknown(time?.[key]);
}
function timestampFromUnknown(value) {
  const millis = timestampMillisFromUnknown(value);
  return millis === void 0 ? void 0 : new Date(millis).toISOString();
}
function timestampMillisFromUnknown(value) {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const millis = value < 1e10 ? value * 1e3 : value;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? void 0 : millis;
  }
  return void 0;
}
var tui = async (api) => {
  const statePath = resolveStatePath();
  const textPath = resolveTextPath(statePath);
  const [state, setState] = createSignal(createEmptyState());
  const [nowMs, setNowMs] = createSignal(Date.now());
  const [hydratedSessions, setHydratedSessions] = createSignal(/* @__PURE__ */ new Set());
  const [hydratingSessions, setHydratingSessions] = createSignal(/* @__PURE__ */ new Set());
  const [hydrateRetryTick, setHydrateRetryTick] = createSignal(0);
  createEffect(() => {
    hydrateRetryTick();
    const route = api.route.current;
    if (route.name === "session" && typeof route.params?.sessionID === "string") {
      const sessionID = route.params.sessionID;
      if (hydratedSessions().has(sessionID) || hydratingSessions().has(sessionID)) {
        return;
      }
      setHydratingSessions((prev) => {
        const next = new Set(prev);
        next.add(sessionID);
        return next;
      });
      void (async () => {
        const hydrated = await hydratePreviousSubagents(api, sessionID, statePath, textPath, setState);
        setHydratingSessions((prev) => {
          const next = new Set(prev);
          next.delete(sessionID);
          return next;
        });
        if (hydrated) {
          setHydratedSessions((prev) => {
            const next = new Set(prev);
            next.add(sessionID);
            return next;
          });
          return;
        }
        setTimeout(() => {
          setHydrateRetryTick((value) => value + 1);
        }, 1e3);
      })();
    }
  });
  const tick = setInterval(() => {
    setNowMs(Date.now());
    setState((current) => {
      const next = cloneState(current);
      if (!hydrateStateTokensFromTuiState(api, next)) return current;
      persistStateSnapshot(statePath, textPath, next);
      return next;
    });
  }, ELAPSED_TICK_MS);
  const applyEvent = (event) => {
    debugEvent(event);
    setState((current) => {
      const next = cloneState(current);
      const changed = applySubagentEvent(next, event);
      const hydrated = hydrateStateTokensFromTuiState(api, next);
      if (changed) {
        debugLog({
          kind: "state.changed",
          children: Object.values(next.children).map((child) => ({
            id: child.id,
            parentID: child.parentID,
            title: child.title,
            status: child.status,
            source: child.source
          }))
        });
      }
      if (!changed && !hydrated) return current;
      persistStateSnapshot(statePath, textPath, next);
      return next;
    });
  };
  const disposers = [api.event.on("session.created", applyEvent), api.event.on("session.updated", applyEvent), api.event.on("session.idle", applyEvent), api.event.on("session.error", applyEvent), api.event.on("message.updated", applyEvent), api.event.on("message.part.updated", applyEvent)];
  api.lifecycle.onDispose(() => {
    clearInterval(tick);
    for (const dispose of disposers) {
      dispose();
    }
  });
  api.slots.register({
    slots: {
      sidebar_content(ctx) {
        const routeSessionID = api.route.current.name === "session" && typeof api.route.current.params?.sessionID === "string" ? api.route.current.params.sessionID : void 0;
        const sessionID = ctx.session_id ?? routeSessionID ?? "";
        debugLog({
          kind: "slot.sidebar_content",
          ctxSessionID: ctx.session_id,
          resolvedSessionID: sessionID,
          route: api.route.current,
          childCount: Object.keys(state().children).length
        });
        return _$createComponent(SidebarSubagents, {
          sessionID,
          state,
          nowMs,
          sidebarWidth: () => resolveSidebarWidth(ctx),
          get theme() {
            return ctx.theme.current;
          }
        });
      },
      home_bottom(ctx) {
        return _$createComponent(HomeBottomStatus, {
          state,
          get theme() {
            return ctx.theme.current;
          }
        });
      }
    }
  });
};
var plugin = {
  id: TUI_PLUGIN_ID,
  tui
};
var tui_default = plugin;
export {
  tui_default as default
};
