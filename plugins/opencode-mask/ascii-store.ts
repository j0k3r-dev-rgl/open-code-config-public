/**
 * Store de ASCII arts.
 * Archivos en ~/.config/opencode/ascii/
 *   arts.json   — artes guardados { id, name, lines, color }
 *   active.json — { id } del arte activo
 *   <nombre>.txt — archivos fuente que el usuario crea/edita manualmente
 */

// @ts-nocheck
import * as fs   from "node:fs"
import * as path from "node:path"
import * as os   from "node:os"

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type AsciiArt = {
  id:       string    // ID único (timestamp base36)
  name:     string    // nombre descriptivo
  filename: string    // nombre del .txt sin extensión
  lines:    string[]  // líneas del arte (cacheadas en JSON)
  color:    string    // color principal (hex)
  colors?:  string[]  // colores por sección (opcional, índices de línea)
}

// ─── Rutas ───────────────────────────────────────────────────────────────────

export const getStoreDir = (): string => {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
  return path.join(xdgConfig, "opencode", "ascii")
}

const getArtsPath   = (): string => path.join(getStoreDir(), "arts.json")
const getActivePath = (): string => path.join(getStoreDir(), "active.json")

export const getTxtPath = (filename: string): string =>
  path.join(getStoreDir(), `${filename}.txt`)

const ensureDir = (): void => {
  const dir = getStoreDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// ─── Sanitización de escapes ─────────────────────────────────────────────────
// OpenTUI renderiza el contenido de <text> literal — no interpreta \
// como secuencias de escape. Solo limpiamos \r para compatibilidad Windows.

export const sanitizeLines = (lines: string[]): string[] =>
  lines.map(line => line.replace(/\r/g, ""))

// ─── Lectura de .txt ─────────────────────────────────────────────────────────

/**
 * Lee el .txt por nombre (sin extensión) desde el storeDir.
 * Devuelve { lines, exists }.
 */
export const readTxt = (filename: string): { lines: string[]; exists: boolean } => {
  const p = getTxtPath(filename)
  if (!fs.existsSync(p)) return { lines: [], exists: false }
  try {
    const raw   = fs.readFileSync(p, "utf-8")
    const lines = raw.split("\n")
    if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop()
    return { lines: sanitizeLines(lines), exists: true }
  } catch {
    return { lines: [], exists: false }
  }
}

// ─── Arts CRUD ───────────────────────────────────────────────────────────────

export const genId = (): string => Date.now().toString(36)

export const getArts = (): AsciiArt[] => {
  try {
    const p = getArtsPath()
    if (!fs.existsSync(p)) return []
    return JSON.parse(fs.readFileSync(p, "utf-8")) as AsciiArt[]
  } catch {
    return []
  }
}

const setArts = (arts: AsciiArt[]): void => {
  ensureDir()
  fs.writeFileSync(getArtsPath(), JSON.stringify(arts, null, 2), "utf-8")
}

export const addArt = (art: Omit<AsciiArt, "id">): AsciiArt => {
  const newArt: AsciiArt = { id: genId(), ...art }
  setArts([...getArts(), newArt])
  return newArt
}

export const updateArt = (id: string, patch: Partial<Omit<AsciiArt, "id">>): void => {
  setArts(getArts().map(a => a.id === id ? { ...a, ...patch } : a))
}

export const deleteArt = (id: string): void => {
  setArts(getArts().filter(a => a.id !== id))
  if (getActiveId() === id) setActiveId(null)
}

// ─── Arte activo ──────────────────────────────────────────────────────────────

export const getActiveId = (): string | null => {
  try {
    const p = getActivePath()
    if (!fs.existsSync(p)) return null
    const data = JSON.parse(fs.readFileSync(p, "utf-8"))
    return typeof data?.id === "string" ? data.id : null
  } catch {
    return null
  }
}

export const setActiveId = (id: string | null): void => {
  ensureDir()
  fs.writeFileSync(getActivePath(), JSON.stringify({ id }, null, 2), "utf-8")
}

export const getActiveArt = (): AsciiArt | null => {
  const id = getActiveId()
  if (!id) return null
  return getArts().find(a => a.id === id) ?? null
}
